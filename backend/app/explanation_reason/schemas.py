"""Pydantic schemas for transaction risk explanations."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.evaluate import RiskBreakdown

EngineDecision = Literal["APPROVE", "VERIFY", "BLOCK"]
ExplanationDecision = Literal["APPROVE", "MEDIUM_RISK", "HIGH_RISK"]


class ShapFeatureContribution(BaseModel):
    """A single SHAP feature contribution from the existing model, when available."""

    model_config = ConfigDict(extra="forbid")

    feature: str
    contribution: float


class RiskFactor(BaseModel):
    """One detected risk signal, with a human-readable description."""

    model_config = ConfigDict(extra="forbid")

    feature: str
    description: str
    impact: Optional[float] = None


class MinimalExplanation(BaseModel):
    """Short explanation shown immediately in the risk popup."""

    model_config = ConfigDict(extra="forbid")

    transaction_id: Optional[str] = None
    decision: ExplanationDecision
    explanation: Optional[str] = None


class DetailedExplanation(BaseModel):
    """Full explanation returned when the user requests more detail."""

    model_config = ConfigDict(extra="forbid")

    transaction_id: str
    decision: ExplanationDecision
    engine_decision: Optional[EngineDecision] = None
    risk_score: float
    summary: str
    factors: list[RiskFactor] = Field(default_factory=list)
    shap_features: Optional[list[ShapFeatureContribution]] = None
    risk_breakdown: Optional[RiskBreakdown] = None
