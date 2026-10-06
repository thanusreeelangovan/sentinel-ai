from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, JSON, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReceiverReport(Base):
    __tablename__ = "receiver_reports"

    report_id: Mapped[str] = mapped_column(String, primary_key=True)
    sender_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    receiver_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    transaction_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    risk_score: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    transaction_context: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
