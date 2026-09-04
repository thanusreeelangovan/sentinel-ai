"""Evaluate endpoint returns two-level explanations without changing scoring."""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://sentinel:sentinel@127.0.0.1:5433/sentinelai",
)
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient

from app.db.session import get_session_factory, init_db
from app.main import app
from app.models.risk_assessment import RiskAssessment
from app.models.transaction import TransactionRecord
from app.risk.decision import decide
from app.risk.engine import RiskSignals, calculate_risk
from app.rules.state import reset_rule_state
from sqlalchemy import select

LOW = {
    "transaction_id": "TXN_UX_LOW",
    "user_id": "USR_UX_L",
    "amount": 2500.00,
    "currency": "INR",
    "receiver_id": "REC_045",
    "receiver_type": "merchant",
    "timestamp": "2026-09-03T10:15:30+05:30",
    "device_id": "DEV_019",
    "device_type": "android",
    "location": {"latitude": 12.9716, "longitude": 77.5946},
    "ip_address": "192.168.1.10",
    "user_context": {
        "account_age_days": 420,
        "previous_transaction_count": 157,
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}

MEDIUM = {
    **LOW,
    "transaction_id": "TXN_UX_MEDIUM",
    "user_id": "USR_UX_M",
    "amount": 18000.00,
    "receiver_id": "REC_NEW_M",
    "receiver_type": "unknown",
    "timestamp": "2026-09-03T02:15:30+05:30",
    "user_context": {
        "account_age_days": 90,
        "previous_transaction_count": 20,
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}

HIGH = {
    **LOW,
    "transaction_id": "TXN_UX_HIGH",
    "user_id": "USR_UX_H",
    "amount": 100000.00,
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

LEGACY_FIELDS = {
    "transaction_id",
    "composite_score",
    "decision",
    "risk_level",
    "risk_breakdown",
    "reason_codes",
    "explanation",
    "policy_applied",
    "signals",
}

INTERNAL_LEAKS = (
    "isolation forest",
    "iforest",
    "shap",
    "postgres",
    "database",
    "sqlalchemy",
    "model_version",
)


def _client() -> TestClient:
    init_db()
    reset_rule_state()
    return TestClient(app)


def _assert_legacy_and_score(body: dict) -> None:
    assert LEGACY_FIELDS <= set(body)
    assert body["decision"] in {"APPROVE", "VERIFY", "BLOCK"}
    assert body["risk_level"] in {"LOW", "MEDIUM", "HIGH"}
    assert isinstance(body["signals"], dict)
    assert "behavioral_cadence" in body["signals"]
    expected = calculate_risk(RiskSignals(**body["risk_breakdown"]))
    assert body["composite_score"] == expected.composite_score
    assert body["decision"] == decide(body["composite_score"])
    assert body["risk_score"] == body["composite_score"]


def _assert_user_facing(body: dict) -> None:
    assert "summary" not in body
    assert "recommended_action" not in body
    assert "explanation_signals" not in body
    assert "detailed_reasoning" not in body
    assert isinstance(body["explanation"], str) and body["explanation"]
    assert "sentinelai performed analysis" in body["explanation"].lower()
    assert f"{body['composite_score']:.2f}" in body["explanation"]
    assert "risk components" in body["explanation"].lower()
    blob = " ".join(
        [
            body.get("minimal_explanation") or "",
            body["explanation"],
        ]
    ).lower()
    for leak in INTERNAL_LEAKS:
        assert leak not in blob


def test_low_medium_high_explanations_preserve_scoring() -> None:
    with _client() as client:
        low = client.post("/evaluate", json=LOW).json()
        medium = client.post("/evaluate", json=MEDIUM).json()
        high = client.post("/evaluate", json=HIGH).json()

        for body in (low, medium, high):
            _assert_legacy_and_score(body)
            _assert_user_facing(body)

        assert low["decision"] == "APPROVE"
        assert low["risk_level"] == "LOW"
        assert low["minimal_explanation"] is None
        assert "no unusual anomalies" in low["explanation"].lower()

        assert medium["decision"] == "VERIFY"
        assert medium["risk_level"] == "MEDIUM"
        assert medium["reason_codes"]
        assert medium["minimal_explanation"]
        assert medium["minimal_explanation"].startswith(
            "This transaction was flagged due to"
        )
        assert medium["minimal_explanation"].count(" and ") <= 1
        assert "detected factors" in medium["explanation"].lower()
        assert "feature contributions" in medium["explanation"].lower()
        assert len(medium["minimal_explanation"]) * 2 < len(medium["explanation"])

        assert high["decision"] == "BLOCK"
        assert high["risk_level"] == "HIGH"
        assert high["reason_codes"]
        assert high["minimal_explanation"]
        assert high["minimal_explanation"].startswith(
            "This transaction was flagged due to"
        )
        assert high["minimal_explanation"].count(" and ") <= 1
        assert "detected factors" in high["explanation"].lower()
        assert "feature contributions" in high["explanation"].lower()
        assert len(high["minimal_explanation"]) * 2 < len(high["explanation"])

        db = get_session_factory()()
        try:
            for txn_id, body in (
                ("TXN_UX_LOW", low),
                ("TXN_UX_MEDIUM", medium),
                ("TXN_UX_HIGH", high),
            ):
                txn = db.scalar(
                    select(TransactionRecord).where(TransactionRecord.transaction_id == txn_id)
                )
                risk = db.scalar(
                    select(RiskAssessment).where(RiskAssessment.transaction_id == txn_id)
                )
                assert txn is not None
                assert risk is not None
                assert float(risk.composite_score) == body["composite_score"]
                assert risk.decision == body["decision"]
        finally:
            db.close()

        listing = client.get("/transactions")
        assert listing.status_code == 200
        health = client.get("/health")
        assert health.status_code == 200
