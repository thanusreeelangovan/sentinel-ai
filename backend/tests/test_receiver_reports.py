"""HTTP tests for POST /reports (high-risk receiver fraud reports)."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

BACKEND = Path(__file__).resolve().parents[1]
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://sentinel:sentinel@127.0.0.1:5433/sentinelai",
)
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient

from app.main import app
from app.rules.state import reset_rule_state
from app.db.session import init_db

HIGH = {
    "transaction_id": "TXN_RECV_REPORT",
    "user_id": "USR_RECV_H",
    "amount": 100000.00,
    "currency": "INR",
    "receiver_id": "REC_999",
    "receiver_type": "unknown",
    "timestamp": "2026-09-03T02:15:30+05:30",
    "device_id": "DEV_NEW",
    "device_type": "unknown",
    "location": None,
    "ip_address": None,
    "user_context": {
        "account_age_days": 1,
        "previous_transaction_count": 400,
        "usual_transaction_range": {"min": 50.0, "max": 200.0},
    },
}


def _client() -> TestClient:
    init_db()
    reset_rule_state()
    return TestClient(app)


def test_post_reports_accepts_high_risk_receiver() -> None:
    payload = {
        **HIGH,
        "transaction_id": f"TXN_RECV_{uuid4().hex[:8]}",
        "user_id": f"USR_RECV_{uuid4().hex[:8]}",
    }
    with _client() as client:
        evaluated = client.post("/evaluate", json=payload)
        assert evaluated.status_code == 200
        body = evaluated.json()
        assert body["risk_level"] == "HIGH"

        reported = client.post(
            "/reports",
            json={
                "sender_id": payload["user_id"],
                "receiver_id": payload["receiver_id"],
                "transaction_context": {
                    "transaction_id": body["transaction_id"],
                    "amount": payload["amount"],
                    "currency": "INR",
                },
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "risk_score": body["composite_score"],
            },
            headers={"X-Authenticated-User-Id": payload["user_id"]},
        )
        assert reported.status_code == 201, reported.text
        data = reported.json()
        assert data["report_id"].startswith("REP-")
        assert data["receiver_id"] == payload["receiver_id"]
        assert data["status"] == "SUBMITTED"


def test_post_reports_slash_and_missing_transaction_still_succeeds() -> None:
    sender = f"USR_ORPHAN_{uuid4().hex[:8]}"
    with _client() as client:
        reported = client.post(
            "/reports/",
            json={
                "sender_id": sender,
                "receiver_id": "vpa@fraud",
                "transaction_context": {"transaction_id": "TXN_DOES_NOT_EXIST"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "risk_score": 88.5,
            },
        )
        assert reported.status_code == 201, reported.text
        assert reported.json()["report_id"].startswith("REP-")


def test_one_report_per_user() -> None:
    sender = f"USR_ONCE_{uuid4().hex[:8]}"
    with _client() as client:
        first = client.post(
            "/reports",
            json={
                "sender_id": sender,
                "receiver_id": "recv-a",
                "transaction_context": {"transaction_id": f"TXN_A_{uuid4().hex[:6]}"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "risk_score": 90.0,
            },
        )
        second = client.post(
            "/reports",
            json={
                "sender_id": sender,
                "receiver_id": "recv-b",
                "transaction_context": {"transaction_id": f"TXN_B_{uuid4().hex[:6]}"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "risk_score": 91.0,
            },
        )
        assert first.status_code == 201, first.text
        assert second.status_code == 409
        assert "one report" in second.json()["detail"].lower()


def test_post_reports_rejects_low_score() -> None:
    with _client() as client:
        reported = client.post(
            "/reports",
            json={
                "sender_id": "USR_LOW",
                "receiver_id": "merchant@ok",
                "transaction_context": {"transaction_id": "TXN_LOW"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "risk_score": 12.0,
            },
            headers={"X-Authenticated-User-Id": "USR_LOW"},
        )
        assert reported.status_code == 422
