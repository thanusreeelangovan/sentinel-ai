"""Explanation helpers that consume existing SentinelAI risk/decision output."""

from __future__ import annotations

from typing import Any, Iterable, Mapping, Optional, Sequence, Union

from app.explanation_reason.schemas import (
    DetailedExplanation,
    EngineDecision,
    ExplanationDecision,
    MinimalExplanation,
    RiskFactor,
    ShapFeatureContribution,
)
from app.risk.decision import decide
from app.risk.weights import (
    ANOMALY_WEIGHT,
    BEHAVIORAL_WEIGHT,
    RECEIVER_WEIGHT,
    VELOCITY_WEIGHT,
)
from app.schemas.evaluate import EvaluateResponse, ExplanationSignal, RiskBreakdown
from app.schemas.reads import TransactionRead

SIGNAL_DESCRIPTIONS: dict[str, str] = {
    "HIGH_ANOMALY": "the transaction pattern is highly anomalous compared with the user's history",
    "HIGH_TRANSACTION_VELOCITY": "transaction velocity is unusually high",
    "NEW_RECEIVER": "the beneficiary is new",
    "UNKNOWN_RECEIVER_TYPE": "the beneficiary type is not a recognized counterparty category",
    "UNUSUAL_AMOUNT": "the transaction amount is unusually high",
    "NEW_DEVICE": "the payment originated from a device not previously seen for this user",
    "NEW_LOCATION": "the transaction location differs from the user's usual locations",
    "UNUSUAL_HOUR": "the transaction occurred outside the user's typical hours",
}

SIGNAL_TO_COMPONENT: dict[str, str] = {
    "HIGH_ANOMALY": "anomaly",
    "HIGH_TRANSACTION_VELOCITY": "velocity",
    "NEW_RECEIVER": "receiver",
    "UNKNOWN_RECEIVER_TYPE": "receiver",
    "UNUSUAL_AMOUNT": "behavioral",
    "NEW_DEVICE": "behavioral",
    "NEW_LOCATION": "behavioral",
    "UNUSUAL_HOUR": "behavioral",
}

COMPONENT_WEIGHTS: dict[str, float] = {
    "anomaly": ANOMALY_WEIGHT,
    "velocity": VELOCITY_WEIGHT,
    "receiver": RECEIVER_WEIGHT,
    "behavioral": BEHAVIORAL_WEIGHT,
}

COMPONENT_CLAUSES: dict[str, str] = {
    "anomaly": "the transaction pattern is unusual compared with the user's history",
    "velocity": "transaction velocity is higher than usual",
    "receiver": "the beneficiary looks unfamiliar",
    "behavioral": "the payment behaviour differs from this user's normal pattern",
}

COMPONENT_SIGNAL_THRESHOLD = 40.0
ENGINE_DECISIONS: set[str] = {"APPROVE", "VERIFY", "BLOCK"}

_DECISION_ALIASES: dict[str, ExplanationDecision] = {
    "APPROVE": "APPROVE",
    "VERIFY": "MEDIUM_RISK",
    "BLOCK": "HIGH_RISK",
    "MEDIUM_RISK": "MEDIUM_RISK",
    "HIGH_RISK": "HIGH_RISK",
    "LOW": "APPROVE",
    "MEDIUM": "MEDIUM_RISK",
    "HIGH": "HIGH_RISK",
}

EvaluationSource = Union[EvaluateResponse, TransactionRead]


def map_explanation_decision(
    decision: Optional[str] = None,
    *,
    risk_level: Optional[str] = None,
    risk_score: Optional[float] = None,
) -> ExplanationDecision:
    """Map engine decisions (APPROVE/VERIFY/BLOCK) onto explanation decisions."""

    for raw in (decision, risk_level):
        if raw is None:
            continue
        mapped = _DECISION_ALIASES.get(str(raw).strip().upper())
        if mapped is not None:
            return mapped
    if risk_score is not None:
        return _DECISION_ALIASES[decide(risk_score)]
    return "APPROVE"


