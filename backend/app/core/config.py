import os

from dotenv import load_dotenv

load_dotenv()


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST")
    port = os.getenv("POSTGRES_PORT")
    name = os.getenv("POSTGRES_DB")
    if not all([user, password, host, port, name]):
        raise RuntimeError(
            "Database configuration is missing. Set DATABASE_URL or "
            "POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, and POSTGRES_DB."
        )
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"
