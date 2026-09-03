from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class Location(BaseModel):
    model_config = ConfigDict(extra="forbid")

    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None


class UsualTransactionRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    min: Decimal
    max: Decimal


class UserContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_age_days: int
    previous_transaction_count: int
    usual_transaction_range: UsualTransactionRange


class Transaction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_id: str
    user_id: str
    amount: Decimal
    currency: str
    receiver_id: str
    receiver_type: str
    timestamp: datetime
    device_id: str
    device_type: str
    location: Optional[Location] = None
    ip_address: Optional[str] = None
    user_context: UserContext