def engine_decision_from(
    decision: Optional[str] = None,
    *,
    risk_score: Optional[float] = None,
) -> Optional[EngineDecision]:
    if decision is not None:
        token = str(decision).strip().upper()
        if token in ENGINE_DECISIONS:
            return token  # type: ignore[return-value]
        mapped = _DECISION_ALIASES.get(token)
        if mapped == "APPROVE":
            return "APPROVE"
        if mapped == "MEDIUM_RISK":
            return "VERIFY"
        if mapped == "HIGH_RISK":
            return "BLOCK"
    if risk_score is not None:
        return decide(risk_score)
    return None


def format_shap_contributions(
    shap_features: Optional[Iterable[Any]] = None,
) -> Optional[list[ShapFeatureContribution]]:
    """Pass through existing SHAP values. Does not invent contributions."""

    if shap_features is None:
        return None

    formatted: list[ShapFeatureContribution] = []
    for item in shap_features:
        contribution = _coerce_shap_item(item)
        if contribution is not None:
            formatted.append(contribution)
    return formatted


def format_risk_signals(
    reason_codes: Optional[Sequence[str]] = None,
    reason_texts: Optional[Sequence[str]] = None,
    risk_breakdown: Optional[RiskBreakdown] = None,
) -> list[RiskFactor]:
    """Turn engine reason codes / breakdown scores into readable factors."""

    codes = [code for code in (reason_codes or []) if code]
    texts = list(reason_texts or [])
    text_by_code = _reason_text_by_code(codes, texts)
    component_counts = _component_counts(codes)

    factors: list[RiskFactor] = []
    seen: set[str] = set()
    for code in codes:
        if code in seen:
            continue
        seen.add(code)
        factors.append(
            RiskFactor(
                feature=code,
                description=_factor_description(code, text_by_code.get(code)),
                impact=_factor_impact(code, risk_breakdown, component_counts),
            )
        )

    if factors:
        return factors
    return _factors_from_breakdown(risk_breakdown)


def generate_minimal_explanation(
    *,
    decision: Optional[str] = None,
    reason_codes: Optional[Sequence[str]] = None,
    reason_texts: Optional[Sequence[str]] = None,
    risk_breakdown: Optional[RiskBreakdown] = None,
    risk_level: Optional[str] = None,
    risk_score: Optional[float] = None,
    transaction_id: Optional[str] = None,
) -> MinimalExplanation:
    """Build the short popup sentence from actual engine signals."""

    mapped = map_explanation_decision(
        decision, risk_level=risk_level, risk_score=risk_score
    )
    factors = format_risk_signals(reason_codes, reason_texts, risk_breakdown)
    return MinimalExplanation(
        transaction_id=transaction_id,
        decision=mapped,
        explanation=_minimal_text(mapped, factors),
    )


def generate_detailed_explanation(
    *,
    transaction_id: str,
    decision: Optional[str] = None,
    risk_score: float,
    reason_codes: Optional[Sequence[str]] = None,
    reason_texts: Optional[Sequence[str]] = None,
    risk_breakdown: Optional[RiskBreakdown] = None,
    shap_features: Optional[Iterable[Any]] = None,
    risk_level: Optional[str] = None,
) -> DetailedExplanation:
    """Build the View-button payload from existing evaluation data."""

    mapped = map_explanation_decision(
        decision, risk_level=risk_level, risk_score=risk_score
    )
    factors = format_risk_signals(reason_codes, reason_texts, risk_breakdown)
    return DetailedExplanation(
        transaction_id=transaction_id,
        decision=mapped,
        engine_decision=engine_decision_from(decision, risk_score=risk_score),
        risk_score=risk_score,
        summary=_summary_text(mapped, factors),
        factors=factors,
        shap_features=format_shap_contributions(shap_features),
        risk_breakdown=risk_breakdown,
    )


