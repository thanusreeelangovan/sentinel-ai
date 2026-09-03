"""Retrieval helpers for investigation evidence sources."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.device_event import DeviceEvent
from app.models.investigation_case import InvestigationCase
from app.models.ip_network_event import IpNetworkEvent
from app.models.login_event import LoginEvent
from app.models.transaction import TransactionRecord
from app.schemas.evidence import (
    AccountCasesResponse,
    AccountDevicesResponse,
    AccountIpActivityResponse,
    AccountLoginsResponse,
    AccountTransactionsResponse,
    CaseHistoryItem,
    DeviceAccountsResponse,
    DeviceActivityItem,
    IpAccountsResponse,
    IpNetworkActivityItem,
    LoginActivityItem,
    TransactionHistoryItem,
)


def get_account_transactions(db: Session, account_id: str) -> AccountTransactionsResponse:
    rows = db.scalars(
        select(TransactionRecord)
        .where(TransactionRecord.user_id == account_id)
        .order_by(TransactionRecord.timestamp.desc())
    ).all()
    items = []
    for row in rows:
        metadata = None
        if row.latitude is not None or row.longitude is not None:
            metadata = {
                "latitude": float(row.latitude) if row.latitude is not None else None,
                "longitude": float(row.longitude) if row.longitude is not None else None,
            }
        items.append(
            TransactionHistoryItem(
                transaction_id=row.transaction_id,
                sender_account=row.user_id,
                receiver_account=row.receiver_id,
                amount=float(row.amount),
                currency=row.currency,
                timestamp=row.timestamp,
                status="recorded",
                receiver_type=row.receiver_type,
                device_id=row.device_id,
                ip_address=row.ip_address,
                metadata=metadata,
            )
        )
    return AccountTransactionsResponse(account_id=account_id, transactions=items)


def get_account_logins(db: Session, account_id: str) -> AccountLoginsResponse:
    rows = db.scalars(
        select(LoginEvent)
        .where(LoginEvent.account_id == account_id)
        .order_by(LoginEvent.timestamp.desc())
    ).all()
    items = [
        LoginActivityItem(
            login_event_id=row.login_event_id,
            account_id=row.account_id,
            timestamp=row.timestamp,
            ip_address=row.ip_address,
            device_id=row.device_id,
            success=row.success,
            metadata=row.extra_metadata,
        )
        for row in rows
    ]
    return AccountLoginsResponse(account_id=account_id, logins=items)


def get_account_devices(db: Session, account_id: str) -> AccountDevicesResponse:
    rows = db.scalars(
        select(DeviceEvent)
        .where(DeviceEvent.account_id == account_id)
        .order_by(DeviceEvent.timestamp.desc())
    ).all()
    items = [
        DeviceActivityItem(
            event_id=row.event_id,
            device_id=row.device_id,
            account_id=row.account_id,
            timestamp=row.timestamp,
            activity=row.activity,
            ip_address=row.ip_address,
            metadata=row.extra_metadata,
        )
        for row in rows
    ]
    return AccountDevicesResponse(account_id=account_id, devices=items)


def get_account_ip_activity(db: Session, account_id: str) -> AccountIpActivityResponse:
    rows = db.scalars(
        select(IpNetworkEvent)
        .where(IpNetworkEvent.account_id == account_id)
        .order_by(IpNetworkEvent.timestamp.desc())
    ).all()
    items = [
        IpNetworkActivityItem(
            event_id=row.event_id,
            ip_address=row.ip_address,
            account_id=row.account_id,
            timestamp=row.timestamp,
            activity=row.activity,
            device_id=row.device_id,
            metadata=row.extra_metadata,
        )
        for row in rows
    ]
    return AccountIpActivityResponse(account_id=account_id, ip_activity=items)


def get_account_cases(db: Session, account_id: str) -> AccountCasesResponse:
    rows = db.scalars(
        select(InvestigationCase)
        .where(InvestigationCase.account_id == account_id)
        .order_by(InvestigationCase.created_at.desc())
    ).all()
    items = [
        CaseHistoryItem(
            case_id=row.case_id,
            account_id=row.account_id,
            status=row.status,
            created_at=row.created_at,
            closed_at=row.closed_at,
            outcome=row.outcome,
        )
        for row in rows
    ]
    return AccountCasesResponse(account_id=account_id, cases=items)


def get_accounts_for_device(db: Session, device_id: str) -> DeviceAccountsResponse:
    rows = db.scalars(
        select(DeviceEvent.account_id).where(DeviceEvent.device_id == device_id).distinct()
    ).all()
    return DeviceAccountsResponse(device_id=device_id, account_ids=sorted(rows))


def get_accounts_for_ip(db: Session, ip_address: str) -> IpAccountsResponse:
    rows = db.scalars(
        select(IpNetworkEvent.account_id).where(IpNetworkEvent.ip_address == ip_address).distinct()
    ).all()
    return IpAccountsResponse(ip_address=ip_address, account_ids=sorted(rows))
