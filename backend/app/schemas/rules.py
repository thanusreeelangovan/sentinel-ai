from pydantic import BaseModel, ConfigDict, Field


class RuleEngineResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    velocity_score: float = Field(ge=0, le=100)
    receiver_score: float = Field(ge=0, le=100)
    behavioral_score: float = Field(ge=0, le=100)
    rules_triggered: list[str]
    reason_codes: list[str]
