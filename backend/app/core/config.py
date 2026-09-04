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
    if all([user, password, host, port, name]):
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"

    # Local fallback so the existing app can run without Docker/Postgres.
    return "sqlite:///./sentinelai.db"


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ORIGINS")
    if configured_origins:
        return [origin.strip() for origin in configured_origins.split(",") if origin.strip()]

    return ["http://localhost:3000", "http://127.0.0.1:3000"]
