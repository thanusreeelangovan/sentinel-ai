from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.accounts import router as accounts_router
from app.api.dashboard import router as dashboard_router
from app.api.lookups import router as lookups_router
from app.api.transactions import router as transactions_router
from app.reports import router as reports_router
from app.db.session import init_db
from app.ml.iforest import get_iforest_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    get_iforest_service()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(transactions_router)
app.include_router(dashboard_router)
app.include_router(accounts_router)
app.include_router(lookups_router)
app.include_router(reports_router)


@app.get("/health")
def health():
    return {"status": "ok"}
