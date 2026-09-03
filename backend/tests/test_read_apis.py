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
from app.rules.state import reset_rule_state

NORMAL = {
    "transaction_id": "TXN_READ_NORMAL",
    "user_id": "USR_READ_N",
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
    "transaction_id": "TXN_READ_VERIFY",
    "user_id": "USR_READ_V",
    "amount": 99000.00,
    "receiver_type": "unknown",
    "timestamp": "2026-09-03T02:15:30+05:30",
    "user_context": {
        "account_age_days": 1,
        "previous_transaction_count": 80,
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}

UNUSUAL = {
    **VERIFY_LIKE,
    "transaction_id": "TXN_READ_HIGH",
    "user_id": "USR_READ_H",
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


def main() -> None:
    init_db()
    client = TestClient(app)
    reset_rule_state()

    created = []
    for payload in (NORMAL, VERIFY_LIKE, UNUSUAL):
        response = client.post("/transactions/evaluate", json=payload)
        assert response.status_code == 200, response.text
        created.append(response.json())
        print("CREATED", response.json()["transaction_id"], response.json()["decision"])

    listing = client.get("/transactions")
    print("LIST_STATUS", listing.status_code)
    assert listing.status_code == 200
    listed_ids = [item["transaction_id"] for item in listing.json()]
    for txn_id in ("TXN_READ_NORMAL", "TXN_READ_VERIFY", "TXN_READ_HIGH"):
        assert txn_id in listed_ids

    db = get_session_factory()()
    try:
        db_count = db.scalar(select(func.count()).select_from(TransactionRecord))
        assert len(listing.json()) == db_count
        first = listing.json()[0]
        stored = db.scalar(
            select(TransactionRecord).where(
                TransactionRecord.transaction_id == first["transaction_id"]
            )
        )
        assessment = db.scalar(
            select(RiskAssessment).where(
                RiskAssessment.transaction_id == first["transaction_id"]
            )
        )
        assert stored is not None
        assert float(assessment.composite_score) == first["composite_score"]
        assert assessment.decision == first["decision"]
    finally:
        db.close()

    detail = client.get("/transactions/TXN_READ_NORMAL")
    print("DETAIL", detail.status_code, detail.json())
    assert detail.status_code == 200
    assert detail.json()["transaction_id"] == "TXN_READ_NORMAL"
    assert detail.json()["composite_score"] == created[0]["composite_score"]

    missing = client.get("/transactions/TXN_DOES_NOT_EXIST")
    print("MISSING", missing.status_code, missing.json())
    assert missing.status_code == 404

    summary = client.get("/dashboard/summary")
    print("SUMMARY", summary.status_code, summary.json())
    assert summary.status_code == 200
    distribution = client.get("/dashboard/risk-distribution")
    print("DISTRIBUTION", distribution.status_code, distribution.json())
    assert distribution.status_code == 200

    db = get_session_factory()()
    try:
        counts = {"APPROVE": 0, "VERIFY": 0, "BLOCK": 0}
        for decision, count in db.execute(
            select(RiskAssessment.decision, func.count()).group_by(RiskAssessment.decision)
        ):
            counts[decision] = int(count)
        total = int(db.scalar(select(func.count()).select_from(TransactionRecord)))
    finally:
        db.close()

    assert summary.json()["total_transactions"] == total
    assert summary.json()["decisions"] == counts
    assert distribution.json() == counts

    health = client.get("/health")
    print("HEALTH", health.status_code, health.json())
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    print("ALL_PASS")


if __name__ == "__main__":
    main()
