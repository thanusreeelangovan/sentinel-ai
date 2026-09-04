from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.explanation_reason.schemas import DetailedExplanation
from app.schemas.evaluate import EvaluateResponse
from app.schemas.reads import TransactionRead
from app.schemas.transaction import Transaction
from app.services.evaluate import evaluate_transaction
from app.services.queries import get_risk_details, get_transaction, list_transactions

router = APIRouter()


@router.post("/evaluate", response_model=EvaluateResponse)
@router.post("/transactions/evaluate", response_model=EvaluateResponse)
def post_evaluate_transaction(
    transaction: Transaction,
    db: Session = Depends(get_db),
) -> EvaluateResponse:
    return evaluate_transaction(transaction, db)


@router.get("/transactions", response_model=list[TransactionRead])
def get_transactions(db: Session = Depends(get_db)) -> list[TransactionRead]:
    return list_transactions(db)


@router.get(
    "/transactions/{transaction_id}/risk-details",
    response_model=DetailedExplanation,
)
def get_transaction_risk_details(
    transaction_id: str,
    db: Session = Depends(get_db),
) -> DetailedExplanation:
    details = get_risk_details(db, transaction_id)
    if details is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )
    return details


@router.get("/transactions/{transaction_id}", response_model=TransactionRead)
def get_transaction_by_id(
    transaction_id: str,
    db: Session = Depends(get_db),
) -> TransactionRead:
    transaction = get_transaction(db, transaction_id)
    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found",
        )
    return transaction
