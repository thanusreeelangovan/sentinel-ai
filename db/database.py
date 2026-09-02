import sqlite3
import os


DB_NAME = "db/sentinelai.db"


def get_connection():

    os.makedirs("db", exist_ok=True)

    return sqlite3.connect(DB_NAME)


def create_tables():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT UNIQUE,
            user TEXT,
            amount REAL,
            risk_score INTEGER,
            decision TEXT,
            anomaly_flag TEXT
        )
        """
    )

    # Check existing columns
    cursor.execute(
        "PRAGMA table_info(transactions)"
    )

    columns = [
        row[1]
        for row in cursor.fetchall()
    ]

    # Add anomaly_flag if old database does not have it
    if "anomaly_flag" not in columns:

        cursor.execute(
            """
            ALTER TABLE transactions
            ADD COLUMN anomaly_flag TEXT DEFAULT 'None'
            """
        )

    connection.commit()
    connection.close()


def save_transaction(
    transaction_id,
    user,
    amount,
    risk_score,
    decision,
    anomaly_flag="None"
):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT OR REPLACE INTO transactions
        (
            transaction_id,
            user,
            amount,
            risk_score,
            decision,
            anomaly_flag
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            transaction_id,
            user,
            amount,
            risk_score,
            decision,
            anomaly_flag
        )
    )

    connection.commit()
    connection.close()


def get_transactions():

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            transaction_id,
            user,
            amount,
            risk_score,
            decision,
            anomaly_flag
        FROM transactions
        ORDER BY id DESC
        """
    )

    transactions = cursor.fetchall()

    connection.close()

    return transactions


def delete_transaction(transaction_id):

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM transactions
        WHERE transaction_id = ?
        """,
        (transaction_id,)
    )

    connection.commit()
    connection.close()

def delete_all_transactions():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("DELETE FROM transactions")

    conn.commit()
    conn.close()
    
# Create database when this file is run
create_tables()


if __name__ == "__main__":

    print(
        "Database and tables created successfully."
    )