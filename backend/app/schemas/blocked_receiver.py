from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BlockReceiverRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sender_id: str
    receiver_id: str
    receiver_name: str | None = None


class BlockedReceiverResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sender_id: str
    receiver_id: str
    receiver_name: str | None = None
    blocked_at: datetime
