import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://sentinel:sentinel@localhost:5432/sentinelai",
)

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db.session import get_session_factory, init_db
from app.main import app
from app.models.risk_assessment import RiskAssessment
from app.models.transaction import TransactionRecord
from app.risk.decision import decide
from app.risk.engine import RiskSignals, calculate_risk
from app.risk.thresholds import APPROVE_MAX_SCORE, VERIFY_MAX_SCORE
from app.risk.weights import (
    ANOMALY_WEIGHT,
    BEHAVIORAL_WEIGHT,
    RECEIVER_WEIGHT,
    VELOCITY_WEIGHT,
)
from app.rules.state import reset_rule_state

EVALUATE_FIELDS = {
    "transaction_id",
    "composite_score",
    "decision",
    "risk_breakdown",
    "reason_codes",
}
BREAKDOWN_FIELDS = {"anomaly", "velocity", "receiver", "behavioral"}
READ_FIELDS = EVALUATE_FIELDS | {
    "user_id",
    "amount",
    "currency",
    "receiver_id",
    "timestamp",
}

NORMAL = {
    "transaction_id": "TXN_P1_NORMAL",
    "user_id": "USR_P1_N",
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

SUSPICIOUS = {
    **NORMAL,
    "transaction_id": "TXN_P1_SUSPICIOUS",
    "user_id": "USR_P1_S",
    "amount": 99000.00,
    "receiver_type": "unknown",
    "timestamp": "2026-09-03T02:15:30+05:30",
    "user_context": {
        "account_age_days": 1,
        "previous_transaction_count": 80,
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}

HIGH = {
    **SUSPICIOUS,
    "transaction_id": "TXN_P1_HIGH",
    "user_id": "USR_P1_H",
    "amount": 250000.00,
    "receiver_id": "REC_999",
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


def assert_evaluate_shape(body: dict) -> None:
    assert set(body) == EVALUATE_FIELDS
    assert set(body["risk_breakdown"]) == BREAKDOWN_FIELDS
    assert body["decision"] in ("APPROVE", "VERIFY", "BLOCK")
    for value in body["risk_breakdown"].values():
        assert 0 <= value <= 100
    expected = calculate_risk(RiskSignals(**body["risk_breakdown"]))
    assert body["composite_score"] == expected.composite_score
    assert body["decision"] == decide(body["composite_score"])


def main() -> None:
    assert ANOMALY_WEIGHT == 0.40
    assert VELOCITY_WEIGHT == 0.25
    assert RECEIVER_WEIGHT == 0.20
    assert BEHAVIORAL_WEIGHT == 0.15
    assert decide(40.0) == "APPROVE"
    assert decide(40.1) == "VERIFY"
    assert decide(70.0) == "VERIFY"
    assert decide(70.1) == "BLOCK"
    print("WEIGHTS_AND_THRESHOLDS_OK", APPROVE_MAX_SCORE, VERIFY_MAX_SCORE)

    init_db()
    client = TestClient(app)
    reset_rule_state()

    health = client.get("/health")
    print("HEALTH", health.status_code, health.json())
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    invalid = dict(NORMAL)
    invalid.pop("receiver_id")
    invalid_response = client.post("/transactions/evaluate", json=invalid)
    print("INVALID", invalid_response.status_code)
    assert invalid_response.status_code == 422

    results = []
    for payload in (NORMAL, SUSPICIOUS, HIGH):
        response = client.post("/transactions/evaluate", json=payload)
        body = response.json()
        print("EVALUATE", payload["transaction_id"], response.status_code, body)
        assert response.status_code == 200
        assert_evaluate_shape(body)
        assert body["transaction_id"] == payload["transaction_id"]
        results.append(body)

    normal, suspicious, high = results
    assert normal["decision"] == "APPROVE"
    assert suspicious["composite_score"] > normal["composite_score"]
    assert suspicious["decision"] in ("VERIFY", "BLOCK")
    assert high["decision"] in ("VERIFY", "BLOCK")
    assert suspicious["reason_codes"] or high["reason_codes"]
    assert len({item["transaction_id"] for item in results}) == 3

    db = get_session_factory()()
    try:
        for body in results:
            txn = db.scalar(
                select(TransactionRecord).where(
                    TransactionRecord.transaction_id == body["transaction_id"]
                )
            )
            risk = db.scalar(
                select(RiskAssessment).where(
                    RiskAssessment.transaction_id == body["transaction_id"]
                )
            )
            assert txn is not None
            assert risk is not None
            assert float(risk.composite_score) == body["composite_score"]
            assert risk.decision == body["decision"]
        print("PERSISTENCE_OK")
    finally:
        db.close()

    listing = client.get("/transactions")
    assert listing.status_code == 200
    listed_ids = {item["transaction_id"] for item in listing.json()}
    for txn_id in ("TXN_P1_NORMAL", "TXN_P1_SUSPICIOUS", "TXN_P1_HIGH"):
        assert txn_id in listed_ids
    assert set(listing.json()[0]) == READ_FIELDS

    detail = client.get("/transactions/TXN_P1_NORMAL")
    print("DETAIL", detail.status_code, detail.json()["decision"])
    assert detail.status_code == 200
    assert detail.json()["transaction_id"] == "TXN_P1_NORMAL"
    assert detail.json()["composite_score"] == normal["composite_score"]

    missing = client.get("/transactions/TXN_DOES_NOT_EXIST")
    print("MISSING", missing.status_code, missing.json())
    assert missing.status_code == 404

    summary = client.get("/dashboard/summary")
    distribution = client.get("/dashboard/risk-distribution")
    assert summary.status_code == 200
    assert distribution.status_code == 200

    db = get_session_factory()()
    try:
        counts = {"APPROVE": 0, "VERIFY": 0, "BLOCK": 0}
        for decision, count in db.execute(
            select(RiskAssessment.decision, func.count()).group_by(
                RiskAssessment.decision
            )
        ):
            counts[decision] = int(count)
        total = int(db.scalar(select(func.count()).select_from(TransactionRecord)))
    finally:
        db.close()

    print("SUMMARY", summary.json())
    print("DISTRIBUTION", distribution.json())
    assert summary.json()["total_transactions"] == total
    assert summary.json()["decisions"] == counts
    assert distribution.json() == counts
    print("ALL_PASS")


if __name__ == "__main__":
    main()
