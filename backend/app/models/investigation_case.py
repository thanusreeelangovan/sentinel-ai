"""Investigation cases used as historical case evidence."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InvestigationCase(Base):
    __tablename__ = "investigation_cases"
    __table_args__ = (Index("ix_investigation_cases_account_id", "account_id"),)

    case_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
