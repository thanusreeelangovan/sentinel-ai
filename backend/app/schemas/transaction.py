"""Transaction and ML Payload Validation Schemas.

Strictly adheres to the Sentinel AI Technical Contract and Blueprint specifications.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReceiverType(str, Enum):
    MERCHANT = "merchant"
    USER = "user"
    BANK_ACCOUNT = "bank_account"


class DeviceType(str, Enum):
    ANDROID = "android"
    IOS = "ios"
    WEB = "web"
    OTHER = "other"


class LocationSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Approximate latitude")
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Approximate longitude")


class UsualTransactionRangeSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    min: float = Field(..., ge=0.0, description="Minimum historical amount")
    max: float = Field(..., ge=0.0, description="Maximum historical amount")

    @field_validator("max")
    @classmethod
    def validate_range(cls, v: float, info) -> float:
        min_val = info.data.get("min")
        if min_val is not None and v < min_val:
            raise ValueError("max transaction range must be greater than or equal to min")
        return v


class UserContextSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    account_age_days: int = Field(..., ge=0, description="Account age in days")
    previous_transaction_count: int = Field(..., ge=0, description="Historical transaction count")
    usual_transaction_range: UsualTransactionRangeSchema = Field(..., description="User's historical amount range")


class TransactionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    transaction_id: str = Field(..., min_length=1, max_length=64, description="Unique transaction ID")
    user_id: str = Field(..., min_length=1, max_length=64, description="Sender user ID")
    amount: float = Field(..., gt=0.0, description="Transaction amount")
    currency: str = Field(default="INR", min_length=3, max_length=3, description="ISO Currency code")
    receiver_id: str = Field(..., min_length=1, max_length=64, description="Receiver ID")
    receiver_type: ReceiverType = Field(..., description="Type of receiver entity")
    timestamp: datetime = Field(..., description="ISO 8601 transaction timestamp")
    device_id: str = Field(..., min_length=1, max_length=64, description="Originating device identifier")
    device_type: DeviceType = Field(..., description="Client device platform")
    location: Optional[LocationSchema] = Field(default=None, description="Optional geocoordinates")
    ip_address: Optional[str] = Field(default=None, max_length=45, description="Source IP address")
    user_context: UserContextSchema = Field(..., description="Historical baseline for user")


class AnomalyModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    anomaly_score: float = Field(..., ge=0.0, le=100.0, description="Calibrated score from 0 to 100")
    model_version: str = Field(..., description="Model identifier version string")
    model_status: str = Field(default="success", description="Inference execution status")


if __name__ == "__main__":
    import pytest

    def test_valid_transaction_payload() -> None:
        payload = {
            "transaction_id": "TXN_000001",
            "user_id": "USR_001",
            "amount": 2500.00,
            "currency": "INR",
            "receiver_id": "REC_045",
            "receiver_type": "merchant",
            "timestamp": "2026-09-03T10:15:30+05:30",
            "device_id": "DEV_019",
            "device_type": "android",
            "location": {"latitude": 12.9716, "longitude": 77.5946},
            "ip_address": "192.168.1.10",
            "user_context": {
                "account_age_days": 420,
                "previous_transaction_count": 157,
                "usual_transaction_range": {"min": 100.0, "max": 5000.0},
            },
        }
        txn = TransactionSchema.model_validate(payload)
        assert txn.transaction_id == "TXN_000001"
        assert txn.amount == 2500.00
        assert txn.receiver_type == ReceiverType.MERCHANT

    def test_invalid_range_raises() -> None:
        with pytest.raises(ValueError):
            UsualTransactionRangeSchema(min=5000.0, max=100.0)

    def test_model_output_bounds() -> None:
        out = AnomalyModelOutput(anomaly_score=82.5, model_version="iforest_v1")
        assert 0.0 <= out.anomaly_score <= 100.0

    test_valid_transaction_payload()
    test_invalid_range_raises()
    test_model_output_bounds()
    print("All Transaction schema assertions passed.")

