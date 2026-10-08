# SentinelAI

SentinelAI is a hackathon prototype for pre-authorization fraud risk evaluation in UPI and digital payment flows. It evaluates transaction and contextual signals before final authorization so suspicious payments can receive step-up verification or be intercepted before normal fund dispatch.

## Implemented Risk Flow

| Composite score | Risk level | Backend decision | Prototype action |
|---:|---|---|---|
| <= 40 | LOW | `APPROVE` | Proceed normally |
| > 40 to 75 | MEDIUM | `VERIFY` | Step-up verification |
| > 75 | HIGH | `BLOCK` | Intercept and show high-risk warning |
| Takeover pattern | HIGH | `BLOCK` | Hard block; UPI PIN cannot override |

A dedicated account-takeover policy hard-blocks transactions that combine an unusual overnight hour, an extreme amount relative to the user's normal range, and a new/high-risk receiver. This policy can override the normal weighted threshold because valid credentials alone are not treated as proof of legitimate intent.

The composite risk score uses 40% Isolation Forest anomaly, 25% velocity, 20% receiver and 15% behavioral signals. The explanation layer describes the completed risk result and does not independently score transactions.

## Tech Stack

* Frontend: React, TypeScript, Vite, Tailwind CSS
* Backend: Python, FastAPI, REST APIs, SQLAlchemy
* Database: PostgreSQL 16
* Anomaly detection: scikit-learn Isolation Forest
* Deployment: Docker and Docker Compose, with Nginx serving the production frontend build

## Live Deployment

- Frontend: https://sentinel-ai-1-5u3s.onrender.com
- Backend API: https://sentinel-ai-wmfu.onrender.com
- Swagger / OpenAPI: https://sentinel-ai-wmfu.onrender.com/docs
- Health check: https://sentinel-ai-wmfu.onrender.com/health

The hosted frontend is built from `main` and points to the deployed FastAPI service. SentinelAI runs the realistic UPI-style payment experience with demo payees inside Contacts, PIN-gated balance and transaction details, LOW/MEDIUM/HIGH intervention flows, account-takeover hard blocking, reporting, receiver blocking, and receipt generation.

## Account Takeover & MFA Demo

The portfolio demo includes a controlled account-takeover scenario:

- 3:08 AM transaction
- ₹80,000 to a new/unverified receiver
- correct UPI PIN is assumed to be compromised
- SentinelAI applies `POLICY_ACCOUNT_TAKEOVER_HARD_BLOCK`
- there is no "continue anyway" path
- **Secure my account** requires an independent six-digit demo MFA factor
- successful recovery blocks the suspicious receiver and freezes payments for the current demo session

Demo recovery code: `731904`

The recovery factor is intentionally labelled as a simulation. In a production integration, SentinelAI would rely on a bank/PSP-controlled passkey, trusted-device approval, or equivalent independent authentication factor. SentinelAI should never treat re-entering an already-compromised UPI PIN as account recovery.

## Docker Deployment

Copy the environment example and provide a PostgreSQL password:

```bash
cp .env.example .env
```

Then start the complete stack:

```bash
docker compose up --build
```

Default local services:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
Health:   http://localhost:8000/health
```

Docker Compose starts PostgreSQL, waits for database health, starts FastAPI, waits for backend health, and then starts the frontend. PostgreSQL data is stored in the named `postgres_data` volume.

## Documentation

See `docs/` for the API contract, architecture, database schema, demo scenario, ML contract and risk-engine contract.

## Prototype Scope

SentinelAI demonstrates the architecture and behavior of a pre-authorization fraud prevention layer. It is not a production UPI switch, bank authorization system, production identity provider, or independently validated fraud model. The fixed UPI PIN and MFA code exist only for demonstration; real PIN validation and recovery factors would remain with the bank/PSP. Performance, security, and accuracy claims should be based only on measured prototype results.
