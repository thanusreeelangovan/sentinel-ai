# SentinelAI Database Schema

## Database

The deployed development stack uses PostgreSQL 16. SQLAlchemy models define the persisted schema and the backend connects through `DATABASE_URL`.

## Core Tables

### `users`

Stores user records referenced by evaluated transactions.

### `transactions`

Stores the transaction submitted for evaluation. Important fields include:

| Field | Purpose |
|---|---|
| `transaction_id` | Unique external transaction identifier |
| `user_id` | User reference |
| `amount`, `currency` | Payment value |
| `receiver_id`, `receiver_type` | Receiver context |
| `timestamp` | Transaction time |
| `device_id`, `device_type` | Device context |
| `latitude`, `longitude` | Optional location context |
| `ip_address` | Optional network context |
| `created_at` | Persistence timestamp |

### `risk_assessments`

Stores the risk result associated with a transaction, including anomaly, velocity, receiver and behavioral scores, the composite score, decision, model version and evaluation timestamp.

### `rule_events`

Stores rule-engine evidence associated with transaction evaluation.

### `audit_logs`

Stores auditable events associated with transactions. User transaction reports are persisted as audit events with event type `REPORT`. Reporting is idempotent at the service level: a previously reported transaction returns an already-reported response rather than adding another report event.

## Investigation Context Tables

The backend also defines persistence models for the additional investigation context implemented during the hackathon:

| Table / model area | Purpose |
|---|---|
| `login_events` | Login behavior evidence |
| `device_events` | Device activity evidence |
| `ip_network_events` | IP and network evidence |
| `investigation_cases` | Case-history / investigation context |

These records support investigation and account context. Their existence should not be confused with separate ML models.

## Relationships

```text
users
  |
  +---- transactions
           |
           +---- risk_assessments
           +---- rule_events
           +---- audit_logs

users / accounts
  |
  +---- login events
  +---- device events
  +---- IP/network events
  +---- investigation cases
```

The exact foreign-key definitions in the SQLAlchemy models are the source of truth.

## Persistence Behavior

`POST /transactions/evaluate` persists the evaluated transaction and its risk evidence. The evaluation service explicitly commits the database transaction before returning the successful API response, so a subsequent read can observe the persisted record.

`POST /transactions/{transaction_id}/report` records a report event without recalculating the transaction risk score.

## Docker Persistence

Docker Compose mounts PostgreSQL data at the named volume `postgres_data`, so database state survives normal container recreation unless the volume itself is removed.
