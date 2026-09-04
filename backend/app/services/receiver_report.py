"""Persist high-risk receiver fraud reports without rescoring."""

from decimal import Decimal
from typing import Any, Mapping, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.services.queries import get_transaction

RECEIVER_REPORT_EVENT = "RECEIVER_REPORT"


def sender_has_reported(db: Session, sender_id: str) -> bool:
    rows = db.scalars(
        select(AuditLog).where(AuditLog.event_type == RECEIVER_REPORT_EVENT)
    ).all()
    return any(row.details.get("sender_id") == sender_id for row in rows)


def persist_receiver_report(
    db: Session,
    *,
    transaction_id: Optional[str],
    sender_id: str,
    receiver_id: str,
    risk_score: float,
    report_id: str,
    transaction_context: Mapping[str, Any],
) -> None:
    """Write a RECEIVER_REPORT audit row when the transaction already exists.

    Missing transactions are ignored so the /reports API never 404s.
    Does not change classification or scores.
    """

    if not transaction_id:
        return
    record = get_transaction(db, transaction_id)
    if record is None:
        return

    db.add(
        AuditLog(
            transaction_id=record.transaction_id,
            event_type=RECEIVER_REPORT_EVENT,
            decision=record.decision,
            risk_score=Decimal(str(record.composite_score)),
            details={
                "reported": True,
                "source": "receiver_fraud_report",
                "report_id": report_id,
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "submitted_risk_score": risk_score,
                "transaction_context": dict(transaction_context),
            },
        )
    )
    db.flush()
