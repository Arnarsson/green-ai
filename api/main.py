"""
Green AI API Service
--------------------
RESTful API for tracking CO₂ emissions from AI usage.

Provides:
- Automatic AI provider detection
- Datacenter location detection
- CO₂ emissions estimates
- Real-time grid intensity data

Version: 1.0.0 (MVP)
"""

from pathlib import Path
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import logging
import httpx
import time
from pydantic import BaseModel
from typing import Optional

from .config import settings
from .logging_config import setup_logging, RequestLoggingMiddleware, get_request_id
from .exceptions import GreenAIException
from .models import (
    EstimateRequest,
    EstimateResponse,
    DetectAndEstimateRequest,
    DetectAndEstimateResponse,
    ProviderInfo,
    RegionInfo,
)
from .detection import detect_provider_and_region
from .emissions import calculate_emissions
from .database import PROVIDER_DATABASE, DATACENTER_DATABASE, get_grid_intensity
from .analytics import analytics

# Setup logging
logger = setup_logging()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info(
        f"Green AI API starting up (version={settings.app_version}, env={settings.environment})"
    )
    yield
    logger.info("Green AI API shutting down")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Track CO₂ emissions from AI usage with automatic provider detection",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# Add middlewares (order matters - first added is outermost)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static files
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


# Dashboard route (main page)
@app.get("/", include_in_schema=False)
async def dashboard():
    """Serve the dashboard HTML as the main page"""
    index_path = Path(__file__).parent / "static" / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Dashboard not found")


# Legacy redirect from /dashboard
@app.get("/dashboard", include_in_schema=False)
async def dashboard_redirect():
    """Redirect old dashboard URL to root"""
    from fastapi.responses import RedirectResponse

    return RedirectResponse(url="/", status_code=301)


# Custom exception handler for GreenAIException
@app.exception_handler(GreenAIException)
async def green_ai_exception_handler(request: Request, exc: GreenAIException):
    """Handle custom exceptions with structured response."""
    response_data = exc.to_dict()
    response_data["request_id"] = get_request_id()
    return JSONResponse(status_code=exc.status_code, content=response_data)


# General exception handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unexpected error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred" if settings.is_production else str(exc),
            "request_id": get_request_id(),
        },
    )


