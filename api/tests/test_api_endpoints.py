"""
Integration tests for API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from api.main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_check(self, client):
        """Test health check returns healthy status."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    def test_health_check_version(self, client):
        """Test health check returns correct version."""
        response = client.get("/health")

        data = response.json()
        assert data["version"] == "1.0.0"


class TestRootEndpoint:
    """Tests for / root endpoint."""

    def test_root_returns_welcome(self, client):
        """Test root endpoint returns welcome message."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Green AI" in data["message"]

    def test_root_lists_endpoints(self, client):
        """Test root endpoint lists available endpoints."""
        response = client.get("/")

        data = response.json()
        assert "endpoints" in data
        assert "estimate" in data["endpoints"]
        assert "detect_and_estimate" in data["endpoints"]


class TestEstimateEndpoint:
    """Tests for /v1/estimate endpoint."""

    def test_estimate_valid_request(self, client):
        """Test estimate with valid request."""
        response = client.post("/v1/estimate", json={
            "latency_ms": 2500,
            "provider": "openai",
            "region": "us-east-1",
            "power_watts": 400,
            "pue": 1.2
        })

        assert response.status_code == 200
        data = response.json()
        assert "emissions_g" in data
        assert "emissions_kg" in data
        assert "energy_kwh" in data
        assert data["provider"] == "openai"
        assert data["region"] == "us-east-1"

    def test_estimate_with_country_code(self, client):
        """Test estimate with country code fallback."""
        response = client.post("/v1/estimate", json={
            "latency_ms": 2500,
            "provider": "unknown-provider",
            "region": "unknown-region",
            "country_code": "DK",
            "power_watts": 400
        })

        assert response.status_code == 200
        data = response.json()
        # Denmark has low carbon intensity (~120 g/kWh)
        assert data["grid_intensity_g_kwh"] == 120

    def test_estimate_missing_latency(self, client):
        """Test estimate fails without latency."""
        response = client.post("/v1/estimate", json={
            "provider": "openai",
            "region": "us-east-1"
        })

        assert response.status_code == 422  # Validation error

    def test_estimate_invalid_latency(self, client):
        """Test estimate fails with negative latency."""
        response = client.post("/v1/estimate", json={
            "latency_ms": -100,
            "provider": "openai",
            "region": "us-east-1"
        })

        assert response.status_code == 422

    def test_estimate_invalid_pue(self, client):
        """Test estimate fails with invalid PUE."""
        response = client.post("/v1/estimate", json={
            "latency_ms": 2500,
            "provider": "openai",
            "region": "us-east-1",
            "pue": 0.5  # PUE must be >= 1.0
        })

        assert response.status_code == 422

    def test_estimate_default_values(self, client):
        """Test estimate uses default values."""
        response = client.post("/v1/estimate", json={
            "latency_ms": 2500,
            "provider": "openai",
            "region": "us-east-1"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["detection_method"] == "manual"
        assert data["confidence"] == "high"


class TestDetectAndEstimateEndpoint:
    """Tests for /v1/detect-and-estimate endpoint."""

    def test_detect_openai(self, client):
        """Test detection of OpenAI endpoint."""
        with patch("api.detection._detect_by_ip", new_callable=AsyncMock) as mock_ip:
            mock_ip.return_value = None

            response = client.post("/v1/detect-and-estimate", json={
                "api_endpoint": "https://api.openai.com/v1/chat/completions",
                "latency_ms": 2500
            })

            assert response.status_code == 200
            data = response.json()
            assert data["detected_provider"] == "openai"
            assert "emissions_g" in data

    def test_detect_anthropic(self, client):
        """Test detection of Anthropic endpoint."""
        with patch("api.detection._detect_by_ip", new_callable=AsyncMock) as mock_ip:
            mock_ip.return_value = None

            response = client.post("/v1/detect-and-estimate", json={
                "api_endpoint": "https://api.anthropic.com/v1/messages",
                "latency_ms": 1800
            })

            assert response.status_code == 200
            data = response.json()
            assert data["detected_provider"] == "anthropic"

    def test_detect_with_headers(self, client):
        """Test detection with response headers."""
        with patch("api.detection._detect_by_ip", new_callable=AsyncMock) as mock_ip:
            mock_ip.return_value = None

            response = client.post("/v1/detect-and-estimate", json={
                "api_endpoint": "https://api.openai.com/v1/chat/completions",
                "latency_ms": 2500,
                "response_headers": {
                    "cf-ray": "abc123-SJC"
                }
            })

            assert response.status_code == 200
            data = response.json()
            assert "detection_details" in data

    def test_detect_unknown_provider(self, client):
        """Test detection of unknown provider."""
        with patch("api.detection._detect_by_ip", new_callable=AsyncMock) as mock_ip:
            mock_ip.return_value = {
                "provider": "detected-via-ip",
                "region": "san francisco",
                "country": "US",
                "confidence": 0.65,
                "method": "ip-geolocation",
                "details": {"ip": "1.2.3.4"}
            }

            response = client.post("/v1/detect-and-estimate", json={
                "api_endpoint": "https://api.unknownprovider.com/v1/complete",
                "latency_ms": 2500
            })

            assert response.status_code == 200
            data = response.json()
            # Should still return a result with lower confidence
            assert "emissions_g" in data

    def test_detect_missing_endpoint(self, client):
        """Test detection fails without endpoint."""
        response = client.post("/v1/detect-and-estimate", json={
            "latency_ms": 2500
        })

        assert response.status_code == 422


class TestProvidersEndpoint:
    """Tests for /v1/providers endpoint."""

    def test_list_providers(self, client):
        """Test listing all providers."""
        response = client.get("/v1/providers")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_provider_fields(self, client):
        """Test provider response has required fields."""
        response = client.get("/v1/providers")

        data = response.json()
        provider = data[0]
        assert "name" in provider
        assert "display_name" in provider
        assert "known_endpoints" in provider
        assert "likely_regions" in provider
        assert "detection_accuracy" in provider

    def test_known_providers_included(self, client):
        """Test known providers are in the list."""
        response = client.get("/v1/providers")

        data = response.json()
        provider_names = [p["name"] for p in data]
        assert "openai" in provider_names
        assert "anthropic" in provider_names


class TestRegionsEndpoint:
    """Tests for /v1/regions endpoint."""

    def test_list_regions(self, client):
        """Test listing all regions."""
        response = client.get("/v1/regions")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_region_fields(self, client):
        """Test region response has required fields."""
        response = client.get("/v1/regions")

        data = response.json()
        region = data[0]
        assert "provider" in region
        assert "region_code" in region
        assert "country" in region
        assert "intensity_g_kwh" in region

    def test_multiple_providers_regions(self, client):
        """Test regions from multiple providers."""
        response = client.get("/v1/regions")

        data = response.json()
        providers = set(r["provider"] for r in data)
        assert len(providers) >= 2  # At least 2 different providers


class TestNotFoundHandler:
    """Tests for 404 error handling."""

    def test_unknown_endpoint(self, client):
        """Test 404 for unknown endpoint."""
        response = client.get("/v1/nonexistent")

        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert "docs" in data


class TestDocsEndpoint:
    """Tests for documentation endpoints."""

    def test_swagger_docs(self, client):
        """Test Swagger UI is available."""
        response = client.get("/docs")

        # Should redirect or return HTML
        assert response.status_code == 200

    def test_redoc_docs(self, client):
        """Test ReDoc is available."""
        response = client.get("/redoc")

        assert response.status_code == 200

    def test_openapi_schema(self, client):
        """Test OpenAPI schema is available."""
        response = client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data
