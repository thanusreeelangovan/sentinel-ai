from pydantic import BaseModel, ConfigDict, Field


class AnomalyResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    anomaly_score: float = Field(ge=0, le=100)
    model_version: str
    model_status: str
