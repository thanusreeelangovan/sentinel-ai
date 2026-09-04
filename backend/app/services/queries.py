from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.explanation_reason.schemas import DetailedExplanation
from app.explanation_reason.services import generate_detailed_explanation_from_result
from app.models.risk_assessment import RiskAssessment
from app.models.rule_event import RuleEvent
from app.models.transaction import TransactionRecord
from app.schemas.evaluate import RiskBreakdown
from app.schemas.reads import (
    DashboardSummary,
    DecisionCounts,
    RiskDistribution,
    TransactionRead,
)


def _reason_codes(db: Session, transaction_id: str) -> list[str]:
    rows = db.scalars(
        select(RuleEvent.rule_code)
        .where(RuleEvent.transaction_id == transaction_id)
        .order_by(RuleEvent.created_at.asc())
    ).all()
    return list(rows)


def _reason_texts(db: Session, transaction_id: str) -> list[str]:
    rows = db.scalars(
        select(RuleEvent.reason)
        .where(RuleEvent.transaction_id == transaction_id)
        .order_by(RuleEvent.created_at.asc())
    ).all()
    return list(rows)


def _to_read(
    db: Session,
    transaction: TransactionRecord,
    assessment: RiskAssessment,
) -> TransactionRead:
    return TransactionRead(
        transaction_id=transaction.transaction_id,
        user_id=transaction.user_id,
        amount=float(transaction.amount),
        currency=transaction.currency,
        receiver_id=transaction.receiver_id,
        timestamp=transaction.timestamp,
        composite_score=float(assessment.composite_score),
        decision=assessment.decision,
        risk_breakdown=RiskBreakdown(
            anomaly=float(assessment.anomaly_score),
            velocity=float(assessment.velocity_score),
            receiver=float(assessment.receiver_score),
            behavioral=float(assessment.behavioral_score),
        ),
        reason_codes=_reason_codes(db, transaction.transaction_id),
    )


def list_transactions(db: Session) -> list[TransactionRead]:
    rows = db.execute(
        select(TransactionRecord, RiskAssessment)
        .join(
            RiskAssessment,
            RiskAssessment.transaction_id == TransactionRecord.transaction_id,
        )
        .order_by(TransactionRecord.created_at.desc())
    ).all()
    return [_to_read(db, transaction, assessment) for transaction, assessment in rows]


def get_transaction(db: Session, transaction_id: str) -> TransactionRead | None:
    row = db.execute(
        select(TransactionRecord, RiskAssessment)
        .join(
            RiskAssessment,
            RiskAssessment.transaction_id == TransactionRecord.transaction_id,
        )
        .where(TransactionRecord.transaction_id == transaction_id)
    ).first()
    if row is None:
        return None
    transaction, assessment = row
    return _to_read(db, transaction, assessment)


def _decision_counts(db: Session) -> dict[str, int]:
    rows = db.execute(
        select(RiskAssessment.decision, func.count())
        .group_by(RiskAssessment.decision)
    ).all()
    counts = {"APPROVE": 0, "VERIFY": 0, "BLOCK": 0}
    for decision, count in rows:
        if decision in counts:
            counts[decision] = int(count)
    return counts


def get_dashboard_summary(db: Session) -> DashboardSummary:
    counts = _decision_counts(db)
    total = db.scalar(select(func.count()).select_from(TransactionRecord)) or 0
    return DashboardSummary(
        total_transactions=int(total),
        decisions=DecisionCounts(**counts),
    )


def get_risk_distribution(db: Session) -> RiskDistribution:
    return RiskDistribution(**_decision_counts(db))


def get_risk_details(db: Session, transaction_id: str) -> DetailedExplanation | None:
    """Explain a persisted evaluation. Does not rerun scoring or decisioning."""
    result = get_transaction(db, transaction_id)
    if result is None:
        return None
    return generate_detailed_explanation_from_result(
        result,
        reason_texts=_reason_texts(db, transaction_id),
    )
