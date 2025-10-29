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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import logging

from .models import (
    EstimateRequest,
    EstimateResponse,
    DetectAndEstimateRequest,
    DetectAndEstimateResponse,
    ProviderInfo,
    RegionInfo
)
from .detection import detect_provider_and_region
from .emissions import calculate_emissions
from .database import (
    PROVIDER_DATABASE,
    DATACENTER_DATABASE,
    get_grid_intensity
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🚀 Green AI API starting up...")
    yield
    logger.info("👋 Green AI API shutting down...")

# Create FastAPI app
app = FastAPI(
    title="Green AI API",
    description="Track CO₂ emissions from AI usage with automatic provider detection",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """API root - welcome message"""
    return {
        "message": "Welcome to Green AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "estimate": "POST /v1/estimate",
            "detect_and_estimate": "POST /v1/detect-and-estimate",
            "providers": "GET /v1/providers",
            "regions": "GET /v1/regions"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/v1/estimate", response_model=EstimateResponse)
@limiter.limit("100/hour")
async def estimate_emissions(request: Request, data: EstimateRequest):
    """
    Calculate CO₂ emissions for AI inference.

    Requires manual input of provider and region.
    Use /v1/detect-and-estimate for automatic detection.

    Rate limit: 100 requests per hour
    """
    try:
        # Get grid intensity
        grid_intensity = get_grid_intensity(
            provider=data.provider,
            region=data.region,
            country_code=data.country_code
        )

        # Calculate emissions
        result = calculate_emissions(
            latency_ms=data.latency_ms,
            power_watts=data.power_watts or 400,
            grid_intensity_g_kwh=grid_intensity["intensity_g_per_kwh"],
            pue=data.pue or 1.2
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
            timestamp=result["timestamp"]
        )

    except Exception as e:
        logger.error(f"Error in estimate_emissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/detect-and-estimate", response_model=DetectAndEstimateResponse)
@limiter.limit("100/hour")
async def detect_and_estimate(request: Request, data: DetectAndEstimateRequest):
    """
    Automatically detect AI provider and datacenter, then calculate emissions.

    Phase 1 accuracy: ~70%
    Will improve to 85-90% in future phases

    Rate limit: 100 requests per hour
    """
    try:
        # Detect provider and region
        detection = await detect_provider_and_region(
            api_endpoint=data.api_endpoint,
            request_headers=data.request_headers,
            response_headers=data.response_headers,
            latency_ms=data.latency_ms
        )

        # Get grid intensity
        grid_intensity = get_grid_intensity(
            provider=detection["provider"],
            region=detection["region"],
            country_code=detection["country"]
        )

        # Calculate emissions
        result = calculate_emissions(
            latency_ms=data.latency_ms,
            power_watts=data.power_watts or 400,
            grid_intensity_g_kwh=grid_intensity["intensity_g_per_kwh"],
            pue=data.pue or 1.2
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
            timestamp=result["timestamp"]
        )

    except Exception as e:
        logger.error(f"Error in detect_and_estimate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/providers", response_model=list[ProviderInfo])
async def list_providers():
    """List all supported AI providers and their known datacenters"""
    providers = []

    for provider_name, provider_data in PROVIDER_DATABASE.items():
        providers.append(ProviderInfo(
            name=provider_name,
            display_name=provider_data["display_name"],
            known_endpoints=provider_data["endpoints"],
            likely_regions=provider_data["likely_regions"],
            detection_accuracy=provider_data["detection_accuracy"]
        ))

    return providers


@app.get("/v1/regions", response_model=list[RegionInfo])
async def list_regions():
    """List all datacenter regions with carbon intensity data"""
    regions = []

    for provider, datacenters in DATACENTER_DATABASE.items():
        for region_code, region_data in datacenters.items():
            regions.append(RegionInfo(
                provider=provider,
                region_code=region_code,
                country=region_data["country"],
                city=region_data.get("city"),
                intensity_g_kwh=region_data["intensity_g_kwh"],
                coordinates=region_data.get("coords"),
                renewable_percentage=region_data.get("renewable_pct")
            ))

    return regions


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": f"The endpoint {request.url.path} does not exist",
            "docs": "/docs"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
