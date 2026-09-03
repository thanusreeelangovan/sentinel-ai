"""Deterministic synthetic dataset for investigation evidence APIs."""

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.device_event import DeviceEvent
from app.models.investigation_case import InvestigationCase
from app.models.ip_network_event import IpNetworkEvent
from app.models.login_event import LoginEvent
from app.models.risk_assessment import RiskAssessment
from app.models.rule_event import RuleEvent
from app.models.transaction import TransactionRecord
from app.models.user import User

TEST_ACCOUNT_IDS = ("ACC001", "ACC002", "ACC003", "ACC004", "ACC005")
EMPTY_EVIDENCE_ACCOUNT_ID = "ACC005"
PRIMARY_EVIDENCE_ACCOUNT_ID = "ACC001"
NONEXISTENT_ACCOUNT_ID = "ACC999"
TXN_PREFIX = "TXN_TEST_"
LOGIN_PREFIX = "LGN_TEST_"
DEVICE_EVENT_PREFIX = "DEV_EVT_TEST_"
IP_EVENT_PREFIX = "IP_EVT_TEST_"
CASE_PREFIX = "CASE_TEST_"
SHARED_DEVICE_ID = "DEV_TEST_01"
SHARED_IP_ADDRESS = "203.0.113.10"


def _ts(year: int, month: int, day: int, hour: int, minute: int) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


def _clear_synthetic_test_data(db: Session) -> None:
    db.execute(delete(RiskAssessment).where(RiskAssessment.transaction_id.like(f"{TXN_PREFIX}%")))
    db.execute(delete(RuleEvent).where(RuleEvent.transaction_id.like(f"{TXN_PREFIX}%")))
    db.execute(delete(AuditLog).where(AuditLog.transaction_id.like(f"{TXN_PREFIX}%")))
    db.execute(delete(TransactionRecord).where(TransactionRecord.transaction_id.like(f"{TXN_PREFIX}%")))
    db.execute(delete(TransactionRecord).where(TransactionRecord.user_id.in_(TEST_ACCOUNT_IDS)))
    db.execute(delete(LoginEvent).where(LoginEvent.login_event_id.like(f"{LOGIN_PREFIX}%")))
    db.execute(delete(DeviceEvent).where(DeviceEvent.event_id.like(f"{DEVICE_EVENT_PREFIX}%")))
    db.execute(delete(IpNetworkEvent).where(IpNetworkEvent.event_id.like(f"{IP_EVENT_PREFIX}%")))
    db.execute(delete(InvestigationCase).where(InvestigationCase.case_id.like(f"{CASE_PREFIX}%")))
    db.execute(delete(User).where(User.user_id.in_(TEST_ACCOUNT_IDS)))
    db.flush()


