"""Persist user reports of evaluated transactions without rescoring."""

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.schemas.report import TransactionReportResponse
from app.services.queries import get_transaction

REPORT_EVENT_TYPE = "REPORT"


def _existing_report(db: Session, transaction_id: str) -> AuditLog | None:
    return db.scalar(
        select(AuditLog)
        .where(
            AuditLog.transaction_id == transaction_id,
            AuditLog.event_type == REPORT_EVENT_TYPE,
        )
        .order_by(AuditLog.created_at.asc())
        .limit(1)
    )


def count_reports(db: Session, transaction_id: str) -> int:
    return int(
        db.scalar(
            select(func.count())
            .select_from(AuditLog)
            .where(
                AuditLog.transaction_id == transaction_id,
                AuditLog.event_type == REPORT_EVENT_TYPE,
            )
        )
        or 0
    )


def report_transaction(db: Session, transaction_id: str) -> TransactionReportResponse | None:
    record = get_transaction(db, transaction_id)
    if record is None:
        return None

    if _existing_report(db, transaction_id) is not None:
        return TransactionReportResponse(
            transaction_id=transaction_id,
            reported=True,
            message="Transaction was already reported.",
        )

    db.add(
        AuditLog(
            transaction_id=record.transaction_id,
            event_type=REPORT_EVENT_TYPE,
            decision=record.decision,
            risk_score=Decimal(str(record.composite_score)),
            details={
                "reported": True,
                "source": "user_report",
            },
        )
    )
    db.flush()
    return TransactionReportResponse(
        transaction_id=transaction_id,
        reported=True,
        message="Transaction reported successfully.",
    )
