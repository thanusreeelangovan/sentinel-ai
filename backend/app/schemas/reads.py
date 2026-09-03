from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.evaluate import RiskBreakdown


class TransactionRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_id: str
    user_id: str
    amount: float
    currency: str
    receiver_id: str
    timestamp: datetime
    composite_score: float
    decision: Literal["APPROVE", "VERIFY", "BLOCK"]
    risk_breakdown: RiskBreakdown
    reason_codes: list[str]


class DecisionCounts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    APPROVE: int
    VERIFY: int
    BLOCK: int


class DashboardSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_transactions: int
    decisions: DecisionCounts


class RiskDistribution(BaseModel):
    model_config = ConfigDict(extra="forbid")

    APPROVE: int
    VERIFY: int
    BLOCK: int
