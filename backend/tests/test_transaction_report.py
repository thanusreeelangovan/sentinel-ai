"""Tests for reporting an evaluated transaction without rescoring."""

from __future__ import annotations

import os
import sys
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
from sqlalchemy import select

from app.db.session import get_session_factory, init_db
from app.main import app
from app.models.audit_log import AuditLog
from app.models.risk_assessment import RiskAssessment
from app.rules.state import reset_rule_state
from app.services.report import REPORT_EVENT_TYPE, count_reports

MEDIUM = {
    "transaction_id": "TXN_REPORT_MEDIUM",
    "user_id": "USR_REPORT_M",
    "amount": 18000.00,
    "currency": "INR",
    "receiver_id": "REC_NEW_M",
    "receiver_type": "unknown",
    "timestamp": "2026-09-03T02:15:30+05:30",
    "device_id": "DEV_019",
    "device_type": "android",
    "location": {"latitude": 12.9716, "longitude": 77.5946},
    "ip_address": "192.168.1.10",
    "user_context": {
        "account_age_days": 90,
        "previous_transaction_count": 20,
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}

HIGH = {
    **MEDIUM,
    "transaction_id": "TXN_REPORT_HIGH",
    "user_id": "USR_REPORT_H",
    "amount": 100000.00,
    "receiver_id": "REC_999",
    "receiver_type": "unknown",
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


def _payload(base: dict, label: str) -> dict:
    token = uuid4().hex[:8]
    return {
        **base,
        "transaction_id": f"{base['transaction_id']}_{label}_{token}",
        "user_id": f"{base['user_id']}_{label}_{token}",
    }


def _client() -> TestClient:
    init_db()
    reset_rule_state()
    return TestClient(app)


def _assessment(transaction_id: str) -> tuple[str, float]:
    db = get_session_factory()()
    try:
        row = db.scalar(
            select(RiskAssessment).where(
                RiskAssessment.transaction_id == transaction_id
            )
        )
        assert row is not None
        return row.decision, float(row.composite_score)
    finally:
        db.close()


def _report_count(transaction_id: str) -> int:
    db = get_session_factory()()
    try:
        return count_reports(db, transaction_id)
    finally:
        db.close()


def test_report_medium_risk_transaction() -> None:
    with _client() as client:
        evaluated = client.post("/evaluate", json=_payload(MEDIUM, "med"))
        assert evaluated.status_code == 200
        body = evaluated.json()
        assert body["decision"] == "VERIFY"
        assert body["risk_level"] == "MEDIUM"

        reported = client.post(f"/transactions/{body['transaction_id']}/report")
        assert reported.status_code == 200
        payload = reported.json()
        assert payload["transaction_id"] == body["transaction_id"]
        assert payload["reported"] is True
        assert payload["message"]


def test_report_high_risk_transaction() -> None:
    with _client() as client:
        evaluated = client.post("/evaluate", json=_payload(HIGH, "high"))
        assert evaluated.status_code == 200
        body = evaluated.json()
        assert body["decision"] == "BLOCK"
        assert body["risk_level"] == "HIGH"

        reported = client.post(f"/transactions/{body['transaction_id']}/report")
        assert reported.status_code == 200
        payload = reported.json()
        assert payload["transaction_id"] == body["transaction_id"]
        assert payload["reported"] is True


def test_report_nonexistent_transaction() -> None:
    with _client() as client:
        missing = client.post("/transactions/TXN_REPORT_MISSING/report")
        assert missing.status_code == 404
        assert missing.json()["detail"] == "Transaction not found"


def test_report_same_transaction_twice_is_idempotent() -> None:
    payload = _payload(HIGH, "dup")
    with _client() as client:
        evaluated = client.post("/evaluate", json=payload)
        assert evaluated.status_code == 200
        txn_id = evaluated.json()["transaction_id"]

        first = client.post(f"/transactions/{txn_id}/report")
        second = client.post(f"/transactions/{txn_id}/report")
        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json()["reported"] is True
        assert second.json()["reported"] is True
        assert second.json()["message"] == "Transaction was already reported."
        assert _report_count(txn_id) == 1


def test_report_does_not_change_risk_score_or_classification() -> None:
    payload = _payload(MEDIUM, "unchanged")
    with _client() as client:
        evaluated = client.post("/evaluate", json=payload)
        assert evaluated.status_code == 200
        body = evaluated.json()
        txn_id = body["transaction_id"]
        before_decision, before_score = _assessment(txn_id)

        reported = client.post(f"/transactions/{txn_id}/report")
        assert reported.status_code == 200

        after_decision, after_score = _assessment(txn_id)
        listed = client.get(f"/transactions/{txn_id}")
        assert listed.status_code == 200
        assert after_decision == before_decision == body["decision"]
        assert after_score == before_score == body["composite_score"]
        assert listed.json()["decision"] == body["decision"]
        assert listed.json()["composite_score"] == body["composite_score"]


def test_report_is_persisted_in_audit_log() -> None:
    payload = _payload(MEDIUM, "persist")
    with _client() as client:
        evaluated = client.post("/evaluate", json=payload)
        assert evaluated.status_code == 200
        txn_id = evaluated.json()["transaction_id"]
        assert _report_count(txn_id) == 0

        reported = client.post(f"/transactions/{txn_id}/report")
        assert reported.status_code == 200
        assert _report_count(txn_id) == 1

        db = get_session_factory()()
        try:
            row = db.scalar(
                select(AuditLog).where(
                    AuditLog.transaction_id == txn_id,
                    AuditLog.event_type == REPORT_EVENT_TYPE,
                )
            )
            assert row is not None
            assert row.decision == evaluated.json()["decision"]
            assert float(row.risk_score) == evaluated.json()["composite_score"]
            assert row.details.get("reported") is True
        finally:
            db.close()
