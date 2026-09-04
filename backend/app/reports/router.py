import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.reports.schemas import CreateReportRequest, ReportResponse
from app.services.receiver_report import persist_receiver_report, sender_has_reported

router = APIRouter(prefix="/reports", tags=["User Reporting"])

# Statutory / System threshold for "Extremely High Risk" (Matching HIGH / BLOCK tier > 75.0)
EXTREMELY_HIGH_RISK_THRESHOLD: float = 75.0

# In-memory Rate Limiting configuration: Max 5 requests per 60 seconds per sender
RATE_LIMIT_WINDOW_SECONDS: int = 60
MAX_REQUESTS_PER_WINDOW: int = 5
_request_timestamps: Dict[str, List[float]] = defaultdict(list)

# One fraud report per sender (user), not per transaction.
_submitted_reports_cache: Set[str] = set()


def _enforce_rate_limit(sender_id: str) -> None:
    """Sliding-window rate limiter per sender_id."""
    current_time = time.time()
    cutoff_time = current_time - RATE_LIMIT_WINDOW_SECONDS

    # Clean expired timestamps
    _request_timestamps[sender_id] = [
        t for t in _request_timestamps[sender_id] if t > cutoff_time
    ]

    if len(_request_timestamps[sender_id]) >= MAX_REQUESTS_PER_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded: You can submit at most 5 reports per minute.",
        )

    _request_timestamps[sender_id].append(current_time)


def _get_authenticated_user_id(
    x_authenticated_user_id: Optional[str] = Header(None, alias="X-Authenticated-User-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Optional[str]:
    """
    Extracts authenticated user identity from standard request headers.
    Supports X-Authenticated-User-Id or Bearer token format.
    """
    if x_authenticated_user_id:
        return x_authenticated_user_id.strip()

    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        if token:
            return token

    return None


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit User Report for Extremely High Risk Receiver",
    description="Allows an authenticated sender to submit a fraud report for a receiver evaluated as extremely high risk.",
)
@router.post(
    "/",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_report(
    payload: CreateReportRequest,
    db: Session = Depends(get_db),
    x_authenticated_user_id: Optional[str] = Header(None, alias="X-Authenticated-User-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> ReportResponse:
    # 1. Rate Limiting Check
    _enforce_rate_limit(payload.sender_id)

    # 2. Authentication / Authorization Validation
    auth_user = _get_authenticated_user_id(x_authenticated_user_id, authorization)
    if not auth_user:
        # Phone simulator posts sender_id; accept it when no auth header is present.
        auth_user = payload.sender_id

    if auth_user != payload.sender_id:
        # Sender cannot report on behalf of another user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Authenticated user '{auth_user}' does not match sender_id '{payload.sender_id}'.",
        )

    # 3. Risk Status Validation
    if payload.risk_score < EXTREMELY_HIGH_RISK_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid risk status: Only receivers flagged as 'extremely high risk' "
                f"(risk_score >= {EXTREMELY_HIGH_RISK_THRESHOLD}) can be reported. Provided score: {payload.risk_score}."
            ),
        )

    # 4. One report per user
    tx_id = str(payload.transaction_context.get("transaction_id", "NO_TX_ID"))
    if payload.sender_id in _submitted_reports_cache or sender_has_reported(db, payload.sender_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a fraud report. Only one report is allowed per user.",
        )

    _submitted_reports_cache.add(payload.sender_id)

    report_id = f"REP-{uuid.uuid4().hex[:12].upper()}"
    persist_receiver_report(
        db,
        transaction_id=None if tx_id == "NO_TX_ID" else tx_id,
        sender_id=payload.sender_id,
        receiver_id=payload.receiver_id,
        risk_score=payload.risk_score,
        report_id=report_id,
        transaction_context=payload.transaction_context,
    )
    db.commit()

    return ReportResponse(
        report_id=report_id,
        status="SUBMITTED",
        message="User report successfully registered and escalated for security review.",
        submitted_at=datetime.now(timezone.utc),
        sender_id=payload.sender_id,
        receiver_id=payload.receiver_id,
        risk_score=payload.risk_score,
    )
