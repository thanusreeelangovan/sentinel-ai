"""Deterministic synthetic baseline transactions for Isolation Forest training.

This is generated demo data, not real banking or UPI traffic.
Replace this module later with the team's synthetic/real training set.
"""

from copy import deepcopy

_NORMAL_TEMPLATE = {
    "currency": "INR",
    "receiver_type": "merchant",
    "device_type": "android",
    "ip_address": "192.168.1.10",
    "user_context": {
        "usual_transaction_range": {"min": 100.0, "max": 5000.0},
    },
}


def load_training_transactions() -> list[dict]:
    transactions: list[dict] = []
    for index in range(240):
        item = deepcopy(_NORMAL_TEMPLATE)
        day = (index % 28) + 1
        hour = 9 + (index % 10)
        amount = 400.0 + (index % 40) * 80.0
        account_age_days = 120 + (index % 50) * 8
        previous_transaction_count = 40 + (index % 30) * 4
        item.update(
            {
                "transaction_id": f"SYN_{index:04d}",
                "user_id": f"USR_{index % 40:03d}",
                "amount": amount,
                "receiver_id": f"REC_{index % 25:03d}",
                "timestamp": f"2026-08-{day:02d}T{hour:02d}:15:30+05:30",
                "device_id": f"DEV_{index % 12:03d}",
                "location": {
                    "latitude": 12.90 + (index % 10) * 0.01,
                    "longitude": 77.55 + (index % 10) * 0.01,
                },
            }
        )
        item["user_context"]["account_age_days"] = account_age_days
        item["user_context"]["previous_transaction_count"] = previous_transaction_count
        if index % 5 == 0:
            item["device_type"] = "ios"
        if index % 7 == 0:
            item["receiver_type"] = "user"
        transactions.append(item)
    return transactions
