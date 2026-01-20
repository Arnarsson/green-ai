"""
Structured Logging Configuration
--------------------------------
Production-ready logging with:
- JSON structured output for production
- Human-readable output for development
- Request ID tracking
- Performance timing
"""

import logging
import sys
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Optional
from contextvars import ContextVar
from functools import wraps

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from .config import settings

# Context variable for request ID (thread-safe)
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class JSONFormatter(logging.Formatter):
    """JSON log formatter for production environments."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add request ID if available
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)

        return json.dumps(log_data)


class TextFormatter(logging.Formatter):
    """Human-readable formatter for development."""

    def format(self, record: logging.LogRecord) -> str:
        request_id = request_id_var.get()
        request_id_str = f"[{request_id[:8]}] " if request_id else ""

        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        return (
            f"{timestamp} {record.levelname:8} {request_id_str}{record.name}: {record.getMessage()}"
        )


def setup_logging() -> logging.Logger:
    """
    Configure application logging.

    Returns:
        The root application logger
    """
    # Determine log level
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    # Create formatter based on environment
    if settings.log_format.lower() == "json" or settings.is_production:
        formatter = JSONFormatter()
    else:
        formatter = TextFormatter()

    # Configure handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.setLevel(log_level)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers = [handler]

    # Configure application logger
    app_logger = logging.getLogger("green_ai")
    app_logger.setLevel(log_level)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return app_logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for request/response logging with timing.

    Features:
    - Generates unique request ID for each request
    - Logs request details (method, path, client IP)
    - Logs response details (status code, duration)
    - Adds request ID to response headers
    """

    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("green_ai.requests")

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request_id_var.set(request_id)

        # Record start time
        start_time = time.perf_counter()

        # Get client info
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        query = str(request.query_params) if request.query_params else ""

        # Log request
        self.logger.info(
            f"Request started: {method} {path}",
            extra={
                "extra_data": {
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "query": query,
                    "client_ip": client_ip,
                    "event": "request_started",
                }
            },
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            # Log exception
            duration_ms = (time.perf_counter() - start_time) * 1000
            self.logger.error(
                f"Request failed: {method} {path} - {str(e)}",
                extra={
                    "extra_data": {
                        "request_id": request_id,
                        "method": method,
                        "path": path,
                        "duration_ms": round(duration_ms, 2),
                        "event": "request_failed",
                        "error": str(e),
                    }
                },
                exc_info=True,
            )
            raise

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Log response
        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        self.logger.log(
            log_level,
            f"Request completed: {method} {path} - {response.status_code} ({duration_ms:.2f}ms)",
            extra={
                "extra_data": {
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "event": "request_completed",
                }
            },
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response


def get_request_id() -> Optional[str]:
    """Get the current request ID."""
    return request_id_var.get()


def log_with_context(logger: logging.Logger, level: int, message: str, **extra):
    """
    Log a message with additional context data.

    Args:
        logger: Logger instance
        level: Log level (e.g., logging.INFO)
        message: Log message
        **extra: Additional context data to include
    """
    request_id = request_id_var.get()
    extra_data = {"request_id": request_id} if request_id else {}
    extra_data.update(extra)

    logger.log(level, message, extra={"extra_data": extra_data})


def timed_operation(operation_name: str):
    """
    Decorator to log operation timing.

    Args:
        operation_name: Name of the operation being timed
    """

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            logger = logging.getLogger("green_ai.timing")
            start = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.perf_counter() - start) * 1000
                log_with_context(
                    logger,
                    logging.DEBUG,
                    f"{operation_name} completed in {duration_ms:.2f}ms",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                log_with_context(
                    logger,
                    logging.ERROR,
                    f"{operation_name} failed after {duration_ms:.2f}ms: {e}",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                    error=str(e),
                )
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            logger = logging.getLogger("green_ai.timing")
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.perf_counter() - start) * 1000
                log_with_context(
                    logger,
                    logging.DEBUG,
                    f"{operation_name} completed in {duration_ms:.2f}ms",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.perf_counter() - start) * 1000
                log_with_context(
                    logger,
                    logging.ERROR,
                    f"{operation_name} failed after {duration_ms:.2f}ms: {e}",
                    operation=operation_name,
                    duration_ms=round(duration_ms, 2),
                    error=str(e),
                )
                raise

        if asyncio_iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def asyncio_iscoroutinefunction(func):
    """Check if function is async."""
    import asyncio

    return asyncio.iscoroutinefunction(func)
