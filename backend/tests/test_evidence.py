"""Tests for investigation evidence retrieval and existing endpoints."""

from app.seed import (
    EMPTY_EVIDENCE_ACCOUNT_ID,
    NONEXISTENT_ACCOUNT_ID,
    PRIMARY_EVIDENCE_ACCOUNT_ID,
    SHARED_DEVICE_ID,
    SHARED_IP_ADDRESS,
)

EVIDENCE_PATHS = (
    "transactions",
    "logins",
    "devices",
    "ip-activity",
    "cases",
)

EVALUATE_PAYLOAD = {
    "transaction_id": "TXN_EVAL_EVIDENCE_1",
    "user_id": "USR_EVAL_1",
    "amount": 1500.0,
    "currency": "INR",
    "receiver_id": "REC_EVAL_1",
    "receiver_type": "merchant",
    "timestamp": "2026-08-15T12:00:00+00:00",
    "device_id": "DEV_EVAL_1",
    "device_type": "android",
    "ip_address": "192.0.2.10",
    "user_context": {
        "account_age_days": 90,
        "previous_transaction_count": 12,
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}


def _collection_key(path: str) -> str:
    return {
        "transactions": "transactions",
        "logins": "logins",
        "devices": "devices",
        "ip-activity": "ip_activity",
        "cases": "cases",
    }[path]


def test_health_returns_successfully(client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_evaluate_still_works(client) -> None:
    from sqlalchemy import delete

    from app.db.session import get_session_factory
    from app.models.audit_log import AuditLog
    from app.models.risk_assessment import RiskAssessment
    from app.models.rule_event import RuleEvent
    from app.models.transaction import TransactionRecord

    txn_id = EVALUATE_PAYLOAD["transaction_id"]
    db = get_session_factory()()
    try:
        db.execute(delete(RiskAssessment).where(RiskAssessment.transaction_id == txn_id))
        db.execute(delete(RuleEvent).where(RuleEvent.transaction_id == txn_id))
        db.execute(delete(AuditLog).where(AuditLog.transaction_id == txn_id))
        db.execute(delete(TransactionRecord).where(TransactionRecord.transaction_id == txn_id))
        db.commit()
    finally:
        db.close()

    response = client.post("/transactions/evaluate", json=EVALUATE_PAYLOAD)
    assert response.status_code == 200
    body = response.json()
    assert body["transaction_id"] == "TXN_EVAL_EVIDENCE_1"
    assert body["decision"] in {"APPROVE", "VERIFY", "BLOCK"}
    assert "composite_score" in body


def test_transaction_history_for_valid_account(client) -> None:
    response = client.get(f"/accounts/{PRIMARY_EVIDENCE_ACCOUNT_ID}/transactions")
    assert response.status_code == 200
    body = response.json()
    assert body["account_id"] == PRIMARY_EVIDENCE_ACCOUNT_ID
    ids = {txn["transaction_id"] for txn in body["transactions"]}
    assert {"TXN_TEST_001", "TXN_TEST_002", "TXN_TEST_003"} <= ids
    txn = next(item for item in body["transactions"] if item["transaction_id"] == "TXN_TEST_001")
    assert txn["sender_account"] == "ACC001"
    assert txn["receiver_account"] == "MER_100"
    assert txn["amount"] == 2500.0
    assert txn["status"] == "recorded"


def test_login_history_for_valid_account(client) -> None:
    response = client.get(f"/accounts/{PRIMARY_EVIDENCE_ACCOUNT_ID}/logins")
    assert response.status_code == 200
    body = response.json()
    assert len(body["logins"]) == 2
    results = {item["login_event_id"]: item["success"] for item in body["logins"]}
    assert results["LGN_TEST_001"] is True
    assert results["LGN_TEST_002"] is False


def test_device_activity_for_valid_account(client) -> None:
    response = client.get(f"/accounts/{PRIMARY_EVIDENCE_ACCOUNT_ID}/devices")
    assert response.status_code == 200
    body = response.json()
    assert len(body["devices"]) == 2
    assert all(item["device_id"] == SHARED_DEVICE_ID for item in body["devices"])


def test_ip_activity_for_valid_account(client) -> None:
    response = client.get(f"/accounts/{PRIMARY_EVIDENCE_ACCOUNT_ID}/ip-activity")
    assert response.status_code == 200
    body = response.json()
    assert len(body["ip_activity"]) == 2
    assert all(item["ip_address"] == SHARED_IP_ADDRESS for item in body["ip_activity"])


def test_case_history_for_valid_account(client) -> None:
    response = client.get(f"/accounts/{PRIMARY_EVIDENCE_ACCOUNT_ID}/cases")
    assert response.status_code == 200
    body = response.json()
    assert len(body["cases"]) == 1
    case = body["cases"][0]
    assert case["case_id"] == "CASE_TEST_001"
    assert case["status"] == "closed"
    assert case["outcome"] == "cleared"


def test_account_with_no_matching_evidence(client) -> None:
    for path in EVIDENCE_PATHS:
        response = client.get(f"/accounts/{EMPTY_EVIDENCE_ACCOUNT_ID}/{path}")
        assert response.status_code == 200
        body = response.json()
        assert body["account_id"] == EMPTY_EVIDENCE_ACCOUNT_ID
        assert body[_collection_key(path)] == []


def test_nonexistent_account_returns_empty_evidence(client) -> None:
    for path in EVIDENCE_PATHS:
        response = client.get(f"/accounts/{NONEXISTENT_ACCOUNT_ID}/{path}")
        assert response.status_code == 200
        body = response.json()
        assert body["account_id"] == NONEXISTENT_ACCOUNT_ID
        assert body[_collection_key(path)] == []


def test_account_to_device_relationships(client) -> None:
    response = client.get(f"/devices/{SHARED_DEVICE_ID}/accounts")
    assert response.status_code == 200
    body = response.json()
    assert "ACC001" in body["account_ids"]
    assert "ACC003" in body["account_ids"]


def test_account_to_ip_relationships(client) -> None:
    response = client.get(f"/ip-activity/{SHARED_IP_ADDRESS}/accounts")
    assert response.status_code == 200
    body = response.json()
    assert "ACC001" in body["account_ids"]
    assert "ACC003" in body["account_ids"]
