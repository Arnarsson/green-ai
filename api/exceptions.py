"""
Custom Exception Classes
------------------------
Domain-specific exceptions for better error handling and reporting.
"""

from typing import Optional, Any


class GreenAIException(Exception):
    """Base exception for Green AI API."""

    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[dict] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict:
        """Convert exception to dictionary for API response."""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details
        }


class ValidationError(GreenAIException):
    """Raised when input validation fails."""

    def __init__(self, message: str, field: Optional[str] = None, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=422,
            details={"field": field, **(details or {})}
        )


class ProviderDetectionError(GreenAIException):
    """Raised when provider detection fails."""

    def __init__(self, message: str, endpoint: Optional[str] = None, details: Optional[dict] = None):
        super().__init__(
            message=message,
            error_code="DETECTION_ERROR",
            status_code=400,
            details={"endpoint": endpoint, **(details or {})}
        )


class ExternalServiceError(GreenAIException):
    """Raised when an external service call fails."""

    def __init__(
        self,
        message: str,
        service: str,
        original_error: Optional[Exception] = None,
        details: Optional[dict] = None
    ):
        super().__init__(
            message=message,
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=503,
            details={
                "service": service,
                "original_error": str(original_error) if original_error else None,
                **(details or {})
            }
        )


class RateLimitExceededError(GreenAIException):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after_seconds": retry_after}
        )


class ConfigurationError(GreenAIException):
    """Raised when there's a configuration issue."""

    def __init__(self, message: str, config_key: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="CONFIGURATION_ERROR",
            status_code=500,
            details={"config_key": config_key}
        )


class DataNotFoundError(GreenAIException):
    """Raised when requested data is not found."""

    def __init__(self, message: str, resource: Optional[str] = None, identifier: Optional[Any] = None):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "identifier": identifier}
        )
