from pydantic import BaseModel, ConfigDict, Field

from app.risk.weights import (
    ANOMALY_WEIGHT,
    BEHAVIORAL_WEIGHT,
    RECEIVER_WEIGHT,
    VELOCITY_WEIGHT,
)
from app.schemas.evaluate import RiskBreakdown


class RiskSignals(BaseModel):
    model_config = ConfigDict(extra="forbid")

    anomaly: float = Field(ge=0, le=100)
    velocity: float = Field(ge=0, le=100)
    receiver: float = Field(ge=0, le=100)
    behavioral: float = Field(ge=0, le=100)


class RiskEngineResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    composite_score: float
    risk_breakdown: RiskBreakdown


def calculate_risk(signals: RiskSignals) -> RiskEngineResult:
    composite_score = (
        signals.anomaly * ANOMALY_WEIGHT
        + signals.velocity * VELOCITY_WEIGHT
        + signals.receiver * RECEIVER_WEIGHT
        + signals.behavioral * BEHAVIORAL_WEIGHT
    )
    return RiskEngineResult(
        composite_score=round(composite_score, 1),
        risk_breakdown=RiskBreakdown(
            anomaly=signals.anomaly,
            velocity=signals.velocity,
            receiver=signals.receiver,
            behavioral=signals.behavioral,
        ),
    )
