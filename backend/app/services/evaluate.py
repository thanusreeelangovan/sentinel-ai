from sqlalchemy.orm import Session

from app.ml.iforest import score_anomaly
from app.risk.decision import decide
from app.risk.engine import RiskSignals, calculate_risk
from app.rules.engine import evaluate_rules
from app.schemas.evaluate import EvaluateResponse
from app.schemas.transaction import Transaction
from app.services.persistence import persist_evaluation

HIGH_ANOMALY_THRESHOLD = 70.0


def evaluate_transaction(transaction: Transaction, db: Session) -> EvaluateResponse:
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
    response = EvaluateResponse(
        transaction_id=transaction.transaction_id,
        composite_score=risk.composite_score,
        decision=decide(risk.composite_score),
        risk_breakdown=risk.risk_breakdown,
        reason_codes=reason_codes,
    )
    persist_evaluation(db, transaction, rules, anomaly, response)
    db.commit()
    return response
