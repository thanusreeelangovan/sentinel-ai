import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    transaction_id: Mapped[str] = mapped_column(
        String, ForeignKey("transactions.transaction_id"), nullable=False
    )
    anomaly_score: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    velocity_score: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    receiver_score: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    behavioral_score: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    composite_score: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    decision: Mapped[str] = mapped_column(String, nullable=False)
    model_version: Mapped[str] = mapped_column(String, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
