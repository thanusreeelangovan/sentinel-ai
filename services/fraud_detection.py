from sklearn.ensemble import IsolationForest


def train_fraud_model(data):
    features = data[[
        "amount",
        "risk_score"
    ]]

    model = IsolationForest(
        n_estimators=100,
        contamination=0.1,
        random_state=42
    )

    model.fit(features)

    return model


def detect_anomaly(model, amount, risk_score):
    data = [[amount, risk_score]]

    prediction = model.predict(data)

    return prediction[0] == -1