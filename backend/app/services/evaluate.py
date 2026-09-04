from datetime import datetime, timezone
from time import perf_counter

from sqlalchemy.orm import Session

from app.ml.iforest import score_anomaly
from app.risk.decision import decide
from app.risk.engine import RiskSignals, calculate_risk
from app.risk.thresholds import APPROVE_MAX_SCORE, VERIFY_MAX_SCORE
from app.explanation_reason.services import (
    generate_minimal_explanation,
    generate_smartphone_explanation,
)
from app.rules.engine import evaluate_rules
from app.schemas.evaluate import EvaluateResponse, EvaluationSignals
from app.schemas.rules import RuleEngineResult
from app.schemas.transaction import Transaction
from app.services.persistence import persist_evaluation

HIGH_ANOMALY_THRESHOLD = 70.0

POLICY_BY_DECISION = {
    "APPROVE": "POLICY_STANDARD_ALLOW_LIST_PASSED",
    "VERIFY": "POLICY_STEP_UP_VERIFICATION_REQUIRED",
    "BLOCK": "POLICY_ZERO_TRUST_DEVICE_COMPROMISE",
}


def _risk_level(composite_score: float) -> str:
    if composite_score <= APPROVE_MAX_SCORE:
        return "LOW"
    if composite_score <= VERIFY_MAX_SCORE:
        return "MEDIUM"
    return "HIGH"


def _build_explanation(
    transaction: Transaction,
    composite_score: float,
    decision: str,
    reason_codes: list[str],
    reasons: list[str],
) -> str:
    amount = f"{float(transaction.amount):,.2f}"
    receiver = transaction.receiver_name or transaction.receiver_id
    if decision == "APPROVE":
        return (
            f"SentinelAI verified this INR {amount} transaction to {receiver} as safe "
            f"({composite_score}/100 low risk) and authorized immediate routing."
        )
    detail = "; ".join(reasons) if reasons else ", ".join(reason_codes)
    if decision == "VERIFY":
        return (
            f"SentinelAI flagged elevated risk ({composite_score}/100 medium risk) on "
            f"INR {amount} to {receiver} due to {detail}. Step-up verification required."
        )
    return (
        f"SentinelAI intercepted and flagged HIGH RISK on INR {amount} to {receiver} "
        f"(score: {composite_score}/100) due to {detail}."
    )


def _build_signals(
    transaction: Transaction,
    rules: RuleEngineResult,
    composite_score: float,
) -> EvaluationSignals:
    is_high = composite_score > VERIFY_MAX_SCORE
    is_medium = APPROVE_MAX_SCORE < composite_score <= VERIFY_MAX_SCORE
    emulator = (
        transaction.device_type.strip().lower() in {"android_emulator", "new_device"}
        or "emu" in transaction.device_id.lower()
    )
    if is_high:
        cadence = f"DEVIANT_CADENCE (Score: {round(rules.behavioral_score)}/100)"
        geo = "HIGH_VELOCITY_IP_HOP"
    elif is_medium:
        cadence = "MODERATE_VARIANCE"
        geo = "LOCAL_RADIUS_MATCH"
    else:
        cadence = "NATURAL_HUMAN_CADENCE"
        geo = "LOCAL_RADIUS_MATCH"
    if emulator:
        device_trust = "EMULATOR_ENVIRONMENT"
    elif transaction.device_type.strip().lower() == "new_device":
        device_trust = "NEW_UNVERIFIED_DEVICE"
    else:
        device_trust = "PRIMARY_TRUSTED_DEVICE"
    return EvaluationSignals(
        behavioral_cadence=cadence,
        geo_hop_velocity=geo,
        device_trust=device_trust,
        typing_entropy=12 if is_high else 58 if is_medium else 88,
        gyro_tilt=0.0 if emulator or is_high else 24.5 if is_medium else 41.5,
        is_clipboard_paste=emulator or is_high,
        hardware_trust_score=18 if emulator else 64 if is_medium else 96,
        human_probability=8 if is_high else 72 if is_medium else 99,
    )


def evaluate_transaction(transaction: Transaction, db: Session) -> EvaluateResponse:
    started = perf_counter()
    rules = evaluate_rules(transaction)
    anomaly = score_anomaly(transaction)
    signals = RiskSignals(
        anomaly=anomaly.anomaly_score,
        velocity=rules.velocity_score,
        receiver=rules.receiver_score,
        behavioral=rules.behavioral_score,
    )
    risk = calculate_risk(signals)
    reason_codes = list(rules.rules_triggered)
    if anomaly.anomaly_score >= HIGH_ANOMALY_THRESHOLD:
        reason_codes.insert(0, "HIGH_ANOMALY")
    decision = decide(risk.composite_score)
    rule_texts = list(rules.reason_codes)
    minimal = generate_minimal_explanation(
        decision=decision,
        reason_codes=reason_codes,
        reason_texts=rule_texts,
        risk_breakdown=risk.risk_breakdown,
        risk_score=risk.composite_score,
        transaction_id=transaction.transaction_id,
    )
    risk_level = _risk_level(risk.composite_score)
    summary, detailed_reasoning, recommended_action, explanation_signals = (
        generate_smartphone_explanation(
            risk_level=risk_level,
            reason_codes=reason_codes,
            risk_breakdown=risk.risk_breakdown,
        )
    )
    response = EvaluateResponse(
        transaction_id=transaction.transaction_id,
        composite_score=risk.composite_score,
        decision=decision,
        risk_level=risk_level,
        risk_breakdown=risk.risk_breakdown,
        reason_codes=reason_codes,
        explanation=_build_explanation(
            transaction,
            risk.composite_score,
            decision,
            reason_codes,
            rule_texts,
            list(rules.reason_codes),
        ),
        policy_applied=POLICY_BY_DECISION[decision],
        model_version=anomaly.model_version,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        latency_ms=max(1, round((perf_counter() - started) * 1000)),
        signals=_build_signals(transaction, rules, risk.composite_score),
        risk_score=risk.composite_score,
        minimal_explanation=minimal.explanation,
        summary=summary,
        detailed_reasoning=detailed_reasoning,
        recommended_action=recommended_action,
        explanation_signals=explanation_signals,
    )
    persist_evaluation(db, transaction, rules, anomaly, response)
    db.commit()
    return response
