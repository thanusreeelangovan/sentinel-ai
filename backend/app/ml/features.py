from app.schemas.transaction import Transaction

RECEIVER_TYPE_CODES = {
    "merchant": 0.0,
    "user": 1.0,
    "bank": 2.0,
    "bank_account": 2.0,
    "bank account": 2.0,
}
DEVICE_TYPE_CODES = {
    "android": 0.0,
    "ios": 1.0,
    "web": 2.0,
}
FEATURE_NAMES = [
    "amount",
    "account_age_days",
    "previous_transaction_count",
    "usual_min",
    "usual_max",
    "amount_to_usual_max",
    "amount_outside_range",
    "daily_rate",
    "hour",
    "has_location",
    "latitude",
    "longitude",
    "receiver_type_code",
    "device_type_code",
]


def extract_features(transaction: Transaction) -> list[float]:
    usual = transaction.user_context.usual_transaction_range
    usual_min = float(usual.min)
    usual_max = float(usual.max)
    amount = float(transaction.amount)
    account_age_days = float(max(transaction.user_context.account_age_days, 1))
    previous_transaction_count = float(
        transaction.user_context.previous_transaction_count
    )
    has_location = 0.0
    latitude = 0.0
    longitude = 0.0
    if (
        transaction.location is not None
        and transaction.location.latitude is not None
        and transaction.location.longitude is not None
    ):
        has_location = 1.0
        latitude = float(transaction.location.latitude)
        longitude = float(transaction.location.longitude)

    return [
        amount,
        account_age_days,
        previous_transaction_count,
        usual_min,
        usual_max,
        amount / max(usual_max, 1.0),
        1.0 if amount < usual_min or amount > usual_max else 0.0,
        previous_transaction_count / account_age_days,
        float(transaction.timestamp.hour),
        has_location,
        latitude,
        longitude,
        RECEIVER_TYPE_CODES.get(transaction.receiver_type.strip().lower(), -1.0),
        DEVICE_TYPE_CODES.get(transaction.device_type.strip().lower(), -1.0),
    ]