def generate_minimal_explanation_from_result(
    result: EvaluationSource,
    *,
    reason_texts: Optional[Sequence[str]] = None,
) -> MinimalExplanation:
    return generate_minimal_explanation(
        decision=result.decision,
        reason_codes=result.reason_codes,
        reason_texts=reason_texts,
        risk_breakdown=result.risk_breakdown,
        risk_level=getattr(result, "risk_level", None),
        risk_score=_risk_score(result),
        transaction_id=result.transaction_id,
    )


def generate_detailed_explanation_from_result(
    result: EvaluationSource,
    *,
    reason_texts: Optional[Sequence[str]] = None,
    shap_features: Optional[Iterable[Any]] = None,
) -> DetailedExplanation:
    return generate_detailed_explanation(
        transaction_id=result.transaction_id,
        decision=result.decision,
        risk_score=_risk_score(result),
        reason_codes=result.reason_codes,
        reason_texts=reason_texts,
        risk_breakdown=result.risk_breakdown,
        shap_features=shap_features,
        risk_level=getattr(result, "risk_level", None),
    )


def _risk_score(result: EvaluationSource) -> float:
    score = getattr(result, "risk_score", None)
    if score is not None:
        return float(score)
    return float(result.composite_score)


def _reason_text_by_code(
    codes: Sequence[str], texts: Sequence[str]
) -> dict[str, str]:
    mapping: dict[str, str] = {}
    if len(codes) == len(texts):
        for code, text in zip(codes, texts):
            if text:
                mapping[code] = text
        return mapping
    for index, text in enumerate(texts):
        if index < len(codes) and text:
            mapping[codes[index]] = text
    return mapping


