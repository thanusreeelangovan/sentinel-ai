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
from app.schemas.evaluate import EvaluateResponse, RiskBreakdown
from app.schemas.reads import TransactionRead

MINIMAL_LABELS: dict[str, str] = {
    "HIGH_ANOMALY": "an unusual pattern",
    "HIGH_TRANSACTION_VELOCITY": "high payment velocity",
    "NEW_RECEIVER": "a new beneficiary",
    "UNKNOWN_RECEIVER_TYPE": "an unfamiliar beneficiary",
    "UNUSUAL_AMOUNT": "an unusual amount",
    "NEW_DEVICE": "an unfamiliar device",
    "NEW_LOCATION": "an unusual location",
    "UNUSUAL_HOUR": "an unusual time",
}

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
        summary=_detailed_analysis_text(
            risk_score, factors, risk_breakdown, format_shap_contributions(shap_features)
        ),
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


def _format_score(risk_score: float) -> str:
    return f"{float(risk_score):.2f}"


def _minimal_clauses(factors: Sequence[RiskFactor]) -> list[str]:
    clauses: list[str] = []
    for factor in factors:
        label = MINIMAL_LABELS.get(factor.feature)
        if label is None:
            continue
        clauses.append(label)
        if len(clauses) == 2:
            break
    return clauses


def _minimal_text(
    decision: ExplanationDecision, factors: Sequence[RiskFactor]
) -> Optional[str]:
    if decision == "APPROVE" and not factors:
        return None
    clauses = _minimal_clauses(factors)
    if not clauses:
        if decision == "APPROVE":
            return None
        return "This transaction was flagged due to elevated risk."
    return f"This transaction was flagged due to {_join_clauses(clauses)}."


def _detailed_analysis_text(
    risk_score: float,
    factors: Sequence[RiskFactor],
    risk_breakdown: Optional[RiskBreakdown] = None,
    shap_features: Optional[Sequence[ShapFeatureContribution]] = None,
) -> str:
    score = _format_score(risk_score)
    parts = [
        f"SentinelAI performed analysis and evaluated the risk score as {score}."
    ]
    if not factors:
        parts.append("No unusual anomalies were detected.")
    else:
        factor_bits = []
        for factor in factors:
            impact = (
                f" (impact {factor.impact:.4f})"
                if factor.impact is not None
                else ""
            )
            factor_bits.append(f"{factor.feature}: {factor.description.rstrip('.')}{impact}")
        parts.append("Detected factors: " + "; ".join(factor_bits) + ".")
    if risk_breakdown is not None:
        parts.append(
            "Risk components: "
            f"anomaly {float(risk_breakdown.anomaly):.1f}, "
            f"velocity {float(risk_breakdown.velocity):.1f}, "
            f"receiver {float(risk_breakdown.receiver):.1f}, "
            f"behavioural {float(risk_breakdown.behavioral):.1f}."
        )
    if shap_features:
        contrib_bits = [
            f"{item.feature} {item.contribution:+.4f}"
            for item in shap_features
        ][:8]
        if contrib_bits:
            parts.append("Feature contributions: " + ", ".join(contrib_bits) + ".")
    return " ".join(parts)


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


def generate_smartphone_explanation(
    *,
    risk_level: str,
    reason_codes: Optional[Sequence[str]] = None,
    risk_breakdown: Optional[RiskBreakdown] = None,
    risk_score: float = 0.0,
    shap_features: Optional[Iterable[Any]] = None,
) -> str:
    """Build the View-button analysis text from existing engine signals."""

    factors = format_risk_signals(reason_codes, None, risk_breakdown)
    return _detailed_analysis_text(
        risk_score,
        factors,
        risk_breakdown,
        format_shap_contributions(shap_features),
    )
