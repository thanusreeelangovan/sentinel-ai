import numpy as np
from sklearn.ensemble import IsolationForest

from app.ml.baseline import load_training_transactions
from app.ml.features import FEATURE_NAMES, extract_features
from app.ml.schemas import AnomalyResult
from app.schemas.transaction import Transaction

MODEL_VERSION = "iforest_v1"


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
        self._train()

    def _train(self) -> None:
        training_rows = [
            extract_features(Transaction.model_validate(item))
            for item in load_training_transactions()
        ]
        training_features = np.array(training_rows, dtype=float)
        self._model.fit(training_features)
        self._train_mean = training_features.mean(axis=0)
        raw_scores = -self._model.decision_function(training_features)
        self._raw_min = float(np.min(raw_scores))
        self._raw_max = float(np.max(raw_scores))
        if self._raw_max == self._raw_min:
            self._raw_max = self._raw_min + 1.0
        self.model_status = "success"

    def _normalize(self, raw_score: float) -> float:
        scaled = (raw_score - self._raw_min) / (self._raw_max - self._raw_min) * 100.0
        return round(min(100.0, max(0.0, scaled)), 1)

    def score(self, transaction: Transaction) -> AnomalyResult:
        features = np.array([extract_features(transaction)], dtype=float)
        raw_score = float(-self._model.decision_function(features)[0])
        return AnomalyResult(
            anomaly_score=self._normalize(raw_score),
            model_version=self.model_version,
            model_status=self.model_status,
        )

    def feature_contributions(self, transaction: Transaction) -> list[dict[str, float | str]]:
        """Ablate each feature to the training mean to measure model contribution.

        These are model-based contributions from the fitted detector, not invented values.
        """

        if self._train_mean is None:
            return []
        features = np.array(extract_features(transaction), dtype=float)
        base = float(-self._model.decision_function(features.reshape(1, -1))[0])
        contributions: list[dict[str, float | str]] = []
        for index, name in enumerate(FEATURE_NAMES):
            perturbed = features.copy()
            perturbed[index] = float(self._train_mean[index])
            restored = float(-self._model.decision_function(perturbed.reshape(1, -1))[0])
            contributions.append(
                {
                    "feature": name,
                    "contribution": round(base - restored, 4),
                }
            )
        contributions.sort(key=lambda item: abs(float(item["contribution"])), reverse=True)
        return contributions[:8]


_service: IsolationForestService | None = None


def get_iforest_service() -> IsolationForestService:
    global _service
    if _service is None:
        _service = IsolationForestService()
    return _service


def score_anomaly(transaction: Transaction) -> AnomalyResult:
    return get_iforest_service().score(transaction)
