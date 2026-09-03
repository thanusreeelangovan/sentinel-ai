"""Device activity events used as investigation evidence."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DeviceEvent(Base):
    __tablename__ = "device_events"
    __table_args__ = (
        Index("ix_device_events_account_id", "account_id"),
        Index("ix_device_events_device_id", "device_id"),
    )

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    device_id: Mapped[str] = mapped_column(String(64), nullable=False)
    account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    activity: Mapped[str] = mapped_column(String(128), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    extra_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)
