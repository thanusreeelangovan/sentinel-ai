import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BlockedReceiver(Base):
    __tablename__ = "blocked_receivers"
    __table_args__ = (
        UniqueConstraint("sender_id", "receiver_id", name="uq_blocked_receiver_sender_receiver"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sender_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    receiver_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    receiver_name: Mapped[str | None] = mapped_column(String, nullable=True)
    blocked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
