"""
User Reporting Module for SentinelAI.
Provides secure endpoints for reporting extremely high-risk receivers.
"""

from app.reports.router import router
from app.reports.schemas import CreateReportRequest, ReportResponse

__all__ = ["router", "CreateReportRequest", "ReportResponse"]
