# SentinelAI

SentinelAI is a hackathon prototype for pre-authorization fraud risk evaluation in UPI and digital payment flows. It evaluates transaction and contextual signals before the prototype's simulated payment continuation so suspicious payments can receive step-up verification or be intercepted for review.

## Implemented Risk Flow

| Composite score | Risk level | Backend decision | Prototype action |
|---:|---|---|---|
| <= 40 | LOW | `APPROVE` | Proceed normally |
| > 40 to 75 | MEDIUM | `VERIFY` | Step-up verification |
feat/explainable-risk-interception
| > 75 | HIGH | `BLOCK` recommendation | Intercept, explain the risk, and require explicit acknowledgement plus step-up verification to continue |
| > 75 | HIGH | `BLOCK` risk recommendation | Intercept, explain the risk, and require an explicit verified user override to continue in the prototype |
main

The composite risk score uses 40% Isolation Forest anomaly, 25% velocity, 20% receiver and 15% behavioral signals. LOW recommends approval with minimal friction; MEDIUM recommends verification; HIGH/BLOCK recommends stopping the payment. HIGH is not an irreversible prototype-level system block: a user who explicitly recognises the payment can continue after step-up authentication. The original score and BLOCK recommendation remain unchanged for explanation and audit.

The FastAPI response includes Tree SHAP contributions for the fitted Isolation Forest anomaly component only. When Tree SHAP cannot run, the backend reports `ABLATION_FALLBACK`; these values are never presented as SHAP. Velocity, receiver and behavioral risk remain separately calculated rule-based components. If FastAPI is unavailable, the simulator clearly labels its deterministic heuristic result `LOCAL DEMO ENGINE`; reporting still requires the configured reporting API.

The HIGH tier is a strong risk-engine recommendation to stop the payment. In the prototype consumer flow, the user may still continue only after reading the warning and completing step-up verification. This keeps the final authorization with the verified user while preserving the risk recommendation for audit and explanation.

The Isolation Forest explanation uses Tree SHAP when available. SHAP is scoped only to the anomaly model. Rule-based velocity, receiver and behavioral scores are shown separately and are not presented as SHAP output.

## Tech Stack

* Frontend: React, TypeScript, Vite, Tailwind CSS
* Backend: Python, FastAPI, REST APIs, SQLAlchemy
* Database: PostgreSQL 16
* Anomaly detection: scikit-learn Isolation Forest
* Model explanation: SHAP `TreeExplainer` for Isolation Forest, with a labelled training-mean ablation fallback
* Risk policy: weighted composite score and contextual rule-based velocity, receiver and behavioral signals
* Persistence: PostgreSQL-backed transaction assessments, audit evidence and receiver reports
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
`VITE_API_URL` must point to the browser-reachable FastAPI base URL for a deployed frontend. The localhost value in `.env.example` is for local development only. A production build without this setting can still fall back to the local demo for evaluation, but receiver reporting fails visibly instead of posting to the frontend origin or localhost.

## Prototype verification

The secondary step-up screen uses demonstration PIN `4092`. The fingerprint control is a simulated prototype interaction, not biometric verification. A successful high-risk continuation produces a receipt that identifies the original `BLOCK` recommendation and records that the user acknowledged it after demo-PIN verification; it does not rescore or rewrite the recommendation.

Receiver reports are stored by the FastAPI backend with sender, receiver, transaction context, risk score, optional transaction ID and a generated report reference. They are prototype review records; the prototype does not submit reports to NPCI or other financial networks.

## Continuous integration

GitHub Actions builds the frontend with TypeScript and Vite and runs the backend test suite against PostgreSQL on pushes and pull requests. Configure the repository's branch protection to require the `Frontend build` and `Backend tests` checks before merging.

## Documentation

See `docs/` for the API contract, architecture, database schema, demo scenario, ML contract and risk-engine contract.

## Prototype Scope

SentinelAI is an explainable, risk-adaptive pre-authorization layer that demonstrates how transaction context can determine proportional user intervention. It is not a replacement for banks, NPCI, UPI infrastructure or regulated fraud platforms; it does not authorize or route real payments. The Isolation Forest uses repository baseline data and has not been independently validated against production traffic. Performance and accuracy claims should be based only on measured prototype results.
