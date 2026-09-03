
### 4. `docs/ml-contract.md`

```markdown
# SentinelAI ML Contract

## 1. Purpose

The ML component detects transaction behavior that deviates from expected patterns.

The initial anomaly detection model selected for SentinelAI is Isolation Forest.

## 2. ML Pipeline

```text
Transaction
    |
    v
Feature Engineering
    |
    v
Isolation Forest
    |
    v
Raw Anomaly Output
    |
    v
Normalization
    |
    v
anomaly_score 0 to 100