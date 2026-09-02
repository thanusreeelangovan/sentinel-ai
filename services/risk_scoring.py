def calculate_risk_score(
    ai_anomaly,
    transaction_velocity,
    receiver_risk,
    behavioral_deviation
):
    score = (
        ai_anomaly * 0.40
        + transaction_velocity * 0.25
        + receiver_risk * 0.20
        + behavioral_deviation * 0.15
    )

    return round(score)


def get_decision(score):
    if score <= 40:
        return "APPROVE"
    elif score <= 70:
        return "VERIFY"
    else:
        return "BLOCK"