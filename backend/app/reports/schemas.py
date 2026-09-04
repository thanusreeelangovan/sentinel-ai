from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class TransactionContext(BaseModel):
    model_config = ConfigDict(extra="allow")

    transaction_id: Optional[str] = Field(None, description="Unique transaction ID if initiated")
    amount: Optional[float] = Field(None, description="Transaction amount in INR")
    currency: Optional[str] = Field("INR", description="Currency code")
    device_id: Optional[str] = Field(None, description="Initiating device ID")
    note: Optional[str] = Field(None, description="Transaction memo or note")


class CreateReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sender_id: str = Field(..., description="ID of the sender initiating the report", min_length=1)
    receiver_id: str = Field(..., description="VPA or account ID of the reported receiver", min_length=1)
    transaction_context: Dict[str, Any] = Field(..., description="Contextual transaction metadata")
    timestamp: datetime = Field(..., description="Timestamp when the event occurred")
    risk_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Composite anomaly risk score (0.0 - 100.0) evaluated by the engine"
    )


class ReportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str
    status: str
    message: str
    submitted_at: datetime
    sender_id: str
    receiver_id: str
    risk_score: float
