# SentinelAI ML Contract

## Implemented Model

SentinelAI uses scikit-learn `IsolationForest` for anomaly detection. The model service is implemented in `backend/app/ml/iforest.py` and reports model version `iforest_v1`.

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

For model explainability, the service uses SHAP `TreeExplainer` on the fitted Isolation Forest. The evaluation response exposes `model_explanation_method: "SHAP_TREE_EXPLAINER"` and up to eight feature entries containing `feature_name`, `feature_value` and `model_contribution`. Contribution values are in the model explainer's output units, not composite-risk points. They explain only the Isolation Forest anomaly component. They do not explain the weighted composite score or the independently computed rule-based velocity, receiver and behavioral components.

If Tree SHAP is unavailable or returns unusable output in a deployed environment, the service replaces one feature at a time with its training mean and measures the change in Isolation Forest output. This fallback is labelled `ABLATION_FALLBACK` in the response and logs the fallback reason. Ablation values are never labelled or displayed as SHAP. Neither method is a causal explanation.

The contribution values are in the explainer's model-output units. They must not be interpreted as points in the normalized 0–100 anomaly score or as contributions to the composite score.

## Current Limitations

The model is a prototype trained from repository baseline data. It has not been validated against production payment traffic, independently benchmarked for fraud recall or false-positive rate, or calibrated for regulated deployment. Performance claims should therefore use measured prototype results only.