@app.get("/api")
async def api_info():
    """API info - welcome message and endpoint list"""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "environment": settings.environment,
        "docs": "/docs",
        "endpoints": {
            "estimate": "POST /v1/estimate",
            "detect_and_estimate": "POST /v1/detect-and-estimate",
            "providers": "GET /v1/providers",
            "regions": "GET /v1/regions",
            "analytics": "GET /v1/analytics",
            "health": "GET /health",
            "metrics": "GET /metrics",
        },
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for container orchestration.

    Returns basic health status and version info.
    For detailed health including dependencies, use /health/detailed
    """
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/health/detailed")
async def detailed_health_check():
    """
    Detailed health check including dependency status.

    Checks:
    - API responsiveness
    - Configuration validity
    - External service reachability (optional)
    """
    health_status = {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
        "checks": {
            "api": {"status": "healthy"},
            "config": {"status": "healthy", "rate_limit": settings.rate_limit_string},
        },
    }

    # Check if any critical check failed
    all_healthy = all(
        check.get("status") == "healthy" for check in health_status["checks"].values()
    )
    health_status["status"] = "healthy" if all_healthy else "degraded"

    return health_status


@app.get("/metrics")
async def metrics():
    """
    Prometheus-compatible metrics endpoint.

    Returns metrics in Prometheus text format for scraping.
    """
    if not settings.enable_metrics:
        raise HTTPException(status_code=404, detail="Metrics endpoint disabled")

    # Basic metrics (can be expanded with prometheus_client)
    metrics_data = {
        "app_info": {"version": settings.app_version, "environment": settings.environment},
        "config": {
            "rate_limit": settings.rate_limit_string,
            "default_power_watts": settings.default_power_watts,
            "default_pue": settings.default_pue,
        },
    }
    return metrics_data


@app.post("/v1/estimate", response_model=EstimateResponse)
@limiter.limit(settings.rate_limit_string)
async def estimate_emissions_endpoint(request: Request, data: EstimateRequest):
    """
    Calculate CO₂ emissions for AI inference.

    Requires manual input of provider and region.
    Use /v1/detect-and-estimate for automatic detection.
    """
    request_logger = logging.getLogger("green_ai.estimate")

    # Get grid intensity
    grid_intensity = get_grid_intensity(
        provider=data.provider, region=data.region, country_code=data.country_code
    )

    # Calculate emissions
    result = calculate_emissions(
        latency_ms=data.latency_ms,
        power_watts=data.power_watts or settings.default_power_watts,
        grid_intensity_g_kwh=grid_intensity["intensity_g_per_kwh"],
        pue=data.pue or settings.default_pue,
    )

    request_logger.info(
        f"Emissions calculated: {result['emissions_g']:.4f}g CO2 "
        f"(provider={data.provider}, region={data.region})"
    )

    # Track analytics
    analytics.track_estimate(
        endpoint="/v1/estimate",
        provider=data.provider,
        region=data.region,
        country=grid_intensity.get("country"),
        emissions_g=result["emissions_g"],
        energy_kwh=result["energy_kwh"],
    )

    return EstimateResponse(
        emissions_g=result["emissions_g"],
        emissions_kg=result["emissions_kg"],
        energy_kwh=result["energy_kwh"],
        grid_intensity_g_kwh=grid_intensity["intensity_g_per_kwh"],
        provider=data.provider,
        region=data.region,
        confidence="high",
        detection_method="manual",
        timestamp=result["timestamp"],
    )


@app.post("/v1/detect-and-estimate", response_model=DetectAndEstimateResponse)
@limiter.limit(settings.rate_limit_string)
async def detect_and_estimate_endpoint(request: Request, data: DetectAndEstimateRequest):
    """
    Automatically detect AI provider and datacenter, then calculate emissions.

    Phase 1 accuracy: ~70%
    Will improve to 85-90% in future phases
    """
    request_logger = logging.getLogger("green_ai.detect")

    # Detect provider and region
    detection = await detect_provider_and_region(
        api_endpoint=data.api_endpoint,
        request_headers=data.request_headers,
        response_headers=data.response_headers,
        latency_ms=data.latency_ms,
    )

    request_logger.info(
        f"Provider detected: {detection['provider']} "
        f"(region={detection['region']}, confidence={detection['confidence']})"
    )

    # Get grid intensity
    grid_intensity = get_grid_intensity(
        provider=detection["provider"],
        region=detection["region"],
        country_code=detection["country"],
    )

    # Calculate emissions
    result = calculate_emissions(
        latency_ms=data.latency_ms,
        power_watts=data.power_watts or settings.default_power_watts,
        grid_intensity_g_kwh=grid_intensity["intensity_g_per_kwh"],
        pue=data.pue or settings.default_pue,
    )

    # Track analytics
    analytics.track_estimate(
        endpoint="/v1/detect-and-estimate",
        provider=detection["provider"],
        region=detection["region"],
        country=detection["country"],
        emissions_g=result["emissions_g"],
        energy_kwh=result["energy_kwh"],
    )

    return DetectAndEstimateResponse(
        emissions_g=result["emissions_g"],
        emissions_kg=result["emissions_kg"],
        energy_kwh=result["energy_kwh"],
        grid_intensity_g_kwh=grid_intensity["intensity_g_per_kwh"],
        detected_provider=detection["provider"],
        detected_region=detection["region"],
        detected_country=detection["country"],
        confidence=detection["confidence"],
        detection_method=detection["method"],
        detection_details=detection["details"],
        timestamp=result["timestamp"],
    )


@app.get("/v1/providers", response_model=list[ProviderInfo])
async def list_providers():
    """List all supported AI providers and their known datacenters"""
    providers = []

    for provider_name, provider_data in PROVIDER_DATABASE.items():
        providers.append(
            ProviderInfo(
                name=provider_name,
                display_name=provider_data["display_name"],
                known_endpoints=provider_data["endpoints"],
                likely_regions=provider_data["likely_regions"],
                detection_accuracy=provider_data["detection_accuracy"],
            )
        )

    return providers


@app.get("/v1/regions", response_model=list[RegionInfo])
async def list_regions():
    """List all datacenter regions with carbon intensity data"""
    regions = []

    for provider, datacenters in DATACENTER_DATABASE.items():
        for region_code, region_data in datacenters.items():
            regions.append(
                RegionInfo(
                    provider=provider,
                    region_code=region_code,
                    country=region_data["country"],
                    city=region_data.get("city"),
                    intensity_g_kwh=region_data["intensity_g_kwh"],
                    coordinates=region_data.get("coords"),
                    renewable_percentage=region_data.get("renewable_pct"),
                )
            )

    return regions


@app.get("/v1/analytics")
async def get_analytics():
    """
    Get usage analytics and statistics.

    Returns aggregated data about API usage, emissions tracked,
    and popular providers/regions.
    """
    return analytics.get_stats()


# ============================================
# OPENROUTER DETECTION PROXY
# ============================================

# Session tracking for rate limiting (in-memory, resets on restart)
_session_calls: dict[str, int] = {}


class DetectDatacenterRequest(BaseModel):
    """Request model for datacenter detection"""

    model: str  # OpenRouter model ID (e.g., "openai/gpt-4o")
    session_id: str  # Client session ID for rate limiting


class DetectDatacenterResponse(BaseModel):
    """Response model for datacenter detection"""

    success: bool
    latency_ms: Optional[int] = None
    cf_ray: Optional[str] = None
    detected_model: Optional[str] = None
    confidence: Optional[str] = None
    likely_region: Optional[str] = None
    remaining_calls: int
    error: Optional[str] = None


@app.get("/v1/detect-datacenter/status")
async def detect_datacenter_status(session_id: str = "default"):
    """
    Check if OpenRouter detection is available and how many calls remain.
    """
    max_calls = settings.openrouter_max_calls_per_session
    used_calls = _session_calls.get(session_id, 0)
    remaining = max(0, max_calls - used_calls)

    return {
        "available": bool(settings.openrouter_api_key),
        "remaining_calls": remaining,
        "max_calls": max_calls,
    }


@app.post("/v1/detect-datacenter", response_model=DetectDatacenterResponse)
async def detect_datacenter(request: Request, data: DetectDatacenterRequest):
    """
    Proxy endpoint for OpenRouter API to detect actual datacenter location.

    Makes a minimal API call to OpenRouter and measures latency + parses
    response headers to determine the likely datacenter region.

    Rate limited to OPENROUTER_MAX_CALLS_PER_SESSION per session.
    """
    # Check if API key is configured
    if not settings.openrouter_api_key:
        return DetectDatacenterResponse(
            success=False,
            remaining_calls=0,
            error="OpenRouter API key not configured",
        )

    # Check session rate limit
    max_calls = settings.openrouter_max_calls_per_session
    used_calls = _session_calls.get(data.session_id, 0)
    remaining = max(0, max_calls - used_calls)

    if remaining <= 0:
        return DetectDatacenterResponse(
            success=False,
            remaining_calls=0,
            error=f"Session limit reached ({max_calls} calls per session)",
        )

    # Increment call counter
    _session_calls[data.session_id] = used_calls + 1
    remaining = max(0, max_calls - used_calls - 1)

    try:
        start_time = time.perf_counter()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": str(request.base_url),
                    "X-Title": "Green AI Carbon Calculator",
                },
                json={
                    "model": data.model,
                    "messages": [{"role": "user", "content": "hi"}],
                    "max_tokens": 1,
                },
            )

        end_time = time.perf_counter()
        latency_ms = int((end_time - start_time) * 1000)

        # Parse response
        cf_ray = response.headers.get("cf-ray")
        response_data = response.json()
        detected_model = response_data.get("model")

        # Determine confidence and region from latency
        if latency_ms < 50:
            confidence = "high"
            likely_region = "same_region"
        elif latency_ms < 150:
            confidence = "medium"
            likely_region = "same_continent"
        else:
            confidence = "low"
            likely_region = "cross_continental"

        logger.info(
            f"OpenRouter detection: model={data.model}, latency={latency_ms}ms, "
            f"confidence={confidence}, session={data.session_id}"
        )

        return DetectDatacenterResponse(
            success=True,
            latency_ms=latency_ms,
            cf_ray=cf_ray,
            detected_model=detected_model,
            confidence=confidence,
            likely_region=likely_region,
            remaining_calls=remaining,
        )

    except httpx.TimeoutException:
        return DetectDatacenterResponse(
            success=False,
            remaining_calls=remaining,
            error="Request timed out",
        )
    except Exception as e:
        logger.error(f"OpenRouter detection failed: {e}")
        return DetectDatacenterResponse(
            success=False,
            remaining_calls=remaining,
            error=str(e),
        )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "NOT_FOUND",
            "message": f"The endpoint {request.url.path} does not exist",
            "docs": "/docs",
            "request_id": get_request_id(),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host=settings.host, port=settings.port, reload=not settings.is_production
    )
