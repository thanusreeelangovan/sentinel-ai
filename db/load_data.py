import pandas as pd
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import save_transaction


def load_transactions():
    data = pd.read_csv("data/transactions.csv")

    for _, row in data.iterrows():
        save_transaction(
            row["transaction_id"],
            row["user"],
            row["amount"],
            row["risk_score"],
            row["decision"],
            row.get("anomaly_flag", "None")
        )

    print("Transactions loaded into database successfully.")


if __name__ == "__main__":
    load_transactions()