"""Tests for the explanation_reason module."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://sentinel:sentinel@127.0.0.1:5433/sentinelai",
)
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.explanation_reason import (
    DetailedExplanation,
    MinimalExplanation,
    ShapFeatureContribution,
    format_shap_contributions,
    generate_detailed_explanation,
    generate_detailed_explanation_from_result,
    generate_minimal_explanation,
    generate_minimal_explanation_from_result,
)
from app.explanation_reason.schemas import RiskFactor
from app.schemas.evaluate import EvaluateResponse, EvaluationSignals, RiskBreakdown
from app.schemas.reads import TransactionRead
from app.schemas.transaction import Transaction
from app.services.evaluate import evaluate_transaction

from fastapi.testclient import TestClient

from app.db.session import get_session_factory, init_db
from app.main import app
from app.rules.state import reset_rule_state


BREAKDOWN = RiskBreakdown(
    anomaly=20.0,
    velocity=10.0,
    receiver=65.0,
    behavioral=60.0,
)

NORMAL = {
    "transaction_id": "TXN_EXPLAIN_NORMAL",
    "user_id": "USR_EXPLAIN_N",
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

HIGH = {
    **NORMAL,
    "transaction_id": "TXN_EXPLAIN_HIGH",
    "user_id": "USR_EXPLAIN_H",
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


def test_schemas_import_and_validate() -> None:
    minimal = MinimalExplanation(decision="APPROVE", explanation=None)
    detailed = DetailedExplanation(
        transaction_id="TXN001",
        decision="MEDIUM_RISK",
        risk_score=68,
        summary="This transaction differs from the user's normal payment behaviour.",
        factors=[
            RiskFactor(
                feature="NEW_RECEIVER",
                description="The beneficiary is new.",
                impact=0.21,
            )
        ],
        shap_features=None,
    )
    assert minimal.explanation is None
    assert detailed.shap_features is None
    dumped = detailed.model_dump()
    assert dumped["transaction_id"] == "TXN001"
    assert dumped["decision"] == "MEDIUM_RISK"


def test_approve_minimal_explanation_is_null() -> None:
    result = generate_minimal_explanation(
        decision="APPROVE",
        reason_codes=[],
        risk_score=12.0,
        transaction_id="TXN_OK",
    )
    assert result.decision == "APPROVE"
    assert result.explanation is None


def test_minimal_explanation_is_built_from_signals() -> None:
    result = generate_minimal_explanation(
        decision="VERIFY",
        reason_codes=["NEW_RECEIVER", "UNUSUAL_AMOUNT"],
        risk_breakdown=BREAKDOWN,
        risk_score=68,
        transaction_id="TXN001",
    )
    assert result.decision == "MEDIUM_RISK"
    assert result.explanation == (
        "This transaction was flagged due to a new beneficiary and an unusual amount."
    )


def test_minimal_explanation_uses_at_most_two_reasons() -> None:
    result = generate_minimal_explanation(
        decision="BLOCK",
        reason_codes=[
            "HIGH_ANOMALY",
            "HIGH_TRANSACTION_VELOCITY",
            "UNKNOWN_RECEIVER_TYPE",
            "UNUSUAL_AMOUNT",
            "UNUSUAL_HOUR",
        ],
        risk_score=89.78,
        transaction_id="TXN_MANY",
    )
    assert result.explanation == (
        "This transaction was flagged due to an unusual pattern and high payment velocity."
    )
    assert "typical hours" not in result.explanation
    assert "unfamiliar beneficiary" not in result.explanation


def test_detailed_explanation_without_inventing_shap() -> None:
    result = generate_detailed_explanation(
        transaction_id="TXN001",
        decision="VERIFY",
        risk_score=68,
        reason_codes=["NEW_RECEIVER", "UNUSUAL_AMOUNT"],
        risk_breakdown=BREAKDOWN,
    )
    assert result.decision == "MEDIUM_RISK"
    assert result.engine_decision == "VERIFY"
    assert result.shap_features is None
    assert [factor.feature for factor in result.factors] == [
        "NEW_RECEIVER",
        "UNUSUAL_AMOUNT",
    ]
    assert all(factor.impact is not None for factor in result.factors)


def test_shap_passthrough_only_when_provided() -> None:
    assert format_shap_contributions(None) is None
    assert format_shap_contributions([]) == []
    passed = format_shap_contributions(
        [{"feature": "transaction_amount", "contribution": 0.17}]
    )
    assert passed == [
        ShapFeatureContribution(feature="transaction_amount", contribution=0.17)
    ]
    detailed = generate_detailed_explanation(
        transaction_id="TXN001",
        decision="BLOCK",
        risk_score=88,
        shap_features=passed,
    )
    assert detailed.decision == "HIGH_RISK"
    assert detailed.shap_features == passed


def test_missing_optional_signals_use_breakdown() -> None:
    result = generate_detailed_explanation(
        transaction_id="TXN002",
        decision="VERIFY",
        risk_score=55,
        reason_codes=[],
        risk_breakdown=BREAKDOWN,
    )
    features = {factor.feature for factor in result.factors}
    assert "receiver" in features
    assert "behavioral" in features
    assert "velocity" not in features


def test_from_evaluate_and_read_models() -> None:
    response = EvaluateResponse(
        transaction_id="TXN001",
        composite_score=68.0,
        decision="VERIFY",
        risk_level="MEDIUM",
        risk_breakdown=BREAKDOWN,
        reason_codes=["NEW_RECEIVER"],
        explanation="placeholder",
        policy_applied="POLICY_STEP_UP_VERIFICATION_REQUIRED",
        model_version="iforest_v1",
        evaluated_at=datetime.now(timezone.utc).isoformat(),
        latency_ms=4,
        signals=EvaluationSignals(
            behavioral_cadence="MODERATE_VARIANCE",
            geo_hop_velocity="LOCAL_RADIUS_MATCH",
            device_trust="PRIMARY_TRUSTED_DEVICE",
            typing_entropy=58,
            gyro_tilt=24.5,
            is_clipboard_paste=False,
            hardware_trust_score=64,
            human_probability=72,
        ),
        risk_score=68.0,
    )
    minimal = generate_minimal_explanation_from_result(response)
    detailed = generate_detailed_explanation_from_result(response)
    assert minimal.decision == "MEDIUM_RISK"
    assert "new beneficiary" in (minimal.explanation or "")
    assert detailed.transaction_id == "TXN001"

    read = TransactionRead(
        transaction_id="TXN001",
        user_id="USR_001",
        amount=99000.0,
        currency="INR",
        receiver_id="REC_045",
        timestamp=datetime.now(timezone.utc),
        composite_score=68.0,
        decision="VERIFY",
        risk_breakdown=BREAKDOWN,
        reason_codes=["NEW_RECEIVER", "UNUSUAL_AMOUNT"],
    )
    from_read = generate_detailed_explanation_from_result(read)
    assert from_read.engine_decision == "VERIFY"
    assert len(from_read.factors) == 2


def test_live_evaluate_pipeline_explanations() -> None:
    init_db()
    reset_rule_state()
    db = get_session_factory()()
    try:
        approve = evaluate_transaction(Transaction.model_validate(NORMAL), db)
        high = evaluate_transaction(Transaction.model_validate(HIGH), db)
    finally:
        db.close()

    approve_min = generate_minimal_explanation_from_result(approve)
    assert approve.decision == "APPROVE"
    assert approve_min.decision == "APPROVE"
    assert approve_min.explanation is None

    high_min = generate_minimal_explanation_from_result(high)
    high_detail = generate_detailed_explanation_from_result(high)
    assert high.decision in {"VERIFY", "BLOCK"}
    assert high_min.decision in {"MEDIUM_RISK", "HIGH_RISK"}
    assert high_min.explanation is not None
    assert high_min.explanation.startswith("This transaction was flagged due to")
    assert high.reason_codes
    assert [factor.feature for factor in high_detail.factors] == high.reason_codes
    assert high_detail.shap_features is None

    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        listed = client.get("/transactions")
        assert listed.status_code == 200
        ids = {item["transaction_id"] for item in listed.json()}
        assert "TXN_EXPLAIN_NORMAL" in ids
        assert "TXN_EXPLAIN_HIGH" in ids
