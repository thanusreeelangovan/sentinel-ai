"""Rule Engine signal evaluation and sliding-window state tracking."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, List, Set, Tuple
from backend.app.schemas.transaction import ReceiverType, TransactionSchema


class RuleEngine:
    def __init__(self, window_short_min: int = 10, window_long_min: int = 60) -> None:
        self.w_short = timedelta(minutes=window_short_min)
        self.w_long = timedelta(minutes=window_long_min)
        self._user_history: Dict[str, deque[datetime]] = defaultdict(deque)
        self._user_receivers: Dict[str, Set[str]] = defaultdict(set)

    def _evict_old(self, user_id: str, current_time: datetime) -> None:
        window_start = current_time - self.w_long
        queue = self._user_history[user_id]
        while queue and queue[0] < window_start:
            queue.popleft()

    def _calc_velocity(self, user_id: str, ts: datetime) -> Tuple[float, bool]:
        self._evict_old(user_id, ts)
        q = self._user_history[user_id]
        cutoff_short = ts - self.w_short
        short_count = sum(1 for t in q if t >= cutoff_short)
        long_count = len(q)

        # Scale velocity: >3 in 10m or >8 in 60m triggers high risk
        score = min(100.0, (short_count * 20.0) + (long_count * 5.0))
        triggered = short_count >= 3 or long_count >= 8
        return round(score, 2), triggered

    def _calc_receiver_risk(self, user_id: str, receiver_id: str, receiver_type: ReceiverType) -> Tuple[float, bool]:
        known = receiver_id in self._user_receivers[user_id]
        is_p2p = receiver_type == ReceiverType.USER

        if known:
            score = 10.0 if not is_p2p else 25.0
            triggered = False
        else:
            score = 65.0 if not is_p2p else 80.0
            triggered = True
        return round(score, 2), triggered

    def _calc_behavioral_risk(self, amount: float, u_min: float, u_max: float) -> Tuple[float, bool]:
        if amount <= u_max:
            ratio = max(0.0, (amount - u_min) / max(u_max - u_min, 1.0))
            score = ratio * 35.0
            triggered = False
        else:
            multiplier = amount / max(u_max, 1.0)
            score = min(100.0, 40.0 + (multiplier - 1.0) * 30.0)
            triggered = multiplier >= 1.5
        return round(score, 2), triggered

    def evaluate(self, txn: TransactionSchema) -> Dict[str, Any]:
        rules_triggered: List[str] = []
        reason_codes: List[str] = []

        v_score, v_trig = self._calc_velocity(txn.user_id, txn.timestamp)
        if v_trig:
            rules_triggered.append("HIGH_TRANSACTION_VELOCITY")
            reason_codes.append("Multiple transactions detected within a short time window")

        r_score, r_trig = self._calc_receiver_risk(txn.user_id, txn.receiver_id, txn.receiver_type)
        if r_trig:
            rules_triggered.append("NEW_RECEIVER")
            reason_codes.append("Receiver has limited transaction history")

        u_range = txn.user_context.usual_transaction_range
        b_score, b_trig = self._calc_behavioral_risk(txn.amount, u_range.min, u_range.max)
        if b_trig:
            rules_triggered.append("UNUSUAL_AMOUNT")
            reason_codes.append("Amount differs significantly from user's normal behavior")

        # Record state post-evaluation
        self._user_history[txn.user_id].append(txn.timestamp)
        self._user_receivers[txn.user_id].add(txn.receiver_id)

        return {
            "velocity_score": v_score,
            "receiver_score": r_score,
            "behavioral_score": b_score,
            "rules_triggered": rules_triggered,
            "reason_codes": reason_codes,
        }


if __name__ == "__main__":
    from datetime import timezone

    engine = RuleEngine()
    now = datetime.now(timezone.utc)
    base_context = {
        "account_age_days": 100,
        "previous_transaction_count": 20,
        "usual_transaction_range": {"min": 100.0, "max": 2000.0},
    }

    # 1. Normal Transaction (known baseline)
    txn_norm = TransactionSchema(
        transaction_id="TX_1",
        user_id="U1",
        amount=500.0,
        currency="INR",
        receiver_id="REC_MERCHANT_1",
        receiver_type="merchant",
        timestamp=now,
        device_id="D1",
        device_type="android",
        user_context=base_context,
    )
    res_norm = engine.evaluate(txn_norm)
    assert res_norm["velocity_score"] == 0.0
    assert "NEW_RECEIVER" in res_norm["rules_triggered"]

    # 2. Burst Transactions (velocity trigger)
    for i in range(2, 6):
        t = TransactionSchema(
            transaction_id=f"TX_{i}",
            user_id="U1",
            amount=500.0,
            currency="INR",
            receiver_id="REC_MERCHANT_1",
            receiver_type="merchant",
            timestamp=now + timedelta(seconds=i * 10),
            device_id="D1",
            device_type="android",
            user_context=base_context,
        )
        res_v = engine.evaluate(t)

    assert "HIGH_TRANSACTION_VELOCITY" in res_v["rules_triggered"]
    assert res_v["velocity_score"] >= 75.0

    # 3. Extreme amount trigger
    txn_high = TransactionSchema(
        transaction_id="TX_HIGH",
        user_id="U2",
        amount=10000.0,
        currency="INR",
        receiver_id="REC_P2P",
        receiver_type="user",
        timestamp=now,
        device_id="D2",
        device_type="web",
        user_context=base_context,
    )
    res_high = engine.evaluate(txn_high)
    assert "UNUSUAL_AMOUNT" in res_high["rules_triggered"]
    assert res_high["behavioral_score"] >= 80.0
    print("All RuleEngine contract and unit tests passed.")

