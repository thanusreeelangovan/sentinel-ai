from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.reads import DashboardSummary, RiskDistribution
from app.services.queries import get_dashboard_summary, get_risk_distribution

router = APIRouter()


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    return get_dashboard_summary(db)


@router.get("/dashboard/risk-distribution", response_model=RiskDistribution)
def dashboard_risk_distribution(db: Session = Depends(get_db)) -> RiskDistribution:
    return get_risk_distribution(db)
