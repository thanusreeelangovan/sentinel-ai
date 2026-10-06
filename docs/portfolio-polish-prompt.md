# SentinelAI Portfolio Polish Implementation Prompt

Work on the existing SentinelAI repository without redesigning its current visual language. Preserve the dark phone simulator, existing color palette, spacing, animations, recipient cards, risk popups, and overall payment flow. The goal is to improve technical credibility, deployment reliability, and the product story rather than replace the UI.

## Product intent

SentinelAI is an explainable pre-authorization risk layer for UPI and digital payments. It combines an Isolation Forest anomaly model with rule-based velocity, receiver, and behavioral risk signals. The final composite score remains:

- anomaly: 40%
- velocity: 25%
- receiver: 20%
- behavioral: 15%

Risk behavior remains:

- LOW: approve normally
- MEDIUM: require step-up verification
- HIGH: issue a strong stop recommendation, intercept the payment, explain why, allow reporting, and permit an explicit user override only after step-up authentication

The HIGH user override is intentional. Do not silently convert HIGH into an unconditional hard block. Preserve the original backend risk decision for audit even if the verified user overrides it.

## Required changes

1. Preserve the current UI and UX styling.
2. Keep the existing View / Why explanation interaction.
3. Implement genuine SHAP explanation for the Isolation Forest anomaly model.
4. Scope SHAP only to the anomaly model. Do not claim SHAP explains velocity, receiver, behavioral, or the entire composite risk score.
5. If Tree SHAP cannot run in a deployed environment, fall back to the existing feature ablation method and label that result as an ablation fallback rather than SHAP.
6. Expose explanation method and model feature contributions in the backend evaluation response.
7. Display backend model contributions in the existing explanation UI. Retain the local heuristic visualization only when the local demo engine is used.
8. Fix secondary authentication so arbitrary four digit PINs no longer succeed. Use demo PIN 4092. Keep biometric as an explicitly simulated demo authentication path.
9. Preserve the HIGH risk user override, but change wording from an absolute block to a high-risk interception and stop recommendation that the verified user may explicitly override.
10. Keep Report Receiver on HIGH risk transactions. Reporting must record the receiver and risk evidence inside SentinelAI only. Do not claim the prototype reports directly to NPCI, a bank, or an external fraud registry.
11. Make receiver reporting work against the configured deployed backend instead of defaulting to localhost.
12. Surface whether a transaction was evaluated by the real FastAPI backend or by the local deterministic demo engine.
13. Keep the deterministic local engine as a resilience fallback for demos, but never present it as the real deployed ML backend.
14. Remove or avoid unsupported claims such as XGBoost, GNN inference, Redis feature stores, real behavioral biometrics, gyroscope analysis, cryptographic authorization tokens, or external NPCI registry integration unless the implementation genuinely exists.
15. Update README and technical contracts so the repository description matches the implementation.
16. Add CI that builds the React frontend and runs the backend test suite against PostgreSQL.

## Constraints

- Do not redesign the interface.
- Do not remove the report flow.
- Do not remove the final user decision for HIGH risk transactions.
- Do not break the existing FastAPI routes or database persistence.
- Do not make production banking, accuracy, fraud recall, or NPCI integration claims that are not measured or implemented.
- Keep the hackathon demo usable and deterministic.
- Prefer small, reviewable changes over a rewrite.

## Success criteria

A recruiter or technical reviewer should be able to see that SentinelAI is a full-stack prototype with a real anomaly model, rule-based contextual risk scoring, explainability, adaptive verification, reporting, persistence, Docker deployment, and a transparent local fallback. The UI should still look like the current SentinelAI demo, just with technically defensible behavior and wording.
