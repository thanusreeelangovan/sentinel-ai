
### 3. `docs/database-schema.md`

```markdown
# SentinelAI Database Schema

## 1. Overview

PostgreSQL is the intended persistence layer for SentinelAI.

The database stores transaction information, risk assessments, rule events, and audit records.

## 2. Users

Table: users

| Column | Type | Constraint |
|---|---|---|
| id | UUID | Primary Key |
| user_id | VARCHAR | Unique |
| account_age_days | INTEGER | |
| created_at | TIMESTAMP | |

The users table stores basic sender information required for behavioral analysis.

## 3. Transactions

Table: transactions

| Column | Type | Constraint |
|---|---|---|
| id | UUID | Primary Key |
| transaction_id | VARCHAR | Unique |
| user_id | UUID | Foreign Key |
| amount | DECIMAL | |
| currency | VARCHAR | |
| receiver_id | VARCHAR | |
| receiver_type | VARCHAR | |
| timestamp | TIMESTAMP | |
| device_id | VARCHAR | |
| device_type | VARCHAR | |
| latitude | DECIMAL | Nullable |
| longitude | DECIMAL | Nullable |
| ip_address | VARCHAR | Nullable |
| created_at | TIMESTAMP | |

This table stores the original transaction context.

## 4. Risk Assessments

Table: risk_assessments

| Column | Type | Constraint |
|---|---|---|
| id | UUID | Primary Key |
| transaction_id | UUID | Foreign Key |
| anomaly_score | DECIMAL | |
| velocity_score | DECIMAL | |
| receiver_score | DECIMAL | |
| behavioral_score | DECIMAL | |
| composite_score | DECIMAL | |
| decision | VARCHAR | |
| model_version | VARCHAR | |
| evaluated_at | TIMESTAMP | |

This table stores the risk analysis associated with each transaction.

## 5. Rule Events

Table: rule_events

| Column | Type | Constraint |
|---|---|---|
| id | UUID | Primary Key |
| transaction_id | UUID | Foreign Key |
| rule_code | VARCHAR | |
| rule_name | VARCHAR | |
| score | DECIMAL | |
| reason | TEXT | |
| created_at | TIMESTAMP | |

This table stores individual rules triggered during transaction evaluation.

## 6. Audit Logs

Table: audit_logs

| Column | Type | Constraint |
|---|---|---|
| id | UUID | Primary Key |
| transaction_id | UUID | Foreign Key |
| event_type | VARCHAR | |
| decision | VARCHAR | |
| risk_score | DECIMAL | |
| details | JSONB | |
| created_at | TIMESTAMP | |

The audit log provides a trace of transaction evaluation and decision making.

## 7. Relationships

```text
users
  |
  +----< transactions
             |
             +---- risk_assessments
             |
             +----< rule_events
             |
             +----< audit_logs