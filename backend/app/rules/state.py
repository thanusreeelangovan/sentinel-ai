from dataclasses import dataclass, field

from app.schemas.transaction import Transaction


@dataclass
class UserHistory:
    device_ids: set[str] = field(default_factory=set)
    receiver_ids: set[str] = field(default_factory=set)
    locations: set[tuple[float, float]] = field(default_factory=set)


_history: dict[str, UserHistory] = {}


def reset_rule_state() -> None:
    _history.clear()


def observe_user(transaction: Transaction) -> UserHistory:
    return _history.setdefault(transaction.user_id, UserHistory())
