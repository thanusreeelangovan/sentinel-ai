from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class RiskBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    anomaly: float
    velocity: float
    receiver: float
    behavioral: float


class EvaluationSignals(BaseModel):
    model_config = ConfigDict(extra="forbid")

    behavioral_cadence: str
    geo_hop_velocity: str
    device_trust: str
    typing_entropy: float
    gyro_tilt: float
    is_clipboard_paste: bool
    hardware_trust_score: float
    human_probability: float


class EvaluateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_id: str
    composite_score: float
    decision: Literal["APPROVE", "VERIFY", "BLOCK"]
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    risk_breakdown: RiskBreakdown
    reason_codes: list[str]
    explanation: str
    policy_applied: str
    model_version: str
    evaluated_at: str
    latency_ms: int
    signals: EvaluationSignals
    risk_score: Optional[float] = None
