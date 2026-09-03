"""Training and Model Artifact Serialization Script.

Trains on 10,000 synthetic baseline transactions, validates contract gates,
and persists `ml/models/iforest_v1.joblib`.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path
import numpy as np

from backend.app.schemas.transaction import TransactionSchema
from ml.features.extractor import PipelineConfig, TabularFeatureExtractor
from ml.models.trainer import IsolationForestTrainer


def generate_baseline_data(n_samples: int = 10000, seed: int = 42) -> list[TransactionSchema]:
    """Generate reproducible normal baseline transactions."""
    rng = np.random.default_rng(seed)
    transactions: list[TransactionSchema] = []
    
    for i in range(n_samples):
        # 95% regular merchants, 5% peer users
        is_merchant = rng.random() < 0.95
        amount = float(rng.uniform(100.0, 5000.0))
        account_age = int(rng.integers(30, 1000))
        prev_txns = int(rng.integers(10, 500))

        txn = TransactionSchema(
            transaction_id=f"TXN_BASE_{i:06d}",
            user_id=f"USR_{rng.integers(1, 200):03d}",
            amount=round(amount, 2),
            currency="INR",
            receiver_id=f"REC_{rng.integers(1, 100):03d}",
            receiver_type="merchant" if is_merchant else "user",
            timestamp=datetime.now(timezone.utc),
            device_id=f"DEV_{rng.integers(1, 50):03d}",
            device_type="android" if rng.random() < 0.7 else "ios",
            location={"latitude": 12.9716 + float(rng.normal(0, 0.05)), "longitude": 77.5946 + float(rng.normal(0, 0.05))},
            ip_address=f"192.168.1.{rng.integers(2, 254)}",
            user_context={
                "account_age_days": account_age,
                "previous_transaction_count": prev_txns,
                "usual_transaction_range": {"min": 100.0, "max": 5000.0},
            },
        )
        transactions.append(txn)
    return transactions


def run_training_pipeline() -> Path:
    print("1. Generating 10,000 synthetic baseline transactions...")
    t0 = time.perf_counter()
    train_data = generate_baseline_data(10000, seed=42)
    print(f"   Generated in {time.perf_counter() - t0:.2f}s")

    print("2. Initializing and training IsolationForestTrainer (contamination=0.03)...")
    config = PipelineConfig(model_version="iforest_v1", contamination=0.03, n_estimators=100, random_state=42)
    trainer = IsolationForestTrainer(config=config, extractor=TabularFeatureExtractor())
    t0 = time.perf_counter()
    trainer.train(train_data)
    print(f"   Trained in {time.perf_counter() - t0:.2f}s")

    print("3. Running validation gates on held-out distributions...")
    val_norm = generate_baseline_data(500, seed=123)
    val_outliers: list[TransactionSchema] = []
    rng = np.random.default_rng(999)
    for j in range(100):
        outlier = TransactionSchema(
            transaction_id=f"TXN_OUT_{j:04d}",
            user_id="USR_OUTLIER",
            amount=float(rng.uniform(60000.0, 300000.0)),
            currency="INR",
            receiver_id="REC_UNKNOWN",
            receiver_type="user",
            timestamp=datetime.now(timezone.utc),
            device_id="DEV_SUSPICIOUS",
            device_type="other",
            location=None,
            ip_address=None,
            user_context={
                "account_age_days": 1,
                "previous_transaction_count": 0,
                "usual_transaction_range": {"min": 100.0, "max": 5000.0},
            },
        )
        val_outliers.append(outlier)

    val_res = trainer.evaluate(val_norm, val_outliers)
    print(f"   Validation Results: {val_res.model_dump()}")
    if not val_res.passed:
        raise RuntimeError(f"Model failed validation gates: {val_res}")

    print("4. Persisting model artifact to `ml/models/iforest_v1.joblib`...")
    output_path = Path("ml/models/iforest_v1.joblib")
    trainer.save(output_path)

    print("5. Verifying reload equivalence...")
    detector = IsolationForestTrainer.load(output_path)
    sample = val_norm[0]
    score1 = trainer.detector.evaluate_transaction(sample).anomaly_score
    score2 = detector.evaluate_transaction(sample).anomaly_score
    assert score1 == score2, f"Score mismatch: {score1} vs {score2}"
    print(f"   Verified: sample anomaly score = {score2}")
    print("   Artifact persisted and verified successfully.")
    return output_path


if __name__ == "__main__":
    run_training_pipeline()

