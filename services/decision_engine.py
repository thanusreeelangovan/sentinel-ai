def make_decision(risk_score):
    if risk_score <= 40:
        return "APPROVE"
    elif risk_score <= 70:
        return "VERIFY"
    else:
        return "BLOCK"