"""HTTP tests for evaluate minimal explanation and the View risk-details endpoint."""

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

from app.db.session import init_db
from app.explanation_reason.services import format_shap_contributions
from app.main import app
from app.rules.state import reset_rule_state


DECISION_MAP = {
    "APPROVE": "APPROVE",
    "VERIFY": "MEDIUM_RISK",
    "HIGH_RISK": "HIGH_RISK",
    "BLOCK": "HIGH_RISK",
}

NORMAL = {
    "transaction_id": "TXN_VIEW_NORMAL",
    "user_id": "USR_VIEW_N",
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

VERIFY_LIKE = {
    **NORMAL,
    "transaction_id": "TXN_VIEW_VERIFY",
    "user_id": "USR_VIEW_V",
    "amount": 18000.00,
    "receiver_id": "REC_NEW_V",
    "receiver_type": "unknown",
    "timestamp": "2026-09-03T02:15:30+05:30",
    "user_context": {
        "account_age_days": 90,
        "previous_transaction_count": 20,
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}

HIGH = {
    **NORMAL,
    "transaction_id": "TXN_VIEW_HIGH",
    "user_id": "USR_VIEW_H",
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


def _client() -> TestClient:
    init_db()
    reset_rule_state()
    return TestClient(app)


def test_evaluate_minimal_explanation_by_decision() -> None:
    with _client() as client:
        approve = client.post("/evaluate", json=NORMAL).json()
        assert approve["decision"] == "APPROVE"
        assert approve["minimal_explanation"] is None
        assert not approve["reason_codes"]

        verify_body = client.post("/transactions/evaluate", json=VERIFY_LIKE).json()
        high_body = client.post("/transactions/evaluate", json=HIGH).json()

        flagged = [verify_body, high_body]
        decisions = {item["decision"] for item in flagged}
        assert decisions & {"VERIFY", "BLOCK"}
        for item in flagged:
            if item["decision"] == "APPROVE":
                continue
            assert item["reason_codes"]
            assert item["minimal_explanation"]
            assert item["minimal_explanation"].startswith(
                "This transaction was flagged due to"
            )

        if verify_body["decision"] == "VERIFY":
            assert verify_body["minimal_explanation"]
        if high_body["decision"] == "BLOCK":
            assert high_body["minimal_explanation"]


def test_risk_details_404_for_missing_transaction() -> None:
    with _client() as client:
        missing = client.get("/transactions/TXN_DOES_NOT_EXIST/risk-details")
        assert missing.status_code == 404
        assert missing.json()["detail"] == "Transaction not found"


def test_risk_details_maps_engine_decisions() -> None:
    with _client() as client:
        payloads = (NORMAL, VERIFY_LIKE, HIGH)
        for payload in payloads:
            evaluated = client.post("/evaluate", json=payload)
            assert evaluated.status_code == 200
            body = evaluated.json()
            details = client.get(
                f"/transactions/{body['transaction_id']}/risk-details"
            )
            assert details.status_code == 200
            detail = details.json()
            assert detail["decision"] == DECISION_MAP[body["decision"]]
            assert detail["engine_decision"] == body["decision"]
            assert detail["shap_features"] is None


def test_view_endpoint_explains_original_evaluation() -> None:
    with _client() as client:
        evaluated = client.post("/evaluate", json=HIGH)
        assert evaluated.status_code == 200
        body = evaluated.json()
        txn_id = body["transaction_id"]

        details = client.get(f"/transactions/{txn_id}/risk-details")
        assert details.status_code == 200
        detail = details.json()

        assert detail["transaction_id"] == txn_id
        assert detail["risk_score"] == body["risk_score"] == body["composite_score"]
        assert detail["engine_decision"] == body["decision"]
        assert detail["decision"] == DECISION_MAP[body["decision"]]
        assert [factor["feature"] for factor in detail["factors"]] == body["reason_codes"]
        assert "performed analysis" in detail["summary"].lower()
        assert f"{body['risk_score']:.2f}" in detail["summary"]
        assert detail["shap_features"] is None

        listed = client.get(f"/transactions/{txn_id}")
        assert listed.status_code == 200
        assert listed.json()["decision"] == body["decision"]
        assert listed.json()["composite_score"] == body["composite_score"]


def test_shap_passthrough_without_fabricating_values() -> None:
    assert format_shap_contributions(None) is None
    real = [{"feature": "transaction_amount", "contribution": 0.17}]
    assert format_shap_contributions(real)[0].contribution == 0.17
    with _client() as client:
        body = client.post("/evaluate", json=NORMAL).json()
        detail = client.get(
            f"/transactions/{body['transaction_id']}/risk-details"
        ).json()
        assert detail["shap_features"] is None


def test_existing_evaluate_and_list_routes_still_work() -> None:
    with _client() as client:
        health = client.get("/health")
        assert health.status_code == 200
        created = client.post("/transactions/evaluate", json=NORMAL)
        assert created.status_code == 200
        listing = client.get("/transactions")
        assert listing.status_code == 200
        assert any(
            item["transaction_id"] == "TXN_VIEW_NORMAL" for item in listing.json()
        )
        openapi = client.get("/openapi.json").json()
        paths = openapi["paths"]
        assert "/evaluate" in paths
        assert "/transactions/evaluate" in paths
        assert "/transactions/{transaction_id}/risk-details" in paths
