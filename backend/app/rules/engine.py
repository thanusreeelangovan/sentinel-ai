from app.rules.state import observe_user
from app.schemas.rules import RuleEngineResult
from app.schemas.transaction import Transaction

KNOWN_RECEIVER_TYPES = {
    "merchant",
    "user",
    "bank",
    "bank_account",
    "bank account",
}
NIGHTTIME_HOURS = range(0, 5)
LOCATION_SHIFT_DEGREES = 1.0


def _clamp(score: float) -> float:
    return round(min(100.0, max(0.0, score)), 1)


def _daily_rate(transaction: Transaction) -> float:
    account_age_days = max(transaction.user_context.account_age_days, 1)
    return transaction.user_context.previous_transaction_count / account_age_days


def _velocity(transaction: Transaction) -> tuple[float, list[str], list[str]]:
    rate = _daily_rate(transaction)
    if rate <= 1:
        return 10.0, [], []
    if rate <= 5:
        return 35.0, [], []
    if rate <= 20:
        return (
            75.0,
            ["HIGH_TRANSACTION_VELOCITY"],
            ["Multiple transactions detected within a short time window"],
        )
    return (
        95.0,
        ["HIGH_TRANSACTION_VELOCITY"],
        ["Multiple transactions detected within a short time window"],
    )


def _receiver(transaction: Transaction, is_new_receiver: bool) -> tuple[float, list[str], list[str]]:
    score = 5.0
    rules: list[str] = []
    reasons: list[str] = []

    if is_new_receiver or transaction.user_context.previous_transaction_count == 0:
        score += 60.0
        rules.append("NEW_RECEIVER")
        reasons.append("Receiver has limited transaction history")

    if transaction.receiver_type.strip().lower() not in KNOWN_RECEIVER_TYPES:
        score += 40.0
        rules.append("UNKNOWN_RECEIVER_TYPE")
        reasons.append("Receiver type is not a recognized counterparty category")

    return _clamp(score), rules, reasons


def _amount_outside_usual_range(transaction: Transaction) -> bool:
    usual = transaction.user_context.usual_transaction_range
    amount = transaction.amount
    return amount < usual.min or amount > usual.max


def _is_nighttime(transaction: Transaction) -> bool:
    return transaction.timestamp.hour in NIGHTTIME_HOURS


def _location_key(transaction: Transaction) -> tuple[float, float] | None:
    if transaction.location is None:
        return None
    if transaction.location.latitude is None or transaction.location.longitude is None:
        return None
    return (
        float(transaction.location.latitude),
        float(transaction.location.longitude),
    )


def _is_new_location(history_locations: set[tuple[float, float]], current: tuple[float, float]) -> bool:
    if not history_locations:
        return False
    for latitude, longitude in history_locations:
        if (
            abs(current[0] - latitude) < LOCATION_SHIFT_DEGREES
            and abs(current[1] - longitude) < LOCATION_SHIFT_DEGREES
        ):
            return False
    return True


def _behavioral(
    transaction: Transaction,
    is_new_device: bool,
    is_new_location: bool,
) -> tuple[float, list[str], list[str]]:
    score = 5.0
    rules: list[str] = []
    reasons: list[str] = []

    if _amount_outside_usual_range(transaction):
        score += 55.0
        rules.append("UNUSUAL_AMOUNT")
        reasons.append("Amount differs significantly from user's normal behavior")

    if is_new_device:
        score += 35.0
        rules.append("NEW_DEVICE")
        reasons.append("Transaction originated from a device not previously seen for this user")

    if is_new_location:
        score += 30.0
        rules.append("NEW_LOCATION")
        reasons.append("Transaction location differs from the user's observed locations")

    if _is_nighttime(transaction):
        score += 25.0
        rules.append("UNUSUAL_HOUR")
        reasons.append("Transaction occurred outside the user's typical daytime window")

    return _clamp(score), rules, reasons


def _history_flags(transaction: Transaction) -> tuple[bool, bool, bool]:
    history = observe_user(transaction)
    has_prior_history = transaction.user_context.previous_transaction_count > 0
    seen_user = bool(history.device_ids or history.receiver_ids)

    is_new_receiver = False
    is_new_device = False
    is_new_location = False
    current_location = _location_key(transaction)

    if not seen_user:
        if not has_prior_history:
            is_new_receiver = True
            is_new_device = True
        history.device_ids.add(transaction.device_id)
        history.receiver_ids.add(transaction.receiver_id)
        if current_location is not None:
            history.locations.add(current_location)
        return is_new_receiver, is_new_device, is_new_location

    if transaction.receiver_id not in history.receiver_ids:
        is_new_receiver = True
        history.receiver_ids.add(transaction.receiver_id)

    if transaction.device_id not in history.device_ids:
        is_new_device = True
        history.device_ids.add(transaction.device_id)

    if current_location is not None:
        is_new_location = _is_new_location(history.locations, current_location)
        history.locations.add(current_location)

    return is_new_receiver, is_new_device, is_new_location


def evaluate_rules(transaction: Transaction) -> RuleEngineResult:
    is_new_receiver, is_new_device, is_new_location = _history_flags(transaction)

    velocity_score, velocity_rules, velocity_reasons = _velocity(transaction)
    receiver_score, receiver_rules, receiver_reasons = _receiver(
        transaction, is_new_receiver
    )
    behavioral_score, behavioral_rules, behavioral_reasons = _behavioral(
        transaction, is_new_device, is_new_location
    )

    return RuleEngineResult(
        velocity_score=velocity_score,
        receiver_score=receiver_score,
        behavioral_score=behavioral_score,
        rules_triggered=velocity_rules + receiver_rules + behavioral_rules,
        reason_codes=velocity_reasons + receiver_reasons + behavioral_reasons,
    )
