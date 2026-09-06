# SentinelAI API Contract

This document describes the current hackathon backend implementation. The official decision vocabulary is `APPROVE`, `VERIFY`, `BLOCK`.

## Core Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health |
| POST | `/evaluate` | Compatibility evaluation route |
| POST | `/transactions/evaluate` | Evaluate and persist a transaction |
| GET | `/transactions` | List persisted evaluations |
| GET | `/transactions/{transaction_id}` | Read one persisted evaluation |
| GET | `/transactions/{transaction_id}/risk-details` | Detailed explanation / risk evidence |
| POST | `/transactions/{transaction_id}/report` | Report an evaluated transaction |
| GET | `/dashboard/summary` | Database-backed summary |
| GET | `/dashboard/risk-distribution` | Decision distribution |

The backend also contains account and lookup routes used for investigation context. FastAPI `/docs` is the runtime source for the complete generated OpenAPI surface.

## Health

```http
GET /health
```

```json
{"status":"ok"}
```

## Evaluate Transaction

```http
POST /transactions/evaluate
Content-Type: application/json
```

Representative request:

```json
{
  "transaction_id": "TXN_000001",
  "user_id": "USR_001",
  "amount": 2500.0,
  "currency": "INR",
  "receiver_id": "REC_045",
  "receiver_name": "Demo Merchant",
  "receiver_type": "merchant",
  "timestamp": "2026-09-04T10:15:30+05:30",
  "device_id": "DEV_019",
  "device_type": "android",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "city": "Bengaluru",
    "country": "India"
  },
  "ip_address": "192.168.1.10",
  "user_context": {
    "account_age_days": 420,
    "previous_transaction_count": 157,
    "usual_transaction_range": {
      "min": 100.0,
      "max": 5000.0
    }
  },
  "note": "demo payment"
}
```

Invalid payloads return HTTP 422.

The response contains the transaction identifier, composite score, `LOW`, `MEDIUM` or `HIGH` risk level, decision, four-part risk breakdown, reason codes, explanation, applied prototype policy, model version, evaluation timestamp, measured request latency, presentation signals, risk score and minimal explanation.

Decision thresholds:

| Score | Risk level | Decision |
|---:|---|---|
| <= 40 | LOW | `APPROVE` |
| > 40 and <= 75 | MEDIUM | `VERIFY` |
| > 75 | HIGH | `BLOCK` |

A successful evaluation is persisted and committed before the response is returned.

## Transaction Reads

```http
GET /transactions
GET /transactions/{transaction_id}
```

The list endpoint returns persisted evaluations newest first. A missing transaction identifier returns:

```json
{"detail":"Transaction not found"}
```

with HTTP 404.

## Detailed Risk Explanation

```http
GET /transactions/{transaction_id}/risk-details
```

Returns the detailed explanation representation generated from persisted risk information. A missing transaction returns HTTP 404.

## Report Transaction

```http
POST /transactions/{transaction_id}/report
```

Successful first report:

```json
{
  "transaction_id": "TXN_000001",
  "reported": true,
  "message": "Transaction reported successfully."
}
```

Repeated report:

```json
{
  "transaction_id": "TXN_000001",
  "reported": true,
  "message": "Transaction was already reported."
}
```

Reporting records an audit event and does not rescore the transaction. Missing transactions return HTTP 404.

## Dashboard

```http
GET /dashboard/summary
GET /dashboard/risk-distribution
```

These endpoints derive their values from persisted transaction data rather than hard-coded frontend counters.

## Interactive API

When the backend is running locally, FastAPI exposes Swagger UI at `/docs`. Use this during development and as a fallback live-demo interface.
