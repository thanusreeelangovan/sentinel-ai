
### 5. `docs/risk-engine-contract.md`

```markdown
# SentinelAI Risk Engine Contract

## 1. Purpose

The Risk Engine combines independent fraud signals into a single composite risk score.

It provides the bridge between individual detection components and the Decision Engine.

## 2. Input

The Risk Engine receives:

```json
{
  "transaction_id": "TXN_001",
  "anomaly_score": 80.0,
  "velocity_score": 70.0,
  "receiver_score": 65.0,
  "behavioral_score": 55.0,
  "reason_codes": [
    "NEW_DEVICE",
    "HIGH_VELOCITY",
    "RECEIVER_RISK"
  ]
}