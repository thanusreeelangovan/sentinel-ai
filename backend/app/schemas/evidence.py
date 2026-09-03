"""Response schemas for investigation evidence retrieval."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class TransactionHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: str
    sender_account: str
    receiver_account: str
    amount: float
    currency: str
    timestamp: datetime
    status: str
    receiver_type: Optional[str] = None
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class LoginActivityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    login_event_id: str
    account_id: str
    timestamp: datetime
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    success: bool
    metadata: Optional[dict[str, Any]] = None


class DeviceActivityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    device_id: str
    account_id: str
    timestamp: datetime
    activity: str
    ip_address: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class IpNetworkActivityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    ip_address: str
    account_id: str
    timestamp: datetime
    activity: str
    device_id: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class CaseHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    account_id: str
    status: str
    created_at: datetime
    closed_at: Optional[datetime] = None
    outcome: Optional[str] = None


class AccountTransactionsResponse(BaseModel):
    account_id: str
    transactions: list[TransactionHistoryItem]


class AccountLoginsResponse(BaseModel):
    account_id: str
    logins: list[LoginActivityItem]


class AccountDevicesResponse(BaseModel):
    account_id: str
    devices: list[DeviceActivityItem]


class AccountIpActivityResponse(BaseModel):
    account_id: str
    ip_activity: list[IpNetworkActivityItem]


class AccountCasesResponse(BaseModel):
    account_id: str
    cases: list[CaseHistoryItem]


class DeviceAccountsResponse(BaseModel):
    device_id: str
    account_ids: list[str] = Field(default_factory=list)


class IpAccountsResponse(BaseModel):
    ip_address: str
    account_ids: list[str] = Field(default_factory=list)
