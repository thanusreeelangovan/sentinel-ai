"""CLI entry point for synthetic investigation evidence data."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.db.session import get_session_factory, init_db
from app.seed import seed_evidence_data


def main() -> None:
    init_db()
    db = get_session_factory()()
    try:
        counts = seed_evidence_data(db)
        print("Synthetic evidence seed complete:")
        for key, value in counts.items():
            print(f"  {key}: {value}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
