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
    "amount": 250000.00,
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
    assert isinstance(body["summary"], str) and body["summary"]
    assert isinstance(body["detailed_reasoning"], str) and body["detailed_reasoning"]
    assert isinstance(body["recommended_action"], str) and body["recommended_action"]
    assert isinstance(body["explanation_signals"], list)
    blob = " ".join(
        [
            body["summary"],
            body["detailed_reasoning"],
            body["recommended_action"],
            *[
                f"{item['name']} {item['short_explanation']} {item['detailed_explanation']}"
                for item in body["explanation_signals"]
            ],
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
        assert "no significant anomalous" in low["summary"].lower()
        assert low["explanation_signals"] == []
        assert "no additional authentication" in low["recommended_action"].lower()

        assert medium["decision"] == "VERIFY"
        assert medium["risk_level"] == "MEDIUM"
        assert medium["reason_codes"]
        assert medium["explanation_signals"]
        assert "additional authentication is required" in medium["recommended_action"].lower()
        signal_names = {item["name"] for item in medium["explanation_signals"]}
        if "NEW_RECEIVER" in medium["reason_codes"]:
            assert "New Beneficiary" in signal_names
        if "UNUSUAL_AMOUNT" in medium["reason_codes"]:
            assert "Unusual Amount" in signal_names
        for item in medium["explanation_signals"]:
            assert {"name", "severity", "short_explanation", "detailed_explanation"} <= set(item)
            assert item["severity"] in {"LOW", "MEDIUM", "HIGH"}
            assert len(item["short_explanation"].split()) <= 16

        assert high["decision"] == "BLOCK"
        assert high["risk_level"] == "HIGH"
        assert high["reason_codes"]
        assert high["explanation_signals"]
        assert "high-risk authentication" in high["recommended_action"].lower()
        assert "high risk" in high["summary"].lower()
        assert len(high["detailed_reasoning"]) >= len(high["summary"])

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
