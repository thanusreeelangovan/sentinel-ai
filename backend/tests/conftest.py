"""Shared test fixtures for investigation evidence APIs."""

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

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_session_factory, init_db
from app.main import app
from app.seed import seed_evidence_data


@pytest.fixture
def client():
    init_db()
    db = get_session_factory()()
    try:
        seed_evidence_data(db)
    finally:
        db.close()

    with TestClient(app) as test_client:
        yield test_client
