# SentinelAI API Contract

This document matches the Phase 1 backend implementation.

Official decision vocabulary: `APPROVE`, `VERIFY`, `BLOCK`.

## Endpoints

| Method | Path |
|---|---|
| GET | `/health` |
| POST | `/transactions/evaluate` |
| GET | `/transactions` |
| GET | `/transactions/{transaction_id}` |
| GET | `/dashboard/summary` |
| GET | `/dashboard/risk-distribution` |

## GET /health

```json
{"status": "ok"}
```

## POST /transactions/evaluate

### Request

Required fields: `transaction_id`, `user_id`, `amount`, `currency`, `receiver_id`, `receiver_type`, `timestamp`, `device_id`, `device_type`, `user_context.account_age_days`, `user_context.previous_transaction_count`, `user_context.usual_transaction_range`.

Optional: `location.latitude`, `location.longitude`, `ip_address`.

```json
{
  "transaction_id": "TXN_000001",
  "user_id": "USR_001",
  "amount": 2500.00,
  "currency": "INR",
  "receiver_id": "REC_045",
  "receiver_type": "merchant",
  "timestamp": "2026-09-03T10:15:30+05:30",
  "device_id": "DEV_019",
  "device_type": "android",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "ip_address": "192.168.1.10",
  "user_context": {
    "account_age_days": 420,
    "previous_transaction_count": 157,
    "usual_transaction_range": {
      "min": 100.0,
      "max": 5000.0
    }
  }
}
```

Invalid requests return HTTP 422.

### Response

```json
{
  "transaction_id": "TXN_000001",
  "composite_score": 16.2,
  "decision": "APPROVE",
  "risk_breakdown": {
    "anomaly": 30.0,
    "velocity": 10.0,
    "receiver": 5.0,
    "behavioral": 5.0
  },
  "reason_codes": []
}
```

## GET /transactions

Returns persisted evaluations, newest first.

Each item:

```json
{
  "transaction_id": "TXN_000001",
  "user_id": "USR_001",
  "amount": 2500.0,
  "currency": "INR",
  "receiver_id": "REC_045",
  "timestamp": "2026-09-03T10:15:30+05:30",
  "composite_score": 16.2,
  "decision": "APPROVE",
  "risk_breakdown": {
    "anomaly": 30.0,
    "velocity": 10.0,
    "receiver": 5.0,
    "behavioral": 5.0
  },
  "reason_codes": []
}
```

## GET /transactions/{transaction_id}

Same item shape as above.

Missing id: HTTP 404 `{"detail": "Transaction not found"}`.

## GET /dashboard/summary

```json
{
  "total_transactions": 5,
  "decisions": {
    "APPROVE": 3,
    "VERIFY": 0,
    "BLOCK": 2
  }
}
```

## GET /dashboard/risk-distribution

```json
{
  "APPROVE": 3,
  "VERIFY": 0,
  "BLOCK": 2
}
```
