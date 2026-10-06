"""Persist high-risk receiver fraud reports without rescoring."""

from decimal import Decimal
from typing import Any, Mapping, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.receiver_report import ReceiverReport
from app.services.queries import get_transaction

RECEIVER_REPORT_EVENT = "RECEIVER_REPORT"


def get_sender_report(db: Session, sender_id: str) -> ReceiverReport | None:
    return db.scalar(
        select(ReceiverReport)
        .where(ReceiverReport.sender_id == sender_id)
        .limit(1)
    )


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
    """Persist the submitted evidence, whether or not the evaluation is in this DB."""

    db.add(
        ReceiverReport(
            report_id=report_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            transaction_id=transaction_id,
            risk_score=Decimal(str(risk_score)),
            transaction_context=dict(transaction_context),
        )
    )

    record = get_transaction(db, transaction_id) if transaction_id else None
    if record is not None:
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
