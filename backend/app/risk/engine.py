"""Risk & Decision Engine combining ML anomaly scores and rule signals."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List


class Decision(str, Enum):
    APPROVE = "APPROVE"
    VERIFY = "VERIFY"
    BLOCK = "BLOCK"


class RiskEngine:
    W_ANOMALY: float = 0.40
    W_VELOCITY: float = 0.25
    W_RECEIVER: float = 0.20
    W_BEHAVIORAL: float = 0.15

    CUTOFF_VERIFY: float = 50.0
    CUTOFF_BLOCK: float = 75.0

    def calculate_composite_score(
        self,
        anomaly_score: float,
        velocity_score: float,
        receiver_score: float,
        behavioral_score: float,
    ) -> float:
        composite = (
            (self.W_ANOMALY * anomaly_score)
            + (self.W_VELOCITY * velocity_score)
            + (self.W_RECEIVER * receiver_score)
            + (self.W_BEHAVIORAL * behavioral_score)
        )
        return round(float(composite), 2)

    def determine_decision(self, composite_score: float) -> Decision:
        if composite_score >= self.CUTOFF_BLOCK:
            return Decision.BLOCK
        if composite_score >= self.CUTOFF_VERIFY:
            return Decision.VERIFY
        return Decision.APPROVE

    def evaluate(
        self,
        transaction_id: str,
        anomaly_score: float,
        velocity_score: float,
        receiver_score: float,
        behavioral_score: float,
        rules_triggered: List[str],
        reason_codes: List[str],
        model_version: str = "iforest_v1",
    ) -> Dict[str, Any]:
        final_rules = list(rules_triggered)
        final_reasons = list(reason_codes)

        if anomaly_score >= 75.0:
            if "HIGH_ANOMALY" not in final_rules:
                final_rules.insert(0, "HIGH_ANOMALY")
            if "Transaction exhibits statistical deviation from baseline profile" not in final_reasons:
                final_reasons.insert(0, "Transaction exhibits statistical deviation from baseline profile")

        composite_score = self.calculate_composite_score(
            anomaly_score=anomaly_score,
            velocity_score=velocity_score,
            receiver_score=receiver_score,
            behavioral_score=behavioral_score,
        )
        decision = self.determine_decision(composite_score)

        return {
            "transaction_id": transaction_id,
            "risk": {
                "anomaly_score": round(anomaly_score, 2),
                "velocity_score": round(velocity_score, 2),
                "receiver_score": round(receiver_score, 2),
                "behavioral_score": round(behavioral_score, 2),
                "composite_score": composite_score,
            },
            "decision": decision.value,
            "reason_codes": final_reasons,
            "model_version": model_version,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }


if __name__ == "__main__":
    engine = RiskEngine()

    # 1. Normal -> APPROVE
    res_a = engine.evaluate("TXN_A", 20.0, 10.0, 10.0, 15.0, [], [])
    assert res_a["decision"] == "APPROVE"
    assert res_a["risk"]["composite_score"] == 14.75

    # 2. Suspicious -> VERIFY
    res_b = engine.evaluate("TXN_B", 45.0, 60.0, 80.0, 50.0, ["NEW_RECEIVER"], ["New receiver"])
    assert res_b["decision"] == "VERIFY"
    assert res_b["risk"]["composite_score"] == 56.5

    # 3. High Risk Outlier -> BLOCK
    res_c = engine.evaluate("TXN_C", 85.0, 75.0, 80.0, 60.0, ["HIGH_TRANSACTION_VELOCITY"], ["High velocity"])
    assert res_c["decision"] == "BLOCK"
    assert res_c["risk"]["composite_score"] == 77.75
    assert "Transaction exhibits statistical deviation from baseline profile" in res_c["reason_codes"]

    print("RiskEngine contract and validation tests passed.")
