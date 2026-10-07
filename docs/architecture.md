# SentinelAI Architecture

## Purpose

SentinelAI is a pre-authorization fraud risk layer for UPI and digital payment flows. A transaction is evaluated before final fund dispatch so suspicious activity can trigger additional verification or blocking.

## Request Flow

```text
Payment / UPI transaction request
            |
            v
FastAPI API layer
            |
            v
Transaction validation and context intake
            |
            v
Rule engine + feature extraction
            |
            +--------------------+
            |                    |
            v                    v
Isolation Forest anomaly     Rule-based signals
score                       velocity / receiver /
                            behavioral
            |                    |
            +---------+----------+
                      v
              Composite risk score
                      |
                      v
             Decision classification
        APPROVE <= 40
        VERIFY  40 < score <= 75
        BLOCK   > 75
                      |
                      v
       Explanation + recommended policy
                      |
                      v
      Persist transaction, assessment,
      rule/anomaly evidence and audit data
                      |
                      v
            API response to frontend
```

## Core Components

### Frontend

The frontend is a React, TypeScript and Vite application. It consumes the FastAPI backend and presents transaction state, risk information, explanations and verification or warning flows.

### Backend API

The backend uses FastAPI and exposes transaction evaluation, transaction history, risk-detail, reporting, account and dashboard endpoints. Pydantic schemas validate incoming and outgoing payloads.

### Rule Engine

The rule engine produces contextual scores including velocity, receiver and behavioral risk signals. These scores are combined with the anomaly score rather than treated as an independent final decision.

### ML Anomaly Detection

The implemented anomaly detector is an `IsolationForest` model from scikit-learn. The service trains from the repository's baseline training transaction data and normalizes anomaly output to a 0 to 100 score.

### Composite Risk Engine

The current implemented weighting is:

| Signal | Weight |
|---|---:|
| Anomaly | 40% |
| Velocity | 25% |
| Receiver | 20% |
| Behavioral | 15% |

The weighted result is rounded to one decimal place and mapped to `APPROVE`, `VERIFY` or `BLOCK`.

### Explainability Layer

The `explanation_reason` module operates on an already generated risk result. It does not independently score the transaction. It creates user-facing minimal and smartphone explanations from the decision, reason codes, risk breakdown, score and model-based feature contribution information.

### Persistence

Evaluated transactions and their associated risk evidence are stored through SQLAlchemy in PostgreSQL. Evaluation persistence is committed before a successful response is returned.

## Deployment Architecture

The repository includes a Docker Compose deployment with three services:

```text
Browser
  |
  v
Frontend container
React/Vite build served by Nginx
port 3000
  |
  v
Backend container
FastAPI + Uvicorn
port 8000
  |
  v
PostgreSQL 16 container
persistent postgres_data volume
```

Docker Compose waits for PostgreSQL health before starting the backend and waits for backend health before starting the frontend. Runtime configuration is provided through environment variables such as `POSTGRES_PASSWORD`, `DATABASE_URL`, `CORS_ORIGINS`, `VITE_API_URL`, `BACKEND_PORT` and `FRONTEND_PORT`.

## Current Scope

SentinelAI is a hackathon prototype. It demonstrates pre-authorization risk evaluation, explainable decisions, persistence, transaction reporting and Dockerized deployment. It should not be represented as a production banking authorization system or as a replacement for regulated payment infrastructure.
