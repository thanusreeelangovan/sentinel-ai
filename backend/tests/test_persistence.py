import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://sentinel:sentinel@localhost:5432/sentinelai",
)

from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.db.session import get_engine, get_session_factory, init_db
from app.main import app
from app.models.risk_assessment import RiskAssessment
from app.models.transaction import TransactionRecord
from app.models.user import User
from app.rules.state import reset_rule_state


def payload(txn: str, user: str, amount: float = 2500.00) -> dict:
    return {
        "transaction_id": txn,
        "user_id": user,
        "amount": amount,
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


def main() -> None:
    init_db()
    engine = get_engine()
    with engine.connect() as conn:
        tables = [
            row[0]
            for row in conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema='public' ORDER BY table_name"
                )
            )
        ]
    print("TABLES", tables)
    print("CONNECTIVITY_OK")

    client = TestClient(app)
    reset_rule_state()

    first = client.post(
        "/transactions/evaluate", json=payload("TXN_DB_001", "USR_DB_001")
    )
    first_body = first.json()
    print("EVAL1", first.status_code, first_body)
    assert first.status_code == 200

    second = client.post(
        "/transactions/evaluate",
        json=payload("TXN_DB_002", "USR_DB_002", 1800.00),
    )
    second_body = second.json()
    print(
        "EVAL2",
        second.status_code,
        second_body["transaction_id"],
        second_body["decision"],
        second_body["composite_score"],
    )
    assert second.status_code == 200

    db = get_session_factory()()
    try:
        txn_one = db.scalar(
            select(TransactionRecord).where(
                TransactionRecord.transaction_id == "TXN_DB_001"
            )
        )
        txn_two = db.scalar(
            select(TransactionRecord).where(
                TransactionRecord.transaction_id == "TXN_DB_002"
            )
        )
        risk_one = db.scalar(
            select(RiskAssessment).where(RiskAssessment.transaction_id == "TXN_DB_001")
        )
        risk_two = db.scalar(
            select(RiskAssessment).where(RiskAssessment.transaction_id == "TXN_DB_002")
        )
        user_one = db.scalar(select(User).where(User.user_id == "USR_DB_001"))
        print("TXN1", txn_one.transaction_id, float(txn_one.amount), txn_one.user_id)
        print(
            "RISK1",
            float(risk_one.composite_score),
            risk_one.decision,
            risk_one.model_version,
        )
        print("TXN2", txn_two.transaction_id, float(txn_two.amount))
        print("RISK2", float(risk_two.composite_score), risk_two.decision)
        assert txn_one.transaction_id != txn_two.transaction_id
        assert user_one is not None
        assert float(risk_one.composite_score) == first_body["composite_score"]
        assert risk_one.decision == first_body["decision"]
        assert float(risk_two.composite_score) == second_body["composite_score"]
        assert risk_two.decision == second_body["decision"]
    finally:
        db.close()

    health = client.get("/health")
    print("HEALTH", health.status_code, health.json())
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    print("ALL_PASS")


if __name__ == "__main__":
    main()
