"""Account-scoped investigation evidence retrieval."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.evidence import (
    AccountCasesResponse,
    AccountDevicesResponse,
    AccountIpActivityResponse,
    AccountLoginsResponse,
    AccountTransactionsResponse,
)
from app.services import evidence as evidence_service

router = APIRouter(prefix="/accounts", tags=["Investigation Evidence"])


@router.get("/{account_id}/transactions", response_model=AccountTransactionsResponse)
def get_account_transactions(account_id: str, db: Session = Depends(get_db)) -> AccountTransactionsResponse:
    return evidence_service.get_account_transactions(db, account_id)


@router.get("/{account_id}/logins", response_model=AccountLoginsResponse)
def get_account_logins(account_id: str, db: Session = Depends(get_db)) -> AccountLoginsResponse:
    return evidence_service.get_account_logins(db, account_id)


@router.get("/{account_id}/devices", response_model=AccountDevicesResponse)
def get_account_devices(account_id: str, db: Session = Depends(get_db)) -> AccountDevicesResponse:
    return evidence_service.get_account_devices(db, account_id)


@router.get("/{account_id}/ip-activity", response_model=AccountIpActivityResponse)
def get_account_ip_activity(account_id: str, db: Session = Depends(get_db)) -> AccountIpActivityResponse:
    return evidence_service.get_account_ip_activity(db, account_id)


@router.get("/{account_id}/cases", response_model=AccountCasesResponse)
def get_account_cases(account_id: str, db: Session = Depends(get_db)) -> AccountCasesResponse:
    return evidence_service.get_account_cases(db, account_id)
