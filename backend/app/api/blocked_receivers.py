from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.blocked_receiver import BlockedReceiver
from app.schemas.blocked_receiver import BlockReceiverRequest, BlockedReceiverResponse

router = APIRouter(prefix="/blocked-receivers", tags=["Blocked Receivers"])


@router.get("", response_model=list[BlockedReceiverResponse])
def list_blocked_receivers(
    sender_id: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> list[BlockedReceiver]:
    return list(
        db.scalars(
            select(BlockedReceiver)
            .where(BlockedReceiver.sender_id == sender_id)
            .order_by(BlockedReceiver.blocked_at.desc())
        ).all()
    )


@router.post("", response_model=BlockedReceiverResponse, status_code=status.HTTP_201_CREATED)
def block_receiver(
    payload: BlockReceiverRequest,
    db: Session = Depends(get_db),
) -> BlockedReceiver:
    existing = db.scalar(
        select(BlockedReceiver).where(
            BlockedReceiver.sender_id == payload.sender_id,
            BlockedReceiver.receiver_id == payload.receiver_id,
        )
    )
    if existing is not None:
        return existing

    record = BlockedReceiver(
        sender_id=payload.sender_id,
        receiver_id=payload.receiver_id,
        receiver_name=payload.receiver_name,
    )
    db.add(record)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        existing = db.scalar(
            select(BlockedReceiver).where(
                BlockedReceiver.sender_id == payload.sender_id,
                BlockedReceiver.receiver_id == payload.receiver_id,
            )
        )
        if existing is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Receiver could not be blocked.",
            ) from exc
        return existing
    db.refresh(record)
    return record


@router.delete("/{receiver_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_receiver(
    receiver_id: str,
    sender_id: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> None:
    record = db.scalar(
        select(BlockedReceiver).where(
            BlockedReceiver.sender_id == sender_id,
            BlockedReceiver.receiver_id == receiver_id,
        )
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Blocked receiver not found.")
    db.delete(record)
    db.flush()
