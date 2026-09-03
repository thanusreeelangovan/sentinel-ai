from app.ml.iforest import score_anomaly
from app.risk.engine import RiskSignals
from app.rules.engine import evaluate_rules
from app.schemas.transaction import Transaction


def get_anomaly_score(transaction: Transaction) -> float:
    return score_anomaly(transaction).anomaly_score


def get_rule_scores(transaction: Transaction) -> dict[str, float]:
    rules = evaluate_rules(transaction)
    return {
        "velocity": rules.velocity_score,
        "receiver": rules.receiver_score,
        "behavioral": rules.behavioral_score,
    }


def get_risk_signals(transaction: Transaction) -> RiskSignals:
    rules = evaluate_rules(transaction)
    return RiskSignals(
        anomaly=get_anomaly_score(transaction),
        velocity=rules.velocity_score,
        receiver=rules.receiver_score,
        behavioral=rules.behavioral_score,
    )
