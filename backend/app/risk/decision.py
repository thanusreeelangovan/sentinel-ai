from typing import Literal

from app.risk.thresholds import APPROVE_MAX_SCORE, VERIFY_MAX_SCORE

Decision = Literal["APPROVE", "VERIFY", "BLOCK"]


def decide(composite_score: float) -> Decision:
    if composite_score <= APPROVE_MAX_SCORE:
        return "APPROVE"
    if composite_score <= VERIFY_MAX_SCORE:
        return "VERIFY"
    return "BLOCK"
