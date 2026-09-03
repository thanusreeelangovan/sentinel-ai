"""Login events used as investigation evidence."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LoginEvent(Base):
    __tablename__ = "login_events"
    __table_args__ = (
        Index("ix_login_events_account_id", "account_id"),
        Index("ix_login_events_device_id", "device_id"),
        Index("ix_login_events_ip_address", "ip_address"),
    )

    login_event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    extra_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)
