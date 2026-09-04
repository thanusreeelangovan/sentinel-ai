"""Synthetic normal-transaction baseline used to fit Isolation Forest."""

from datetime import datetime, timezone


def load_training_transactions() -> list[dict]:
    rows: list[dict] = []
    for index in range(400):
        hour = 9 + (index % 10)
        rows.append(
            {
                "transaction_id": f"TXN_BASE_{index:04d}",
                "user_id": f"USR_BASE_{index % 40:03d}",
                "amount": 250.0 + (index % 40) * 80.0,
                "currency": "INR",
                "receiver_id": f"REC_{index % 25:03d}",
                "receiver_type": "merchant" if index % 3 else "user",
                "timestamp": datetime(2026, 3, 12, hour, 15, 0, tzinfo=timezone.utc).isoformat(),
                "device_id": f"DEV_{index % 12:03d}",
                "device_type": "android" if index % 2 else "ios",
                "location": {
                    "latitude": 12.95 + (index % 8) * 0.01,
                    "longitude": 77.58 + (index % 6) * 0.01,
                },
                "ip_address": f"49.207.10.{1 + (index % 200)}",
                "user_context": {
                    "account_age_days": 90 + (index % 400),
                    "previous_transaction_count": 20 + (index % 180),
                    "usual_transaction_range": {"min": 100.0, "max": 5000.0},
                },
            }
        )
    return rows
