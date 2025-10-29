"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Request Models
class EstimateRequest(BaseModel):
    """Manual emissions estimate with known provider/region"""
    latency_ms: int = Field(..., description="Inference latency in milliseconds", gt=0)
    provider: str = Field(..., description="AI provider (e.g., 'openai', 'anthropic')")
    region: str = Field(..., description="Datacenter region (e.g., 'us-east-1')")
    country_code: Optional[str] = Field(None, description="ISO country code (e.g., 'US', 'DK')")
    power_watts: Optional[float] = Field(400, description="Power draw in watts", gt=0)
    pue: Optional[float] = Field(1.2, description="Power Usage Effectiveness", ge=1.0, le=3.0)

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "latency_ms": 2500,
                "provider": "openai",
                "region": "us-east-1",
                "power_watts": 400,
                "pue": 1.2
            }]
        }
    }


class DetectAndEstimateRequest(BaseModel):
    """Auto-detect provider/region and estimate emissions"""
    api_endpoint: str = Field(..., description="AI API endpoint URL")
    latency_ms: int = Field(..., description="Request latency in milliseconds", gt=0)
    request_headers: Optional[dict] = Field(None, description="Request headers (optional)")
    response_headers: Optional[dict] = Field(None, description="Response headers (helps detection)")
    power_watts: Optional[float] = Field(400, description="Power draw in watts", gt=0)
    pue: Optional[float] = Field(1.2, description="Power Usage Effectiveness", ge=1.0, le=3.0)

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "api_endpoint": "https://api.openai.com/v1/chat/completions",
                "latency_ms": 2500,
                "response_headers": {
                    "server": "cloudflare",
                    "cf-ray": "8a1234567890abcd-CPH"
                },
                "power_watts": 400
            }]
        }
    }


# Response Models
class EstimateResponse(BaseModel):
    """Emissions estimate response"""
    emissions_g: float = Field(..., description="CO₂ emissions in grams")
    emissions_kg: float = Field(..., description="CO₂ emissions in kilograms")
    energy_kwh: float = Field(..., description="Energy consumed in kWh")
    grid_intensity_g_kwh: float = Field(..., description="Grid carbon intensity (g CO₂/kWh)")
    provider: str = Field(..., description="AI provider")
    region: str = Field(..., description="Datacenter region")
    confidence: str = Field(..., description="Estimate confidence: high/medium/low")
    detection_method: str = Field(..., description="How provider/region was determined")
    timestamp: str = Field(..., description="ISO 8601 timestamp")


class DetectAndEstimateResponse(BaseModel):
    """Auto-detected emissions estimate response"""
    emissions_g: float = Field(..., description="CO₂ emissions in grams")
    emissions_kg: float = Field(..., description="CO₂ emissions in kilograms")
    energy_kwh: float = Field(..., description="Energy consumed in kWh")
    grid_intensity_g_kwh: float = Field(..., description="Grid carbon intensity (g CO₂/kWh)")
    detected_provider: str = Field(..., description="Detected AI provider")
    detected_region: str = Field(..., description="Detected datacenter region")
    detected_country: str = Field(..., description="Detected country code")
    confidence: str = Field(..., description="Detection confidence: high/medium/low")
    detection_method: str = Field(..., description="Detection method used")
    detection_details: dict = Field(..., description="Detailed detection information")
    timestamp: str = Field(..., description="ISO 8601 timestamp")


# Info Models
class ProviderInfo(BaseModel):
    """Information about an AI provider"""
    name: str
    display_name: str
    known_endpoints: list[str]
    likely_regions: list[str]
    detection_accuracy: str


class RegionInfo(BaseModel):
    """Information about a datacenter region"""
    provider: str
    region_code: str
    country: str
    city: Optional[str] = None
    intensity_g_kwh: float
    coordinates: Optional[list[float]] = None
    renewable_percentage: Optional[float] = None
