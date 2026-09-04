import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from fastapi import APIRouter, Header, HTTPException, status

from app.reports.schemas import CreateReportRequest, ReportResponse

router = APIRouter(prefix="/reports", tags=["User Reporting"])

# Statutory / System threshold for "Extremely High Risk" (Matching HIGH / BLOCK tier > 75.0)
EXTREMELY_HIGH_RISK_THRESHOLD: float = 75.0

# In-memory Rate Limiting configuration: Max 5 requests per 60 seconds per sender
RATE_LIMIT_WINDOW_SECONDS: int = 60
MAX_REQUESTS_PER_WINDOW: int = 5
_request_timestamps: Dict[str, List[float]] = defaultdict(list)

# In-memory Duplicate Prevention store: sender_id + receiver_id + transaction_id
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
def create_report(
    payload: CreateReportRequest,
    x_authenticated_user_id: Optional[str] = Header(None, alias="X-Authenticated-User-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> ReportResponse:
    # 1. Rate Limiting Check
    _enforce_rate_limit(payload.sender_id)

    # 2. Authentication / Authorization Validation
    auth_user = _get_authenticated_user_id(x_authenticated_user_id, authorization)
    if not auth_user:
        # If no authentication header provided, reject with 401 Unauthorized
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing X-Authenticated-User-Id or Authorization header.",
        )

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

    # 4. Duplicate Attempt Validation
    tx_id = str(payload.transaction_context.get("transaction_id", "NO_TX_ID"))
    dedup_key = f"{payload.sender_id}:{payload.receiver_id}:{tx_id}"

    if dedup_key in _submitted_reports_cache:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate attempt: A report has already been submitted for receiver '{payload.receiver_id}' under this transaction.",
        )

    # Record into duplicate cache
    _submitted_reports_cache.add(dedup_key)

    # 5. Success Response (Persistence handled out-of-scope per constraints)
    report_id = f"REP-{uuid.uuid4().hex[:12].upper()}"

    return ReportResponse(
        report_id=report_id,
        status="SUBMITTED",
        message="User report successfully registered and escalated for security review.",
        submitted_at=datetime.now(timezone.utc),
        sender_id=payload.sender_id,
        receiver_id=payload.receiver_id,
        risk_score=payload.risk_score,
    )
