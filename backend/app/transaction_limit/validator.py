"""
UPI Transaction Amount Limit Validation Module.
Enforces NPCI and RBI regulatory cap of INR 100,000.00 for standard UPI transactions.
Owner: Krrish Kamath (AI/ML & Transaction Security Layer)
"""

from decimal import Decimal, InvalidOperation
from typing import Tuple, Optional


# NPCI & RBI Statutory Limits
MAX_UPI_LIMIT: Decimal = Decimal("100000.00")
MIN_UPI_LIMIT: Decimal = Decimal("1.00")

# Error message constants
ERR_CODE_EXCEEDED = "ERR_UPI_LIMIT_EXCEEDED"
ERR_CODE_MINIMUM = "ERR_INVALID_MINIMUM"
ERR_CODE_NEGATIVE = "ERR_NEGATIVE_AMOUNT"
ERR_CODE_NON_NUMERIC = "ERR_NON_NUMERIC_INPUT"
ERR_CODE_DECIMAL = "ERR_INVALID_DECIMAL"

ERROR_MESSAGES = {
    ERR_CODE_EXCEEDED: "Transaction limit exceeded: Maximum allowed amount per UPI transaction is ₹1,00,000.",
    ERR_CODE_MINIMUM: "Transaction amount must be at least ₹1.00.",
    ERR_CODE_NEGATIVE: "Negative or zero transaction amounts are prohibited.",
    ERR_CODE_NON_NUMERIC: "Please enter a valid numeric currency amount.",
    ERR_CODE_DECIMAL: "Currency precision cannot exceed 2 decimal places (paisa).",
}


class UpiLimitValidationError(ValueError):
    """Raised when a UPI transaction violates regulatory or formatting bounds."""
    def __init__(self, code: str, message: Optional[str] = None):
        self.code = code
        self.message = message or ERROR_MESSAGES.get(code, "Invalid transaction amount.")
        super().__init__(f"{self.code}: {self.message}")


def validate_upi_amount(amount: Decimal | float | int | str) -> Tuple[bool, Optional[str], Decimal]:
    """
    Validates that a proposed UPI transaction amount complies with NPCI/RBI statutory limits.

    Args:
        amount: Raw amount (Decimal, float, int, or string representation)

    Returns:
        Tuple[bool, Optional[str], Decimal]: (is_valid, error_code_or_none, sanitized_decimal_amount)
    """
    try:
        if isinstance(amount, float):
            # Avoid float binary representation artifacts
            val = Decimal(str(amount))
        else:
            val = Decimal(amount)
    except (InvalidOperation, TypeError, ValueError):
        return False, ERR_CODE_NON_NUMERIC, Decimal("0.00")

    if val <= Decimal("0.00"):
        return False, ERR_CODE_NEGATIVE, val

    if val < MIN_UPI_LIMIT:
        return False, ERR_CODE_MINIMUM, val

    if val > MAX_UPI_LIMIT:
        return False, ERR_CODE_EXCEEDED, val

    # Verify maximum 2 decimal places (paisa precision)
    if val.as_tuple().exponent < -2:
        return False, ERR_CODE_DECIMAL, val

    return True, None, val


def check_transaction_amount_limit(amount: Decimal) -> Decimal:
    """
    Direct validator for Pydantic field validators and route handlers.
    Raises UpiLimitValidationError on validation failure.
    """
    is_valid, err_code, sanitized = validate_upi_amount(amount)
    if not is_valid and err_code:
        raise UpiLimitValidationError(err_code)
    return sanitized
