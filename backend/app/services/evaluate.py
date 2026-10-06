from datetime import datetime, timezone
from time import perf_counter

from sqlalchemy.orm import Session

from app.ml.iforest import get_iforest_service, score_anomaly
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
    "BLOCK": "POLICY_HIGH_RISK_RECOMMENDATION_BLOCK",
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
            f"SentinelAI recommends APPROVE for this INR {amount} transaction to {receiver} "
            f"({composite_score}/100 low risk)."
        )
    detail = "; ".join(reasons) if reasons else ", ".join(reason_codes)
    if decision == "VERIFY":
        return (
            f"SentinelAI flagged elevated risk ({composite_score}/100 medium risk) on "
            f"INR {amount} to {receiver} due to {detail}. Step-up verification required."
        )
    return (
        f"SentinelAI intercepted this HIGH RISK transaction and recommends stopping it: "
        f"INR {amount} to {receiver} (score: {composite_score}/100) due to {detail}. "
        "An explicit user override requires step-up verification in the prototype."
    )


def _build_signals(
    transaction: Transaction,
    rules: RuleEngineResult,
    composite_score: float,
) -> EvaluationSignals:
    emulator = (
        transaction.device_type.strip().lower() in {"android_emulator", "new_device"}
        or "emu" in transaction.device_id.lower()
    )
    cadence = (
        "RULE_SCORE_ELEVATED"
        if rules.behavioral_score > 40
        else "RULE_SCORE_NOT_ELEVATED"
    )
    if emulator:
        device_trust = "SUBMITTED_EMULATOR_TYPE"
    elif transaction.device_type.strip().lower() == "new_device":
        device_trust = "SUBMITTED_NEW_DEVICE_TYPE"
    else:
        device_trust = "DEVICE_TYPE_UNVERIFIED"
    return EvaluationSignals(
        behavioral_cadence=cadence,
        geo_hop_velocity="NOT_COLLECTED",
        device_trust=device_trust,
        typing_entropy=0,
        gyro_tilt=0,
        is_clipboard_paste=False,
        hardware_trust_score=0,
        human_probability=0,
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
    model_explanation_method, model_feature_contributions = (
        get_iforest_service().explain_features(transaction)
    )
    model_explanation = get_iforest_service().explain_features(transaction)
    explanation = generate_smartphone_explanation(
        risk_level=risk_level,
        reason_codes=reason_codes,
        risk_breakdown=risk.risk_breakdown,
        risk_score=risk.composite_score,
        shap_features=model_feature_contributions,
        shap_features=list(model_explanation["features"]),
    )
    response = EvaluateResponse(
        transaction_id=transaction.transaction_id,
        composite_score=risk.composite_score,
        decision=decision,
        risk_level=risk_level,
        risk_breakdown=risk.risk_breakdown,
        reason_codes=reason_codes,
        explanation=explanation,
        policy_applied=POLICY_BY_DECISION[decision],
        model_version=anomaly.model_version,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        latency_ms=max(1, round((perf_counter() - started) * 1000)),
        signals=_build_signals(transaction, rules, risk.composite_score),
        model_explanation_method=model_explanation_method,
        model_feature_contributions=model_feature_contributions,
        risk_score=risk.composite_score,
        minimal_explanation=minimal.explanation,
        model_explanation_method=str(model_explanation["method"]),
        model_explanation_features=list(model_explanation["features"]),
    )
    persist_evaluation(db, transaction, rules, anomaly, response)
    db.commit()
    return response
