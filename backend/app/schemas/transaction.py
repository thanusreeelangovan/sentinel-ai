from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class Location(BaseModel):
    model_config = ConfigDict(extra="ignore")

    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    city: Optional[str] = None
    country: Optional[str] = None


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
    model_config = ConfigDict(extra="ignore")

    transaction_id: str
    user_id: str
    amount: Decimal
    currency: str
    receiver_id: str
    receiver_name: Optional[str] = None
    receiver_type: str
    timestamp: datetime
    device_id: str
    device_type: str
    device_name: Optional[str] = None
    location: Optional[Location] = None
    ip_address: Optional[str] = None
    user_context: UserContext
    note: Optional[str] = None
