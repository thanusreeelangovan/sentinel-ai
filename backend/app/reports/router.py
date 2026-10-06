import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.reports.schemas import CreateReportRequest, ReportResponse
from app.services.receiver_report import get_sender_report, persist_receiver_report

router = APIRouter(prefix="/reports", tags=["User Reporting"])

# Prototype reporting is available only for the HIGH tier (> 75.0).
EXTREMELY_HIGH_RISK_THRESHOLD: float = 75.0

# In-memory Rate Limiting configuration: Max 5 requests per 60 seconds per sender
RATE_LIMIT_WINDOW_SECONDS: int = 60
MAX_REQUESTS_PER_WINDOW: int = 5
_request_timestamps: Dict[str, List[float]] = defaultdict(list)


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
    """Read the prototype caller identity; these headers are not verified credentials.
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
    description="Accepts a prototype receiver report for a HIGH risk score; caller identity headers are not production authentication.",
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
) -> ReportResponse | JSONResponse:
    # 1. Rate Limiting Check
    _enforce_rate_limit(payload.sender_id)

    # 2. Check caller-supplied identity consistency; this is not authentication.
    auth_user = _get_authenticated_user_id(x_authenticated_user_id, authorization)
    if not auth_user:
        # The phone simulator supplies a demo identity; this is not production authentication.
        auth_user = payload.sender_id

    if auth_user != payload.sender_id:
        # Sender cannot report on behalf of another user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Caller identity does not match sender_id.",
        )

    # 3. Risk Status Validation
    if payload.risk_score <= EXTREMELY_HIGH_RISK_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid risk status: Only receivers flagged as 'extremely high risk' "
                f"(risk_score > {EXTREMELY_HIGH_RISK_THRESHOLD}) can be reported. Provided score: {payload.risk_score}."
            ),
        )

    # 4. One report per user
    raw_transaction_id = payload.transaction_context.get("transaction_id")
    tx_id = raw_transaction_id.strip() if isinstance(raw_transaction_id, str) else None
    existing_report = get_sender_report(db, payload.sender_id)
    if existing_report is not None:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "You have already submitted a fraud report. Only one report is allowed per user.",
                "report_id": existing_report.report_id,
            },
        )

    report_id = f"REP-{uuid.uuid4().hex[:12].upper()}"
    persist_receiver_report(
        db,
        transaction_id=tx_id or None,
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
        message="This report is recorded in the SentinelAI prototype for fraud review.",
        submitted_at=datetime.now(timezone.utc),
        sender_id=payload.sender_id,
        receiver_id=payload.receiver_id,
        risk_score=payload.risk_score,
    )
