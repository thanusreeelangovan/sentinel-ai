# SentinelAI Risk Engine Contract

## Decision Vocabulary

The backend uses exactly three transaction decisions:

| Composite score | Risk level | Decision | Intended action |
|---:|---|---|---|
| 0 to 40 | LOW | `APPROVE` | Proceed normally |
| Above 40 to 75 | MEDIUM | `VERIFY` | Require step-up verification |
| Above 75 to 100 | HIGH | `BLOCK` | Intercept and require a high-risk warning / verification flow before any later payment continuation |

The backend decision is authoritative. Frontend labels should not redefine these thresholds.

## Composite Score

The implemented calculation is:

```text
composite_score =
    anomaly_score    * 0.40
  + velocity_score   * 0.25
  + receiver_score   * 0.20
  + behavioral_score * 0.15
```

All four input scores are constrained to 0 through 100. The composite score is rounded to one decimal place.

## Signal Sources

### Anomaly

Produced by the fitted Isolation Forest detector and normalized to a 0 to 100 anomaly score.

### Velocity

Produced by the rule engine from transaction activity and contextual rules.

### Receiver

Represents receiver or beneficiary risk identified by the rule layer.

### Behavioral

Represents behavioral deviation identified from available transaction and user context.

The evaluation service can additionally expose contextual presentation signals, reason codes and model-based feature contributions. These support explanation and UI presentation but do not replace the four weighted inputs above.

## Evaluation Sequence

1. Validate the transaction payload.
2. Evaluate rule-based transaction signals.
3. Score anomaly using the Isolation Forest service.
4. Build the four risk signals.
5. Calculate the weighted composite score.
6. Add `HIGH_ANOMALY` when the anomaly score is at least 70.
7. Map the composite score to `APPROVE`, `VERIFY` or `BLOCK`.
8. Generate minimal and smartphone explanations from the completed risk result.
9. Persist the evaluation and associated evidence.
10. Commit the database transaction before returning the API response.

## Policy Mapping

The evaluation response currently maps decisions to these policy identifiers:

| Decision | Policy |
|---|---|
| `APPROVE` | `POLICY_STANDARD_ALLOW_LIST_PASSED` |
| `VERIFY` | `POLICY_STEP_UP_VERIFICATION_REQUIRED` |
| `BLOCK` | `POLICY_ZERO_TRUST_DEVICE_COMPROMISE` |

These identifiers describe prototype policy behavior. They are not external banking or NPCI policy codes.

## Explainability Boundary

The explanation module consumes the risk engine output. It does not independently calculate the composite score or override the decision.

## Implementation Notes

Thresholds and weights are isolated in `backend/app/risk/thresholds.py` and `backend/app/risk/weights.py`. The orchestration flow is implemented in `backend/app/services/evaluate.py`.
