"""
Pytest configuration and fixtures for Green AI API tests.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from api.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_ip_geolocation():
    """Mock IP geolocation API responses."""
    mock_response = {
        "status": "success",
        "country": "United States",
        "countryCode": "US",
        "city": "San Francisco",
        "lat": 37.7749,
        "lon": -122.4194,
        "isp": "Cloudflare",
    }

    with patch("api.detection.httpx.AsyncClient") as mock_client:
        mock_instance = AsyncMock()
        mock_instance.__aenter__.return_value = mock_instance
        mock_instance.__aexit__.return_value = None
        mock_instance.get.return_value.status_code = 200
        mock_instance.get.return_value.json.return_value = mock_response
        mock_client.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def sample_estimate_request():
    """Sample request for /v1/estimate endpoint."""
    return {
        "latency_ms": 2500,
        "provider": "openai",
        "region": "us-east-1",
        "power_watts": 400,
        "pue": 1.2,
    }


@pytest.fixture
def sample_detect_request():
    """Sample request for /v1/detect-and-estimate endpoint."""
    return {
        "api_endpoint": "https://api.openai.com/v1/chat/completions",
        "latency_ms": 2500,
        "response_headers": {"server": "cloudflare", "cf-ray": "8a1234567890abcd-SJC"},
        "power_watts": 400,
        "pue": 1.2,
    }


@pytest.fixture
def sample_anthropic_request():
    """Sample request for Anthropic API detection."""
    return {
        "api_endpoint": "https://api.anthropic.com/v1/messages",
        "latency_ms": 1800,
        "power_watts": 400,
    }