def seed_evidence_data(db: Session) -> dict[str, int]:
    _clear_synthetic_test_data(db)
    db.add_all(
        [
            User(user_id="ACC001", account_age_days=400),
            User(user_id="ACC002", account_age_days=250),
            User(user_id="ACC003", account_age_days=180),
            User(user_id="ACC004", account_age_days=90),
            User(user_id="ACC005", account_age_days=30),
        ]
    )
    db.flush()
    db.add_all(
        [
            TransactionRecord(
                transaction_id="TXN_TEST_001",
                user_id="ACC001",
                amount=2500.00,
                currency="INR",
                receiver_id="MER_100",
                receiver_type="merchant",
                timestamp=_ts(2026, 8, 1, 9, 0),
                device_id="DEV_TEST_01",
                device_type="android",
                latitude=12.9716,
                longitude=77.5946,
                ip_address="203.0.113.10",
            ),
            TransactionRecord(
                transaction_id="TXN_TEST_002",
                user_id="ACC001",
                amount=800.00,
                currency="INR",
                receiver_id="ACC002",
                receiver_type="user",
                timestamp=_ts(2026, 8, 1, 11, 0),
                device_id="DEV_TEST_01",
                device_type="android",
                ip_address="203.0.113.10",
            ),
            TransactionRecord(
                transaction_id="TXN_TEST_003",
                user_id="ACC001",
                amount=15000.00,
                currency="INR",
                receiver_id="MER_100",
                receiver_type="merchant",
                timestamp=_ts(2026, 8, 2, 16, 45),
                device_id="DEV_TEST_01",
                device_type="android",
                latitude=12.9716,
                longitude=77.5946,
                ip_address="203.0.113.10",
            ),
            TransactionRecord(
                transaction_id="TXN_TEST_004",
                user_id="ACC002",
                amount=500.00,
                currency="INR",
                receiver_id="ACC001",
                receiver_type="user",
                timestamp=_ts(2026, 8, 3, 10, 15),
                device_id="DEV_TEST_02",
                device_type="ios",
                ip_address="203.0.113.11",
            ),
            TransactionRecord(
                transaction_id="TXN_TEST_005",
                user_id="ACC002",
                amount=1200.00,
                currency="INR",
                receiver_id="MER_200",
                receiver_type="merchant",
                timestamp=_ts(2026, 8, 3, 10, 40),
                device_id="DEV_TEST_02",
                device_type="ios",
                ip_address="203.0.113.11",
            ),
            TransactionRecord(
                transaction_id="TXN_TEST_006",
                user_id="ACC003",
                amount=3400.00,
                currency="INR",
                receiver_id="MER_100",
                receiver_type="merchant",
                timestamp=_ts(2026, 8, 4, 8, 20),
                device_id="DEV_TEST_01",
                device_type="android",
                ip_address="203.0.113.10",
            ),
            TransactionRecord(
                transaction_id="TXN_TEST_007",
                user_id="ACC003",
                amount=950.00,
                currency="INR",
                receiver_id="ACC004",
                receiver_type="user",
                timestamp=_ts(2026, 8, 4, 18, 0),
                device_id="DEV_TEST_03",
                device_type="web",
                ip_address="198.51.100.20",
            ),
            TransactionRecord(
                transaction_id="TXN_TEST_008",
                user_id="ACC004",
                amount=2200.00,
                currency="INR",
                receiver_id="MER_300",
                receiver_type="merchant",
                timestamp=_ts(2026, 8, 5, 12, 0),
                device_id="DEV_TEST_04",
                device_type="android",
                ip_address="198.51.100.30",
            ),
        ]
    )
    db.add_all(
        [
            LoginEvent(
                login_event_id="LGN_TEST_001",
                account_id="ACC001",
                timestamp=_ts(2026, 8, 1, 8, 50),
                ip_address="203.0.113.10",
                device_id="DEV_TEST_01",
                success=True,
                extra_metadata={"method": "password"},
            ),
            LoginEvent(
                login_event_id="LGN_TEST_002",
                account_id="ACC001",
                timestamp=_ts(2026, 7, 31, 22, 10),
                ip_address="203.0.113.99",
                device_id="DEV_TEST_01",
                success=False,
                extra_metadata={"method": "password"},
            ),
            LoginEvent(
                login_event_id="LGN_TEST_003",
                account_id="ACC002",
                timestamp=_ts(2026, 8, 3, 10, 0),
                ip_address="203.0.113.11",
                device_id="DEV_TEST_02",
                success=True,
                extra_metadata={"method": "password"},
            ),
            LoginEvent(
                login_event_id="LGN_TEST_004",
                account_id="ACC002",
                timestamp=_ts(2026, 8, 3, 10, 5),
                ip_address="203.0.113.11",
                device_id="DEV_TEST_02",
                success=True,
                extra_metadata={"method": "otp"},
            ),
            LoginEvent(
                login_event_id="LGN_TEST_005",
                account_id="ACC003",
                timestamp=_ts(2026, 8, 4, 8, 0),
                ip_address="203.0.113.10",
                device_id="DEV_TEST_01",
                success=True,
                extra_metadata={"method": "password"},
            ),
            LoginEvent(
                login_event_id="LGN_TEST_006",
                account_id="ACC003",
                timestamp=_ts(2026, 8, 4, 7, 55),
                ip_address="198.51.100.20",
                device_id="DEV_TEST_03",
                success=False,
                extra_metadata={"method": "password"},
            ),
            LoginEvent(
                login_event_id="LGN_TEST_007",
                account_id="ACC004",
                timestamp=_ts(2026, 8, 5, 11, 50),
                ip_address="198.51.100.30",
                device_id="DEV_TEST_04",
                success=True,
                extra_metadata={"method": "password"},
            ),
        ]
    )
    db.add_all(
        [
            DeviceEvent(
                event_id="DEV_EVT_TEST_001",
                device_id="DEV_TEST_01",
                account_id="ACC001",
                timestamp=_ts(2026, 8, 1, 8, 50),
                activity="session_start",
                ip_address="203.0.113.10",
            ),
            DeviceEvent(
                event_id="DEV_EVT_TEST_002",
                device_id="DEV_TEST_01",
                account_id="ACC001",
                timestamp=_ts(2026, 8, 1, 8, 55),
                activity="app_foreground",
                ip_address="203.0.113.10",
            ),
            DeviceEvent(
                event_id="DEV_EVT_TEST_003",
                device_id="DEV_TEST_02",
                account_id="ACC002",
                timestamp=_ts(2026, 8, 3, 10, 0),
                activity="session_start",
                ip_address="203.0.113.11",
            ),
            DeviceEvent(
                event_id="DEV_EVT_TEST_004",
                device_id="DEV_TEST_01",
                account_id="ACC003",
                timestamp=_ts(2026, 8, 4, 8, 0),
                activity="session_start",
                ip_address="203.0.113.10",
            ),
            DeviceEvent(
                event_id="DEV_EVT_TEST_005",
                device_id="DEV_TEST_03",
                account_id="ACC003",
                timestamp=_ts(2026, 8, 4, 17, 50),
                activity="session_start",
                ip_address="198.51.100.20",
            ),
            DeviceEvent(
                event_id="DEV_EVT_TEST_006",
                device_id="DEV_TEST_04",
                account_id="ACC004",
                timestamp=_ts(2026, 8, 5, 11, 50),
                activity="session_start",
                ip_address="198.51.100.30",
            ),
        ]
    )
    db.add_all(
        [
            IpNetworkEvent(
                event_id="IP_EVT_TEST_001",
                ip_address="203.0.113.10",
                account_id="ACC001",
                timestamp=_ts(2026, 8, 1, 8, 50),
                activity="request",
                device_id="DEV_TEST_01",
            ),
            IpNetworkEvent(
                event_id="IP_EVT_TEST_002",
                ip_address="203.0.113.10",
                account_id="ACC001",
                timestamp=_ts(2026, 8, 1, 9, 0),
                activity="request",
                device_id="DEV_TEST_01",
            ),
            IpNetworkEvent(
                event_id="IP_EVT_TEST_003",
                ip_address="203.0.113.11",
                account_id="ACC002",
                timestamp=_ts(2026, 8, 3, 10, 0),
                activity="request",
                device_id="DEV_TEST_02",
            ),
            IpNetworkEvent(
                event_id="IP_EVT_TEST_004",
                ip_address="203.0.113.10",
                account_id="ACC003",
                timestamp=_ts(2026, 8, 4, 8, 0),
                activity="request",
                device_id="DEV_TEST_01",
            ),
            IpNetworkEvent(
                event_id="IP_EVT_TEST_005",
                ip_address="198.51.100.20",
                account_id="ACC003",
                timestamp=_ts(2026, 8, 4, 17, 50),
                activity="request",
                device_id="DEV_TEST_03",
            ),
            IpNetworkEvent(
                event_id="IP_EVT_TEST_006",
                ip_address="198.51.100.30",
                account_id="ACC004",
                timestamp=_ts(2026, 8, 5, 11, 50),
                activity="request",
                device_id="DEV_TEST_04",
            ),
        ]
    )
    db.add_all(
        [
            InvestigationCase(
                case_id="CASE_TEST_001",
                account_id="ACC001",
                status="closed",
                created_at=_ts(2026, 7, 1, 10, 0),
                closed_at=_ts(2026, 7, 3, 16, 0),
                outcome="cleared",
            ),
            InvestigationCase(
                case_id="CASE_TEST_002",
                account_id="ACC002",
                status="closed",
                created_at=_ts(2026, 6, 15, 9, 0),
                closed_at=_ts(2026, 6, 20, 14, 30),
                outcome="confirmed",
            ),
            InvestigationCase(
                case_id="CASE_TEST_003",
                account_id="ACC004",
                status="open",
                created_at=_ts(2026, 8, 1, 12, 0),
                closed_at=None,
                outcome=None,
            ),
        ]
    )
    db.commit()
    return summarize_seed(db)


def summarize_seed(db: Session) -> dict[str, int]:
    def _count(model, column, prefix: str) -> int:
        return int(
            db.scalar(select(func.count()).select_from(model).where(column.like(f"{prefix}%")))
        )

    return {
        "accounts": int(
            db.scalar(select(func.count()).select_from(User).where(User.user_id.in_(TEST_ACCOUNT_IDS)))
        ),
        "transactions": _count(TransactionRecord, TransactionRecord.transaction_id, TXN_PREFIX),
        "login_events": _count(LoginEvent, LoginEvent.login_event_id, LOGIN_PREFIX),
        "device_events": _count(DeviceEvent, DeviceEvent.event_id, DEVICE_EVENT_PREFIX),
        "ip_network_events": _count(IpNetworkEvent, IpNetworkEvent.event_id, IP_EVENT_PREFIX),
        "historical_cases": _count(InvestigationCase, InvestigationCase.case_id, CASE_PREFIX),
    }
