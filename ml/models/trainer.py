"""Production Model Trainer & Lifecycle Manager for Isolation Forest.

Implements BaseTrainer ABC, validation gates, and serialized artifact persistence.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Tuple
import joblib
import numpy as np
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.transaction import TransactionSchema
from ml.features.extractor import BaseFeatureExtractor, IsolationForestDetector, PipelineConfig, TabularFeatureExtractor


class TrainerValidationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    passed: bool = Field(..., description="Validation gate overall status")
    normal_p95_score: float = Field(..., description="95th percentile score on normal validation set")
    normal_mean_score: float = Field(..., description="Mean score on normal validation set")
    outlier_min_score: float = Field(..., description="Minimum score observed on synthetic outlier set")
    scores_in_bounds: bool = Field(..., description="Whether 100% of scores fell within [0, 100]")


class BaseTrainer(ABC):
    """Abstract Base Class for modular ML training and artifact lifecycle."""

    @abstractmethod
    def train(self, data: List[TransactionSchema]) -> Any:
        """Train model using a collection of validated transactions."""
        pass

    @abstractmethod
    def evaluate(self, val_normal: List[TransactionSchema], val_outliers: List[TransactionSchema]) -> TrainerValidationResult:
        """Run validation gates against performance criteria."""
        pass

    @abstractmethod
    def save(self, path: Path | str) -> Path:
        """Persist model artifact to disk."""
        pass

    @classmethod
    @abstractmethod
    def load(cls, path: Path | str) -> Any:
        """Load model artifact from disk."""
        pass


class IsolationForestTrainer(BaseTrainer):
    """Trainer implementation for Calibrated Isolation Forest."""

    def __init__(self, config: PipelineConfig | None = None, extractor: BaseFeatureExtractor | None = None) -> None:
        self.config = config or PipelineConfig()
        self.extractor = extractor or TabularFeatureExtractor()
        self.detector: IsolationForestDetector | None = None

    def train(self, data: List[TransactionSchema]) -> IsolationForestTrainer:
        X_train = self.extractor.extract_batch(data)
        self.detector = IsolationForestDetector(self.config, self.extractor)
        self.detector.fit(X_train)
        return self

    def evaluate(self, val_normal: List[TransactionSchema], val_outliers: List[TransactionSchema]) -> TrainerValidationResult:
        if self.detector is None:
            raise RuntimeError("Model must be trained prior to evaluation.")

        normal_scores = [self.detector.evaluate_transaction(t).anomaly_score for t in val_normal]
        outlier_scores = [self.detector.evaluate_transaction(t).anomaly_score for t in val_outliers]

        all_scores = normal_scores + outlier_scores
        in_bounds = all(0.0 <= s <= 100.0 for s in all_scores)

        p95_norm = float(np.percentile(normal_scores, 95)) if normal_scores else 0.0
        mean_norm = float(np.mean(normal_scores)) if normal_scores else 0.0
        min_out = float(np.min(outlier_scores)) if outlier_scores else 100.0

        # Strict validation gates:
        # 1. 100% scores in [0.0, 100.0]
        # 2. Normal baseline p95 score < 50.0
        # 3. Synthetic extreme outlier min score >= 75.0
        gates_passed = bool(in_bounds and p95_norm < 50.0 and min_out >= 75.0)

        return TrainerValidationResult(
            passed=gates_passed,
            normal_p95_score=round(p95_norm, 2),
            normal_mean_score=round(mean_norm, 2),
            outlier_min_score=round(min_out, 2),
            scores_in_bounds=in_bounds,
        )

    def save(self, path: Path | str) -> Path:
        if self.detector is None:
            raise RuntimeError("Cannot save untrained model.")
        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "detector": self.detector,
            "config": self.config.model_dump(),
            "feature_names": TabularFeatureExtractor.FEATURE_NAMES,
        }
        joblib.dump(payload, save_path)
        return save_path

    @classmethod
    def load(cls, path: Path | str) -> IsolationForestDetector:
        load_path = Path(path)
        if not load_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {load_path}")
        payload: Dict[str, Any] = joblib.load(load_path)
        return payload["detector"]


if __name__ == "__main__":
    from datetime import datetime, timezone

    def _make_txn(amount: float, is_outlier: bool = False, seed: int = 42) -> TransactionSchema:
        rng = np.random.default_rng(seed)
        lat = 12.9716 + float(rng.normal(0, 0.05)) if not is_outlier else None
        lon = 77.5946 + float(rng.normal(0, 0.05)) if not is_outlier else None
        ip = f"192.168.1.{rng.integers(2, 254)}" if not is_outlier else None
        return TransactionSchema(
            transaction_id=f"TXN_{rng.integers(10000, 99999)}",
            user_id="USR_TRAIN_001" if not is_outlier else "USR_OUTLIER",
            amount=amount,
            currency="INR",
            receiver_id=f"REC_{rng.integers(1, 50)}" if not is_outlier else "REC_SUSPICIOUS",
            receiver_type="merchant" if not is_outlier else "user",
            timestamp=datetime.now(timezone.utc),
            device_id=f"DEV_{rng.integers(1, 20)}" if not is_outlier else "DEV_SUSP",
            device_type="android" if not is_outlier else "other",
            location={"latitude": lat, "longitude": lon} if not is_outlier else None,
            ip_address=ip,
            user_context={
                "account_age_days": int(rng.integers(30, 800)) if not is_outlier else 1,
                "previous_transaction_count": int(rng.integers(10, 400)) if not is_outlier else 0,
                "usual_transaction_range": {"min": 100.0, "max": 5000.0},
            },
        )

    # 1. Synthesize baseline dataset (10,000 normal transactions)
    rng = np.random.default_rng(42)
    train_txns = [_make_txn(float(rng.uniform(100, 4800)), seed=int(rng.integers(1, 100000))) for _ in range(10000)]

    # 2. Train model and run validation gates
    trainer = IsolationForestTrainer(PipelineConfig(contamination=0.03, n_estimators=100)).train(train_txns)
    val_norm = [_make_txn(float(rng.uniform(150, 4500)), seed=int(rng.integers(1, 100000))) for _ in range(200)]
    val_out = [_make_txn(float(rng.uniform(75000, 250000)), is_outlier=True, seed=int(rng.integers(1, 100000))) for _ in range(50)]

    val_result = trainer.evaluate(val_norm, val_out)
    assert val_result.passed, f"Validation gates failed: {val_result}"

    # 3. Save and Verify Reload Equivalence
    artifact_path = Path("ml/models/iforest_v1.joblib")
    trainer.save(artifact_path)
    loaded_detector = IsolationForestTrainer.load(artifact_path)
    test_txn = _make_txn(2500.0)

    score_orig = trainer.detector.evaluate_transaction(test_txn).anomaly_score
    score_reloaded = loaded_detector.evaluate_transaction(test_txn).anomaly_score
    assert np.isclose(score_orig, score_reloaded, atol=1e-5), "Reload equivalence check failed."
    print("Phase 2 Trainer, validation gates, and artifact serialization tests passed successfully.")
