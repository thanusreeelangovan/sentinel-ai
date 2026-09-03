from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.schemas import AnomalyResult
from app.models.audit_log import AuditLog
from app.models.risk_assessment import RiskAssessment
from app.models.rule_event import RuleEvent
from app.models.transaction import TransactionRecord
from app.models.user import User
from app.schemas.evaluate import EvaluateResponse
from app.schemas.rules import RuleEngineResult
from app.schemas.transaction import Transaction

RULE_SCORE_FIELDS = {
    "HIGH_TRANSACTION_VELOCITY": "velocity",
    "NEW_RECEIVER": "receiver",
    "UNKNOWN_RECEIVER_TYPE": "receiver",
    "UNUSUAL_AMOUNT": "behavioral",
    "NEW_DEVICE": "behavioral",
    "NEW_LOCATION": "behavioral",
    "UNUSUAL_HOUR": "behavioral",
    "HIGH_ANOMALY": "anomaly",
}


def persist_evaluation(
    db: Session,
    transaction: Transaction,
    rules: RuleEngineResult,
    anomaly: AnomalyResult,
    response: EvaluateResponse,
) -> None:
    existing_user = db.scalar(select(User).where(User.user_id == transaction.user_id))
    if existing_user is None:
        db.add(
            User(
                user_id=transaction.user_id,
                account_age_days=transaction.user_context.account_age_days,
            )
        )
    else:
        existing_user.account_age_days = transaction.user_context.account_age_days
    db.flush()

    latitude = None
    longitude = None
    if transaction.location is not None:
        latitude = transaction.location.latitude
        longitude = transaction.location.longitude

    db.add(
        TransactionRecord(
            transaction_id=transaction.transaction_id,
            user_id=transaction.user_id,
            amount=transaction.amount,
            currency=transaction.currency,
            receiver_id=transaction.receiver_id,
            receiver_type=transaction.receiver_type,
            timestamp=transaction.timestamp,
            device_id=transaction.device_id,
            device_type=transaction.device_type,
            latitude=latitude,
            longitude=longitude,
            ip_address=transaction.ip_address,
        )
    )
    db.flush()

    breakdown = response.risk_breakdown
    db.add(
        RiskAssessment(
            transaction_id=transaction.transaction_id,
            anomaly_score=Decimal(str(breakdown.anomaly)),
            velocity_score=Decimal(str(breakdown.velocity)),
            receiver_score=Decimal(str(breakdown.receiver)),
            behavioral_score=Decimal(str(breakdown.behavioral)),
            composite_score=Decimal(str(response.composite_score)),
            decision=response.decision,
            model_version=anomaly.model_version,
        )
    )

    reasons_by_code = dict(zip(rules.rules_triggered, rules.reason_codes))
    reasons_by_code.setdefault("HIGH_ANOMALY", "Anomaly score exceeded the high-risk threshold")
    for rule_code in response.reason_codes:
        score_field = RULE_SCORE_FIELDS.get(rule_code, "composite")
        score = getattr(breakdown, score_field, response.composite_score)
        db.add(
            RuleEvent(
                transaction_id=transaction.transaction_id,
                rule_code=rule_code,
                rule_name=rule_code,
                score=Decimal(str(score)),
                reason=reasons_by_code.get(rule_code, rule_code),
            )
        )

    db.add(
        AuditLog(
            transaction_id=transaction.transaction_id,
            event_type="EVALUATION",
            decision=response.decision,
            risk_score=Decimal(str(response.composite_score)),
            details={
                "reason_codes": response.reason_codes,
                "risk_breakdown": breakdown.model_dump(),
                "model_version": anomaly.model_version,
            },
        )
    )
