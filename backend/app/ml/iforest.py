import logging

import numpy as np
import shap
from sklearn.ensemble import IsolationForest

from app.ml.baseline import load_training_transactions
from app.ml.features import FEATURE_NAMES, extract_features
from app.ml.schemas import AnomalyResult
from app.schemas.transaction import Transaction

MODEL_VERSION = "iforest_v1"
logger = logging.getLogger(__name__)


class IsolationForestService:
    def __init__(self) -> None:
        self.model_version = MODEL_VERSION
        self.model_status = "untrained"
        self._model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=1,
        )
        self._raw_min = 0.0
        self._raw_max = 1.0
        self._train_mean: np.ndarray | None = None
        self._tree_explainer = None
        self._explainer: shap.TreeExplainer | None = None
        self._train()
        self._initialize_tree_explainer()

    def _train(self) -> None:
        training_rows = [
            extract_features(Transaction.model_validate(item))
            for item in load_training_transactions()
        ]
        training_features = np.array(training_rows, dtype=float)
        self._model.fit(training_features)
        self._train_mean = training_features.mean(axis=0)
        self._explainer = shap.TreeExplainer(self._model)
        raw_scores = -self._model.decision_function(training_features)
        self._raw_min = float(np.min(raw_scores))
        self._raw_max = float(np.max(raw_scores))
        if self._raw_max == self._raw_min:
            self._raw_max = self._raw_min + 1.0
        self.model_status = "success"

    def _normalize(self, raw_score: float) -> float:
        scaled = (raw_score - self._raw_min) / (self._raw_max - self._raw_min) * 100.0
        return round(min(100.0, max(0.0, scaled)), 1)

    def _initialize_tree_explainer(self) -> None:
        try:
            import shap

            self._tree_explainer = shap.TreeExplainer(self._model)
        except Exception:
            logger.warning(
                "Tree SHAP is unavailable for the Isolation Forest; using the labelled ablation fallback.",
                exc_info=True,
            )

    def score(self, transaction: Transaction) -> AnomalyResult:
        features = np.array([extract_features(transaction)], dtype=float)
        raw_score = float(-self._model.decision_function(features)[0])
        return AnomalyResult(
            anomaly_score=self._normalize(raw_score),
            model_version=self.model_version,
            model_status=self.model_status,
        )

    def explain_features(
        self, transaction: Transaction
    ) -> tuple[str, list[dict[str, float | str]]]:
        """Explain only the Isolation Forest output; contributions are not composite-score points."""
    def _ablation_feature_contributions(
        self, transaction: Transaction
    ) -> list[dict[str, float | str]]:
        """Fallback explanation when Tree SHAP is unavailable at runtime."""

        if self._train_mean is None:
            return []
        features = np.array(extract_features(transaction), dtype=float)
        contributions: list[dict[str, float | str]] = []
        method = "SHAP_TREE_EXPLAINER"

        if self._tree_explainer is not None:
            try:
                shap_values = self._tree_explainer.shap_values(features.reshape(1, -1))
                values = np.asarray(shap_values, dtype=float)
                if values.ndim == 3:
                    values = values[0, :, 0]
                elif values.ndim == 2:
                    values = values[0]
                if values.shape != features.shape or not np.isfinite(values).all():
                    raise ValueError("TreeExplainer returned invalid feature contributions")
                contributions = [
                    {
                        "feature_name": name,
                        "feature_value": float(features[index]),
                        "model_contribution": round(float(values[index]), 6),
                    }
                    for index, name in enumerate(FEATURE_NAMES)
                ]
            except Exception:
                logger.warning(
                    "Tree SHAP failed for the Isolation Forest; using the labelled ablation fallback.",
                    exc_info=True,
                )
                self._tree_explainer = None
                method = "ABLATION_FALLBACK"
        else:
            method = "ABLATION_FALLBACK"

        if method == "ABLATION_FALLBACK":
            if self._train_mean is None:
                raise RuntimeError("Isolation Forest training mean is unavailable")
            base = float(-self._model.decision_function(features.reshape(1, -1))[0])
            for index, name in enumerate(FEATURE_NAMES):
                perturbed = features.copy()
                perturbed[index] = float(self._train_mean[index])
                restored = float(-self._model.decision_function(perturbed.reshape(1, -1))[0])
                contributions.append(
                    {
                        "feature_name": name,
                        "feature_value": float(features[index]),
                        "model_contribution": round(base - restored, 6),
                    }
                )

        contributions.sort(
            key=lambda item: abs(float(item["model_contribution"])), reverse=True
        )
        return method, contributions[:8]

    def feature_contributions(self, transaction: Transaction) -> list[dict[str, float | str]]:
        """Return the most relevant Isolation Forest model contributions."""

        return self.explain_features(transaction)[1]
        for index, name in enumerate(FEATURE_NAMES):
            perturbed = features.copy()
            perturbed[index] = float(self._train_mean[index])
            restored = float(-self._model.decision_function(perturbed.reshape(1, -1))[0])
            contributions.append(
                {
                    "feature": name,
                    "contribution": round(base - restored, 4),
                    "value": round(float(features[index]), 4),
                }
            )
        contributions.sort(key=lambda item: abs(float(item["contribution"])), reverse=True)
        return contributions[:8]

    def explain_features(
        self, transaction: Transaction
    ) -> dict[str, str | list[dict[str, float | str]]]:
        """Explain the fitted Isolation Forest with Tree SHAP.

        SHAP explains only the anomaly model output. It does not explain the
        rule-based velocity, receiver or behavioral scores used by the final
        composite risk engine.
        """

        features = np.array(extract_features(transaction), dtype=float)
        try:
            if self._explainer is None:
                self._explainer = shap.TreeExplainer(self._model)
            shap_values = self._explainer.shap_values(
                features.reshape(1, -1),
                check_additivity=False,
            )
            values = np.asarray(shap_values, dtype=float).reshape(-1)
            contributions: list[dict[str, float | str]] = []
            for index, name in enumerate(FEATURE_NAMES):
                contributions.append(
                    {
                        "feature": name,
                        "contribution": round(float(values[index]), 4),
                        "value": round(float(features[index]), 4),
                    }
                )
            contributions.sort(
                key=lambda item: abs(float(item["contribution"])),
                reverse=True,
            )
            return {
                "method": "SHAP_TREE_EXPLAINER",
                "features": contributions[:8],
            }
        except Exception:
            return {
                "method": "ABLATION_FALLBACK",
                "features": self._ablation_feature_contributions(transaction),
            }

    def feature_contributions(self, transaction: Transaction) -> list[dict[str, float | str]]:
        """Compatibility helper for the explanation service."""

        explanation = self.explain_features(transaction)
        return list(explanation["features"])


_service: IsolationForestService | None = None


def get_iforest_service() -> IsolationForestService:
    global _service
    if _service is None:
        _service = IsolationForestService()
    return _service


def score_anomaly(transaction: Transaction) -> AnomalyResult:
    return get_iforest_service().score(transaction)
