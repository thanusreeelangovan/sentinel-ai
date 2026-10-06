# SentinelAI Risk Engine Contract

## Decision Vocabulary

The backend uses exactly three transaction decisions:

| Composite score | Risk level | Decision | Intended action |
|---:|---|---|---|
| 0 to 40 | LOW | `APPROVE` | Proceed normally |
| Above 40 to 75 | MEDIUM | `VERIFY` | Require step-up verification |
| Above 75 to 100 | HIGH | `BLOCK` recommendation | Intercept and recommend stopping; continuation requires explicit user acknowledgement and step-up verification in the prototype |

The backend decision is authoritative. `BLOCK` is the risk engine recommendation, not an irreversible system-level payment block in this prototype. A verified user may choose “I Recognise This Payment” and continue after step-up verification. The original HIGH/BLOCK evaluation and score remain stored and unchanged; the override does not recalculate risk.
| Above 75 to 100 | HIGH | `BLOCK` | Strong stop recommendation. The prototype intercepts the payment, explains why, and requires an explicit verified user override before any continuation |

The backend decision is authoritative as a risk-engine recommendation. The prototype payment simulator may allow a verified user to override a HIGH / `BLOCK` recommendation after an explicit warning and step-up authentication. That user action does not rewrite the original risk decision.

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

The evaluation service can additionally expose contextual presentation signals, reason codes and model-based feature contributions. The anomaly-model contributions use Tree SHAP when available and are labelled with the explanation method. These support explanation and UI presentation but do not replace the four weighted inputs above.

## Evaluation Sequence

1. Validate the transaction payload.
2. Evaluate rule-based transaction signals.
3. Score anomaly using the Isolation Forest service.
4. Build the four risk signals.
5. Calculate the weighted composite score.
6. Add `HIGH_ANOMALY` when the anomaly score is at least 70.
7. Map the composite score to `APPROVE`, `VERIFY` or `BLOCK`.
8. Generate minimal and smartphone explanations from the completed risk result; SHAP explains only the Isolation Forest anomaly component.
9. Persist the evaluation, original recommendation, explanation method and model feature contributions.
10. Commit the database transaction before returning the API response.

## Policy Mapping

The evaluation response currently maps decisions to these policy identifiers:

| Decision | Policy |
|---|---|
| `APPROVE` | `POLICY_STANDARD_ALLOW_LIST_PASSED` |
| `VERIFY` | `POLICY_STEP_UP_VERIFICATION_REQUIRED` |
| `BLOCK` | `POLICY_HIGH_RISK_RECOMMENDATION_BLOCK` |

These identifiers describe prototype policy recommendations. They are not external banking policy codes.

## Explainability Boundary

The explanation module consumes the risk engine output. SHAP is scoped to the Isolation Forest anomaly model and does not explain the full composite score. Velocity, receiver and behavioral risk are separate rule-based components. The explanation module does not independently calculate the composite score or rewrite the original decision.

## High-risk user override

HIGH risk interrupts the prototype flow and recommends stopping. The user can inspect risk factors, report the receiver or cancel. Continuing requires explicit acknowledgement and the prototype step-up PIN (`4092`). The fingerprint control is simulated. Successful verification only changes the prototype flow outcome; it does not change the original risk score or `BLOCK` recommendation. This is a UX demonstration, not real payment authorization or bank authentication.

## Implementation Notes

Thresholds and weights are isolated in `backend/app/risk/thresholds.py` and `backend/app/risk/weights.py`. The orchestration flow is implemented in `backend/app/services/evaluate.py`.
