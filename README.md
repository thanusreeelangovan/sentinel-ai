# SentinelAI

SentinelAI is a hackathon prototype for pre-authorization fraud risk evaluation in UPI and digital payment flows. It evaluates transaction and contextual signals before final authorization so suspicious payments can receive step-up verification or be intercepted before normal fund dispatch.

## Implemented Risk Flow

| Composite score | Risk level | Backend decision | Prototype action |
|---:|---|---|---|
| <= 40 | LOW | `APPROVE` | Proceed normally |
| > 40 to 75 | MEDIUM | `VERIFY` | Step-up verification |
| > 75 | HIGH | `BLOCK` | Intercept and show high-risk warning |

The composite risk score uses 40% Isolation Forest anomaly, 25% velocity, 20% receiver and 15% behavioral signals. The explanation layer describes the completed risk result and does not independently score transactions.

## Tech Stack

* Frontend: React, TypeScript, Vite, Tailwind CSS
* Backend: Python, FastAPI, REST APIs, SQLAlchemy
* Database: PostgreSQL 16
* Anomaly detection: scikit-learn Isolation Forest
* Deployment: Docker and Docker Compose, with Nginx serving the production frontend build

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
Frontend: https://sentinel-ai-1-5u3s.onrender.com
Backend:  https://sentinel-ai-wmfu.onrender.com
Swagger:  https://sentinel-ai-wmfu.onrender.com/docs
Health:   https://sentinel-ai-wmfu.onrender.com/health
```

Docker Compose starts PostgreSQL, waits for database health, starts FastAPI, waits for backend health, and then starts the frontend. PostgreSQL data is stored in the named `postgres_data` volume.

## Documentation

See `docs/` for the API contract, architecture, database schema, demo scenario, ML contract and risk-engine contract.

## Prototype Scope

SentinelAI demonstrates the architecture and behavior of a pre-authorization fraud prevention layer. It is not a production UPI switch, bank authorization system, or independently validated production fraud model. Performance and accuracy claims should be based only on measured prototype results.
