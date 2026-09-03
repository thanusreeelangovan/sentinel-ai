"""Reverse lookups from device and IP to associated accounts."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.evidence import DeviceAccountsResponse, IpAccountsResponse
from app.services import evidence as evidence_service

router = APIRouter(tags=["Investigation Evidence"])


@router.get("/devices/{device_id}/accounts", response_model=DeviceAccountsResponse)
def get_device_accounts(device_id: str, db: Session = Depends(get_db)) -> DeviceAccountsResponse:
    return evidence_service.get_accounts_for_device(db, device_id)


@router.get("/ip-activity/{ip_address}/accounts", response_model=IpAccountsResponse)
def get_ip_accounts(ip_address: str, db: Session = Depends(get_db)) -> IpAccountsResponse:
    return evidence_service.get_accounts_for_ip(db, ip_address)
