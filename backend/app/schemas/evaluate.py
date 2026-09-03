from typing import Literal

from pydantic import BaseModel, ConfigDict


class RiskBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    anomaly: float
    velocity: float
    receiver: float
    behavioral: float


class EvaluateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_id: str
    composite_score: float
    decision: Literal["APPROVE", "VERIFY", "BLOCK"]
    risk_breakdown: RiskBreakdown
    reason_codes: list[str]
