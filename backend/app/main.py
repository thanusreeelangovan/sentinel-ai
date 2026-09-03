from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.accounts import router as accounts_router
from app.api.dashboard import router as dashboard_router
from app.api.lookups import router as lookups_router
from app.api.transactions import router as transactions_router
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(transactions_router)
app.include_router(dashboard_router)
app.include_router(accounts_router)
app.include_router(lookups_router)


@app.get("/health")
def health():
    return {"status": "ok"}
