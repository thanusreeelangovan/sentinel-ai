from pydantic import BaseModel, ConfigDict


class TransactionReportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction_id: str
    reported: bool
    message: str
