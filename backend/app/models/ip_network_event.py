"""IP / network activity events used as investigation evidence."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IpNetworkEvent(Base):
    __tablename__ = "ip_network_events"
    __table_args__ = (
        Index("ix_ip_network_events_account_id", "account_id"),
        Index("ix_ip_network_events_ip_address", "ip_address"),
        Index("ix_ip_network_events_device_id", "device_id"),
    )

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    activity: Mapped[str] = mapped_column(String(128), nullable=False)
    device_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    extra_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column("metadata", JSON, nullable=True)
