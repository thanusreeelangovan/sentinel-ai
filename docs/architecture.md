# SentinelAI Architecture

## 1. Overview

SentinelAI is a pre authorization digital payment fraud detection system.

The system evaluates a transaction before authorization by combining:

- Transaction context
- Sender behavioral intelligence
- Receiver intelligence
- Rule based detection
- Machine learning anomaly detection
- Risk scoring
- Explainable decision making

The final decision is one of:

- APPROVE
- VERIFY
- BLOCK

## 2. High Level Architecture

Transaction Simulator
        |
        v
Shared Transaction JSON
        |
        v
FastAPI Backend
        |
        +----------------------+
        |                      |
        v                      v
Feature Engineering       Rule Engine
        |                      |
        v                      +--> Velocity Score
Isolation Forest              +--> Receiver Score
        |                      +--> Behavioral Score
        v                      +--> Reason Codes
Anomaly Score
        |                      |
        +----------+-----------+
                   |
                   v
              Risk Engine
                   |
                   v
          Composite Risk Score
                   |
                   v
            Decision Engine
                   |
          +--------+--------+
          |        |        |
          v        v        v
       APPROVE   VERIFY   BLOCK
                   |
                   v
              PostgreSQL
                   |
                   v
               Dashboard

## 3. Components

### Transaction Simulator

The transaction simulator generates transaction scenarios that can be sent to the backend.

It is used to demonstrate normal, suspicious, and high risk transactions.

### FastAPI Backend

The FastAPI backend acts as the main integration layer.

Responsibilities include:

- Receiving transaction requests
- Validating transaction data
- Calling analysis components
- Passing risk signals to the Risk Engine
- Passing the composite score to the Decision Engine
- Returning the final decision
- Persisting evaluation information

### Feature Engineering

Feature engineering converts transaction information into features that can be used by the ML and risk components.

Potential features include:

- Transaction amount
- Transaction time
- Transaction frequency
- Account age
- Previous transaction count
- Device information
- Location information
- Receiver information

### Isolation Forest

Isolation Forest is used as the initial anomaly detection model.

It identifies transactions that deviate from expected behavioral patterns.

Its output is normalized into an anomaly score between 0 and 100.

### Rule Engine

The Rule Engine generates deterministic risk signals.

Examples include:

- New device
- New receiver
- Unusual amount
- Unusual location
- High transaction velocity
- Unusual transaction time
- Behavioral deviation
- Receiver risk

Each triggered rule can generate a reason code.

### Risk Engine

The Risk Engine combines the individual risk signals into a single composite risk score.

Initial proposed weights are:

| Signal | Weight |
|---|---:|
| Anomaly | 40% |
| Velocity | 25% |
| Receiver | 20% |
| Behavioral | 15% |

All incoming risk signals must be normalized to the 0 to 100 range.

### Decision Engine

The Decision Engine converts the composite risk score into a final action.

The intended mapping is:

- Low risk → APPROVE
- Medium risk → VERIFY
- High risk → BLOCK

The exact thresholds are finalized and tested during integration.

### PostgreSQL

PostgreSQL is intended to store:

- Users
- Transactions
- Risk assessments
- Rule events
- Audit logs

### Dashboard

The dashboard provides visibility into:

- Transaction decisions
- Risk scores
- Risk components
- Triggered rules
- Explanations
- Transaction history
- Audit information

## 4. Current Implementation Status

The current backend contains the transaction evaluation endpoint and Decision Engine.

The Decision Engine is connected to the evaluation endpoint and determines the decision from the `composite_score`.

The current evaluation flow still uses the Step 3 placeholder composite score of `0.0`.

Therefore, the current live flow is:

Transaction → FastAPI → Placeholder Score → Decision Engine

The intended final flow is:

Transaction → Feature Engineering → ML + Rules → Risk Engine → Decision Engine → Database → Dashboard

The Risk Engine and complete ML/rule integration are still part of the integration work.

## 5. Integration Principle

All components must communicate through the shared technical contracts.

Risk components must return normalized scores rather than implementing their own decision logic.

The Decision Engine is responsible only for mapping the final composite risk score to APPROVE, VERIFY, or BLOCK.

## 6. Design Goal

The key differentiator of SentinelAI is receiver intelligence.

Traditional fraud detection often focuses primarily on whether the sender's behavior is unusual.

SentinelAI also considers whether the receiver is suspicious and whether the transaction makes sense in its broader context.