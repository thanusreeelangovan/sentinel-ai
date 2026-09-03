from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_database_url
from app.db.base import Base
from app.models import (  # noqa: F401
    audit_log,
    device_event,
    investigation_case,
    ip_network_event,
    login_event,
    risk_assessment,
    rule_event,
    transaction,
    user,
)

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url(), pool_pre_ping=True)
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(), autoflush=False, autocommit=False
        )
    return _SessionLocal


def init_db() -> None:
    Base.metadata.create_all(bind=get_engine())
    engine = get_engine()
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(
                text("CREATE INDEX IF NOT EXISTS ix_transactions_user_id ON transactions (user_id)")
            )


def get_db() -> Generator[Session, None, None]:
    db = get_session_factory()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
