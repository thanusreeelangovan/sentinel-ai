# SentinelAI ML Contract

## Implemented Model

SentinelAI currently uses scikit-learn `IsolationForest` for anomaly detection. The model service is implemented in `backend/app/ml/iforest.py` and reports model version `iforest_v1`.

The model is one input to the risk engine. It does not independently decide whether a transaction is approved, verified or blocked.

## Training

At service initialization, the Isolation Forest is fitted using baseline transaction data loaded by the repository's ML baseline module. The configured model uses:

```text
n_estimators = 100
contamination = 0.05
random_state = 42
n_jobs = 1
```

This is prototype training data and must not be described as a production banking fraud dataset.

## Input Features

Transaction objects are converted to numeric model features by `backend/app/ml/features.py`. The ML contract follows the feature extractor in code rather than accepting arbitrary frontend-generated anomaly scores.

## Output

The model returns:

```json
{
  "anomaly_score": 0.0,
  "model_version": "iforest_v1",
  "model_status": "success"
}
```

`anomaly_score` is normalized to a 0 to 100 range using the minimum and maximum raw anomaly scores observed in the baseline training data.

## Risk Engine Integration

The anomaly score contributes 40 percent of the final composite score. The remaining weighted inputs are velocity at 25 percent, receiver at 20 percent and behavioral at 15 percent.

An anomaly score of at least 70 also adds the `HIGH_ANOMALY` reason code. The final transaction decision is still based on the composite risk score.

## Feature Contributions

For explainability, the service computes model-based feature contributions by replacing one feature at a time with its training mean and measuring the change in Isolation Forest output. The eight largest absolute contributions can be passed to the explanation layer.

These values are ablation-based model contributions. They should not be described as SHAP values or as causal explanations.

## Current Limitations

The model is a hackathon prototype trained from repository baseline data. It has not been validated against production UPI traffic, independently benchmarked for fraud recall or false-positive rate, or calibrated for regulated deployment. Performance claims should therefore use measured prototype results only.
