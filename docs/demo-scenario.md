# SentinelAI Demo Scenario

## Demo Goal

Demonstrate that SentinelAI evaluates a digital payment before final authorization, produces an explainable risk result, applies a risk-specific action and persists the evaluation for later inspection.

## Recommended Demo Order

### 1. Health and deployment

Start the Dockerized stack and show that the frontend, FastAPI backend and PostgreSQL services are running. The backend health endpoint is:

```http
GET /health
```

Expected response:

```json
{"status":"ok"}
```

### 2. Normal transaction

Submit a transaction whose contextual signals produce a composite score of 40 or below.

Expected backend behavior:

```text
Risk level: LOW
Decision: APPROVE
Action: proceed normally
```

Narration: SentinelAI recommends approval within the normal range, so the prototype continues with minimal friction.

### 3. Medium-risk transaction

Submit a transaction that produces a score above 40 and at most 75.

Expected backend behavior:

```text
Risk level: MEDIUM
Decision: VERIFY
Action: step-up verification required
```

Demo the frontend verification flow by asking the user to complete the additional prototype step-up PIN check before payment continuation.

Narration: SentinelAI recommends verification, adding proportional friction without treating the receiver as fraudulent by itself.

### 4. High-risk transaction

Submit a transaction that produces a score above 75.

Expected backend behavior:

```text
Risk level: HIGH
Decision: BLOCK
Action: intercept the transaction
```

Show the high-risk warning, explain why and demonstrate the available choices: view the risk explanation, report the receiver, cancel, or choose “I Recognise This Payment.” Continuing requires the demonstration PIN `4092`. The biometric control is simulated. The backend decision returned for this state remains `BLOCK`; successful verification changes only the prototype flow outcome, not the original score, risk level or recommendation.

Narration: Instead of discovering suspicious activity after the transfer, SentinelAI intercepts the payment at the pre-authorization stage and surfaces the reasons that caused the high-risk decision.

### 5. Explainability

For medium and high-risk cases, show the risk score, reason codes, weighted risk breakdown and user-facing explanation. The evaluation response reports whether the model explanation is `SHAP_TREE_EXPLAINER` or `ABLATION_FALLBACK`. SHAP covers only Isolation Forest anomaly features, not the full composite. Detailed risk information is available at:

```http
GET /transactions/{transaction_id}/risk-details
```

Emphasize that explanations describe an existing decision. They do not independently score transactions.

### 6. Persistence

Show the evaluated transaction through:

```http
GET /transactions
GET /transactions/{transaction_id}
```

This demonstrates that the risk result is persisted rather than existing only in frontend state.

### 7. Report transaction

For a high-risk transaction, select **Report Receiver** in the phone simulator. The API endpoint is:

```http
POST /reports
```

The report is stored with its sender, receiver, transaction context, risk score, optional transaction ID and generated reference without rescoring the transaction. It is a SentinelAI prototype review record, not an external fraud-registry submission.

## Demo Recovery

If the frontend fails during judging, use FastAPI Swagger at `/docs` to demonstrate the backend directly. If a fresh database is needed, bring the Docker stack up with PostgreSQL healthy before running evaluation calls. Do not delete the PostgreSQL volume during the presentation unless a complete reset is intentional.

## Claims to Avoid

Do not claim production UPI integration, guaranteed fraud prevention, production-scale latency, bank-grade deployment, or independently validated model accuracy. The demo proves the implemented prototype workflow and architecture.