def _component_counts(codes: Sequence[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for code in codes:
        component = SIGNAL_TO_COMPONENT.get(code)
        if component is None:
            continue
        counts[component] = counts.get(component, 0) + 1
    return counts


def _factor_description(code: str, reason_text: Optional[str]) -> str:
    if reason_text:
        return reason_text.rstrip(".") + "."
    clause = SIGNAL_DESCRIPTIONS.get(code)
    if clause:
        return clause[0].upper() + clause[1:] + "."
    return f"Signal {code} contributed to the risk decision."


def _factor_impact(
    code: str,
    risk_breakdown: Optional[RiskBreakdown],
    component_counts: Mapping[str, int],
) -> Optional[float]:
    if risk_breakdown is None:
        return None
    component = SIGNAL_TO_COMPONENT.get(code)
    if component is None:
        return None
    share = component_counts.get(component) or 1
    return _component_impact(risk_breakdown, component, share)


def _component_impact(
    risk_breakdown: RiskBreakdown,
    component: str,
    share: int = 1,
) -> float:
    score = float(getattr(risk_breakdown, component))
    weight = COMPONENT_WEIGHTS[component]
    impact = (score / 100.0) * weight / max(share, 1)
    return round(impact, 4)


def _factors_from_breakdown(
    risk_breakdown: Optional[RiskBreakdown],
) -> list[RiskFactor]:
    if risk_breakdown is None:
        return []
    factors: list[RiskFactor] = []
    for component, clause in COMPONENT_CLAUSES.items():
        score = float(getattr(risk_breakdown, component))
        if score < COMPONENT_SIGNAL_THRESHOLD:
            continue
        factors.append(
            RiskFactor(
                feature=component,
                description=clause[0].upper() + clause[1:] + ".",
                impact=_component_impact(risk_breakdown, component),
            )
        )
    return factors


def _clauses(factors: Sequence[RiskFactor]) -> list[str]:
    clauses: list[str] = []
    for factor in factors:
        clause = SIGNAL_DESCRIPTIONS.get(factor.feature)
        if clause is None:
            clause = factor.description.rstrip(".").lower()
            if clause.startswith("signal "):
                continue
        clauses.append(clause)
    return clauses


def _join_clauses(clauses: Sequence[str]) -> str:
    if not clauses:
        return ""
    if len(clauses) == 1:
        return clauses[0]
    if len(clauses) == 2:
        return f"{clauses[0]} and {clauses[1]}"
    return f"{', '.join(clauses[:-1])}, and {clauses[-1]}"


def _minimal_text(
    decision: ExplanationDecision, factors: Sequence[RiskFactor]
) -> Optional[str]:
    if decision == "APPROVE" and not factors:
        return None
    clauses = _clauses(factors)
    if not clauses:
        if decision == "APPROVE":
            return None
        return "This transaction was flagged because the composite risk score exceeded the safe threshold."
    return f"This transaction was flagged because {_join_clauses(clauses)}."


def _summary_text(
    decision: ExplanationDecision, factors: Sequence[RiskFactor]
) -> str:
    if decision == "APPROVE" and not factors:
        return "No risk concerns were detected."
    clauses = _clauses(factors)
    if not clauses:
        if decision == "HIGH_RISK":
            return "This transaction was classified as high risk."
        if decision == "MEDIUM_RISK":
            return "This transaction differs from the user's normal payment behaviour."
        return "No risk concerns were detected."
    if decision == "HIGH_RISK":
        return f"High-risk signals were detected because {_join_clauses(clauses)}."
    if decision == "MEDIUM_RISK":
        return f"This transaction differs from the user's normal payment behaviour because {_join_clauses(clauses)}."
    return f"Minor signals were recorded: {_join_clauses(clauses)}."


def _coerce_shap_item(item: Any) -> Optional[ShapFeatureContribution]:
    if isinstance(item, ShapFeatureContribution):
        return item
    if isinstance(item, Mapping):
        feature = item.get("feature")
        contribution = item.get("contribution")
        if feature is None or contribution is None:
            return None
        return ShapFeatureContribution(
            feature=str(feature),
            contribution=float(contribution),
        )
    return None


SIGNAL_COPY: dict[str, dict[str, str]] = {
    "HIGH_ANOMALY": {
        "name": "Unusual Pattern",
        "short_explanation": "This payment looks different from your usual activity.",
        "detailed_explanation": "Several aspects of this payment differ from how this account usually pays, which increased the risk rating.",
        "summary_clause": "an unusual payment pattern",
    },
    "HIGH_TRANSACTION_VELOCITY": {
        "name": "Transaction Velocity",
        "short_explanation": "Payments are happening more often than usual.",
        "detailed_explanation": "This account has made more payments in a short period than it typically does, which increased the risk rating.",
        "summary_clause": "higher than usual payment frequency",
    },
    "NEW_RECEIVER": {
        "name": "New Beneficiary",
        "short_explanation": "The recipient is new to this account.",
        "detailed_explanation": "The recipient has not previously received payments from this account, increasing the transaction's risk.",
        "summary_clause": "a new beneficiary",
    },
    "UNKNOWN_RECEIVER_TYPE": {
        "name": "Unfamiliar Beneficiary",
        "short_explanation": "The recipient type is not one this account usually pays.",
        "detailed_explanation": "The recipient category is not among the types this account typically pays, which increased the risk rating.",
        "summary_clause": "an unfamiliar beneficiary type",
    },
    "UNUSUAL_AMOUNT": {
        "name": "Unusual Amount",
        "short_explanation": "The transaction amount is higher than usual.",
        "detailed_explanation": "The transaction amount is significantly higher than the user's historical payment behaviour.",
        "summary_clause": "an unusually high amount",
    },
    "NEW_DEVICE": {
        "name": "Device Behaviour",
        "short_explanation": "This payment came from a device not usually used on this account.",
        "detailed_explanation": "The transaction originated from a device that has not been recently associated with the account.",
        "summary_clause": "an unfamiliar device",
    },
    "NEW_LOCATION": {
        "name": "Unusual Location",
        "short_explanation": "This payment was made from a location this account does not usually use.",
        "detailed_explanation": "The payment location differs from locations previously seen for this account, which increased the risk rating.",
        "summary_clause": "an unusual location",
    },
    "UNUSUAL_HOUR": {
        "name": "Unusual Time",
        "short_explanation": "This payment was made at an unusual time of day.",
        "detailed_explanation": "The payment occurred outside this account's typical hours, which increased the risk rating.",
        "summary_clause": "an unusual time of day",
    },
}

RECOMMENDED_ACTION = {
    "LOW": "No additional authentication is required.",
    "MEDIUM": "Additional authentication is required before completing the payment.",
    "HIGH": "Additional high-risk authentication is required before completing the payment.",
}


def generate_smartphone_explanation(
    *,
    risk_level: str,
    reason_codes: Optional[Sequence[str]] = None,
    risk_breakdown: Optional[RiskBreakdown] = None,
) -> tuple[str, str, str, list[ExplanationSignal]]:
    """Build user-facing summary, detailed reasoning, and per-signal copy.

    Uses only signals already produced by the existing risk/rule engines.
    """

    level = risk_level.upper() if risk_level else "LOW"
    if level not in RECOMMENDED_ACTION:
        level = "LOW"
    codes = [code for code in (reason_codes or []) if code]
    signals = _explanation_signals(codes, risk_breakdown, level)

    if level == "LOW" and not signals:
        summary = "No significant anomalous signals were detected."
        detailed = (
            "No significant anomalous signals were detected. "
            "The payment matches this account's usual behaviour."
        )
        return summary, detailed, RECOMMENDED_ACTION["LOW"], []

    clauses = [
        SIGNAL_COPY[code]["summary_clause"]
        for code in codes
        if code in SIGNAL_COPY
    ]
    if not clauses and signals:
        clauses = [signal.name.lower() for signal in signals]
    joined = _join_clauses(clauses) if clauses else "unusual payment behaviour"

    if level == "HIGH":
        summary = f"This transaction was flagged as high risk because it involves {joined}."
        detailed = (
            f"The transaction was classified as high risk because {joined}. "
            + " ".join(signal.detailed_explanation for signal in signals)
        )
    else:
        summary = f"This transaction appears unusual because it involves {joined}."
        detailed = (
            f"The transaction was classified as medium risk because multiple "
            f"behavioural and transactional signals deviated from the user's normal pattern. "
            f"It involves {joined}."
        )

    return summary, detailed, RECOMMENDED_ACTION[level], signals


def _signal_severity(
    code: str,
    risk_breakdown: Optional[RiskBreakdown],
    risk_level: str,
) -> str:
    if risk_breakdown is None:
        return risk_level if risk_level in {"LOW", "MEDIUM", "HIGH"} else "MEDIUM"
    component = SIGNAL_TO_COMPONENT.get(code)
    if component is None:
        return risk_level
    score = float(getattr(risk_breakdown, component))
    if score > 75:
        return "HIGH"
    if score > 40:
        return "MEDIUM"
    return "LOW"


def _explanation_signals(
    codes: Sequence[str],
    risk_breakdown: Optional[RiskBreakdown],
    risk_level: str,
) -> list[ExplanationSignal]:
    seen: set[str] = set()
    items: list[ExplanationSignal] = []
    for code in codes:
        copy = SIGNAL_COPY.get(code)
        if copy is None or code in seen:
            continue
        seen.add(code)
        items.append(
            ExplanationSignal(
                name=copy["name"],
                severity=_signal_severity(code, risk_breakdown, risk_level),
                short_explanation=copy["short_explanation"],
                detailed_explanation=copy["detailed_explanation"],
            )
        )
    if items:
        return items
    if risk_level == "LOW":
        return []
    for factor in _factors_from_breakdown(risk_breakdown):
        copy = SIGNAL_COPY.get(
            {
                "anomaly": "HIGH_ANOMALY",
                "velocity": "HIGH_TRANSACTION_VELOCITY",
                "receiver": "NEW_RECEIVER",
                "behavioral": "UNUSUAL_AMOUNT",
            }.get(factor.feature, ""),
            None,
        )
        if copy is None:
            continue
        items.append(
            ExplanationSignal(
                name=copy["name"],
                severity=risk_level if risk_level in {"LOW", "MEDIUM", "HIGH"} else "MEDIUM",
                short_explanation=copy["short_explanation"],
                detailed_explanation=copy["detailed_explanation"],
            )
        )
    return items
