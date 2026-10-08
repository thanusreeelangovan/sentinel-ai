from copy import deepcopy


def test_account_takeover_is_hard_blocked_even_with_valid_transaction_shape(client):
    payload = {
        "transaction_id": "TXN_TAKEOVER_0308",
        "user_id": "USR_TAKEOVER_DEMO",
        "amount": 80000.0,
        "currency": "INR",
        "receiver_id": "xyz.receiver@upi",
        "receiver_name": "XYZ Receiver",
        "receiver_type": "unverified_p2p",
        "timestamp": "2026-10-09T03:08:00+05:30",
        "device_id": "DEV_APPL_IPHONE_15_PRO_ENCLAVE",
        "device_type": "ios",
        "device_name": "Apple iPhone 15 Pro",
        "location": {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "city": "Bengaluru",
            "country": "IND",
        },
        "ip_address": "49.207.214.88",
        "user_context": {
            "account_age_days": 580,
            "previous_transaction_count": 312,
            "usual_transaction_range": {"min": 150.0, "max": 5000.0},
        },
        "note": "Night transfer",
    }

    response = client.post("/transactions/evaluate", json=deepcopy(payload))
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["decision"] == "BLOCK"
    assert body["risk_level"] == "HIGH"
    assert body["policy_applied"] == "POLICY_ACCOUNT_TAKEOVER_HARD_BLOCK"
    assert "ACCOUNT_TAKEOVER_SUSPECTED" in body["reason_codes"]
    assert "UNUSUAL_HOUR" in body["reason_codes"]
    assert "UNUSUAL_AMOUNT" in body["reason_codes"]
    assert "NEW_RECEIVER" in body["reason_codes"]
