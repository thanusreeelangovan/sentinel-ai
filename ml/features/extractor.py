"""Feature Extraction & Calibrated Isolation Forest Baseline Pipeline.

Adheres strictly to Sentinel AI ML Contract (anomaly_score: 0 to 100).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Tuple
import numpy as np
from pydantic import BaseModel, ConfigDict, Field
from sklearn.ensemble import IsolationForest

from backend.app.schemas.transaction import AnomalyModelOutput, TransactionSchema


class PipelineConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    model_version: str = Field(default="iforest_v1", description="Model version tag")
    contamination: float = Field(default=0.03, ge=0.001, le=0.5, description="Expected anomaly rate")
    n_estimators: int = Field(default=100, ge=10, le=1000, description="Number of isolation trees")
    random_state: int = Field(default=42, description="Random seed for reproducibility")


class BaseFeatureExtractor(ABC):
    @abstractmethod
    def extract_vector(self, transaction: TransactionSchema) -> np.ndarray:
        """Extract a 1D numerical feature vector from a single transaction."""
        pass

    @abstractmethod
    def extract_batch(self, transactions: List[TransactionSchema]) -> np.ndarray:
        """Extract a 2D feature matrix (N, D) from a list of transactions."""
        pass


class TabularFeatureExtractor(BaseFeatureExtractor):
    """Transforms raw TransactionSchema into a dense numerical vector."""

    FEATURE_NAMES: Tuple[str, ...] = (
        "amount",
        "amount_to_max_ratio",
        "amount_to_min_ratio",
        "account_age_days",
        "previous_transaction_count",
        "is_location_missing",
        "latitude",
        "longitude",
        "is_known_ip",
        "hour_of_day",
        "is_merchant",
    )

    def extract_vector(self, txn: TransactionSchema) -> np.ndarray:
        u_ctx = txn.user_context
        u_range = u_ctx.usual_transaction_range
        max_bound = max(u_range.max, 1.0)
        min_bound = max(u_range.min, 1.0)

        is_loc_missing = 1.0 if txn.location is None or txn.location.latitude is None else 0.0
        lat = txn.location.latitude if (txn.location and txn.location.latitude is not None) else 0.0
        lon = txn.location.longitude if (txn.location and txn.location.longitude is not None) else 0.0
        is_known_ip = 1.0 if txn.ip_address and txn.ip_address.strip() else 0.0
        is_merchant = 1.0 if txn.receiver_type.value == "merchant" else 0.0

        features = [
            float(txn.amount),
            float(txn.amount / max_bound),
            float(txn.amount / min_bound),
            float(u_ctx.account_age_days),
            float(u_ctx.previous_transaction_count),
            is_loc_missing,
            float(lat),
            float(lon),
            is_known_ip,
            float(txn.timestamp.hour),
            is_merchant,
        ]
        return np.asarray(features, dtype=np.float32)

    def extract_batch(self, transactions: List[TransactionSchema]) -> np.ndarray:
        return np.vstack([self.extract_vector(t) for t in transactions])


class BaseAnomalyDetector(ABC):
    @abstractmethod
    def fit(self, X: np.ndarray) -> BaseAnomalyDetector:
        """Fit model on feature matrix X."""
        pass

    @abstractmethod
    def score(self, x: np.ndarray) -> AnomalyModelOutput:
        """Compute calibrated anomaly score in range [0, 100]."""
        pass


class IsolationForestDetector(BaseAnomalyDetector):
    """Calibrated Isolation Forest implementation meeting Sentinel AI SLA."""

    def __init__(self, config: PipelineConfig, extractor: BaseFeatureExtractor) -> None:
        self.config = config
        self.extractor = extractor
        self._model = IsolationForest(
            n_estimators=config.n_estimators,
            contamination=config.contamination,
            random_state=config.random_state,
            n_jobs=-1,
        )
        self._is_fitted = False

    def fit(self, X: np.ndarray) -> IsolationForestDetector:
        self._model.fit(X)
        self._is_fitted = True
        return self

    def score(self, x: np.ndarray) -> AnomalyModelOutput:
        if not self._is_fitted:
            raise RuntimeError("Model must be fitted before scoring.")
        if x.ndim == 1:
            x = x.reshape(1, -1)
        # Calibrated decision function scaled to 0-100 contract
        raw_score = float(self._model.decision_function(x)[0] * 2.5)
        calibrated_score = float(np.clip((0.5 - raw_score) * 100.0, 0.0, 100.0))
        return AnomalyModelOutput(
            anomaly_score=round(calibrated_score, 2),
            model_version=self.config.model_version,
            model_status="success",
        )

    def evaluate_transaction(self, txn: TransactionSchema) -> AnomalyModelOutput:
        vec = self.extractor.extract_vector(txn)
        return self.score(vec)


if __name__ == "__main__":
    from datetime import datetime, timezone

    def _generate_synthetic_txn(amount: float, is_outlier: bool = False) -> TransactionSchema:
        return TransactionSchema(
            transaction_id=f"TXN_{np.random.randint(1000, 9999)}",
            user_id="USR_001",
            amount=amount,
            currency="INR",
            receiver_id="REC_999",
            receiver_type="merchant" if not is_outlier else "user",
            timestamp=datetime.now(timezone.utc),
            device_id="DEV_001",
            device_type="android",
            location={"latitude": 12.97, "longitude": 77.59} if not is_outlier else None,
            ip_address="10.0.0.1" if not is_outlier else None,
            user_context={
                "account_age_days": 300,
                "previous_transaction_count": 50,
                "usual_transaction_range": {"min": 100.0, "max": 5000.0},
            },
        )

    cfg = PipelineConfig()
    fe = TabularFeatureExtractor()
    normal_samples = [_generate_synthetic_txn(float(np.random.uniform(200, 3000))) for _ in range(500)]
    X_train = fe.extract_batch(normal_samples)

    detector = IsolationForestDetector(cfg, fe).fit(X_train)

    # Test normal txn
    normal_res = detector.evaluate_transaction(_generate_synthetic_txn(1500.0))
    assert 0.0 <= normal_res.anomaly_score <= 100.0

    # Test extreme anomalous txn
    anomaly_res = detector.evaluate_transaction(_generate_synthetic_txn(250000.0, is_outlier=True))
    assert 0.0 <= anomaly_res.anomaly_score <= 100.0
    assert anomaly_res.anomaly_score > normal_res.anomaly_score

    print("Phase 1 Feature Extractor & Isolation Forest pipeline tests passed successfully.")

