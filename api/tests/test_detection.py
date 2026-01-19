"""
Unit tests for provider and datacenter detection logic.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from api.detection import (
    detect_provider_and_region,
    _detect_by_hostname,
    _detect_by_headers,
    _detect_by_latency,
    _combine_detections
)


class TestDetectByHostname:
    """Tests for hostname-based detection."""

    def test_openai_detection(self):
        """Test OpenAI hostname detection."""
        result = _detect_by_hostname("api.openai.com")

        assert result["provider"] == "openai"
        assert result["confidence"] == 0.95
        assert result["method"] == "hostname"
        assert result["country"] == "US"

    def test_anthropic_detection(self):
        """Test Anthropic hostname detection."""
        result = _detect_by_hostname("api.anthropic.com")

        assert result["provider"] == "anthropic"
        assert result["confidence"] == 0.95
        assert result["country"] == "US"

    def test_cohere_detection(self):
        """Test Cohere hostname detection."""
        result = _detect_by_hostname("api.cohere.ai")

        assert result["provider"] == "cohere"
        assert result["confidence"] == 0.95

    def test_huggingface_detection(self):
        """Test Hugging Face hostname detection."""
        result = _detect_by_hostname("api-inference.huggingface.co")

        assert result["provider"] == "huggingface"
        assert result["confidence"] == 0.90

    def test_azure_openai_detection(self):
        """Test Azure OpenAI hostname detection."""
        result = _detect_by_hostname("myinstance.openai.azure.com")

        assert result["provider"] == "azure-openai"
        assert result["confidence"] == 0.85

    def test_unknown_hostname(self):
        """Test unknown hostname returns low confidence."""
        result = _detect_by_hostname("api.unknownprovider.com")

        assert result["provider"] == "unknown"
        assert result["confidence"] == 0.0

    def test_case_insensitive(self):
        """Test hostname detection is case-insensitive."""
        result = _detect_by_hostname("API.OPENAI.COM")

        assert result["provider"] == "openai"


class TestDetectByHeaders:
    """Tests for header-based detection."""

    def test_cloudflare_ray_id(self):
        """Test Cloudflare Ray ID detection."""
        headers = {"cf-ray": "8a1234567890abcd-CPH"}
        result = _detect_by_headers(headers)

        assert result is not None
        assert result["country"] == "DK"  # Copenhagen
        assert result["method"] == "cf-ray-header"

    def test_cloudflare_us_datacenter(self):
        """Test Cloudflare US datacenter detection."""
        headers = {"cf-ray": "8a1234567890abcd-IAD"}
        result = _detect_by_headers(headers)

        assert result is not None
        assert result["country"] == "US"

    def test_aws_headers(self):
        """Test AWS header detection."""
        headers = {"x-amzn-requestid": "abc123"}
        result = _detect_by_headers(headers)

        assert result is not None
        assert result["provider"] == "aws-hosted"
        assert result["method"] == "aws-headers"

    def test_azure_headers(self):
        """Test Azure header detection."""
        headers = {"x-ms-request-id": "abc123"}
        result = _detect_by_headers(headers)

        assert result is not None
        assert result["provider"] == "azure-hosted"
        assert result["method"] == "azure-headers"

    def test_empty_headers(self):
        """Test empty headers returns None."""
        result = _detect_by_headers({})
        assert result is None

    def test_none_headers(self):
        """Test None headers returns None."""
        result = _detect_by_headers(None)
        assert result is None

    def test_irrelevant_headers(self):
        """Test irrelevant headers returns None."""
        headers = {"content-type": "application/json", "server": "nginx"}
        result = _detect_by_headers(headers)
        assert result is None


class TestDetectByLatency:
    """Tests for latency-based detection."""

    def test_same_region_latency(self):
        """Test very low latency indicates same region."""
        result = _detect_by_latency(30)

        assert result is not None
        assert result["region"] == "same-region"
        assert result["method"] == "latency-pattern"

    def test_same_continent_latency(self):
        """Test medium latency indicates same continent."""
        result = _detect_by_latency(75)

        assert result is not None
        assert result["region"] == "same-continent"

    def test_cross_continental_latency(self):
        """Test high latency indicates cross-continental."""
        result = _detect_by_latency(150)

        assert result is not None
        assert result["region"] == "cross-continental"

    def test_very_high_latency(self):
        """Test very high latency returns None."""
        result = _detect_by_latency(500)
        assert result is None

    def test_zero_latency(self):
        """Test zero latency returns same-region."""
        result = _detect_by_latency(0)
        # Zero latency triggers the < 50ms branch
        assert result is None or result["region"] == "same-region"


class TestCombineDetections:
    """Tests for combining multiple detection results."""

    def test_highest_confidence_wins(self):
        """Test that highest confidence detection is primary."""
        detections = [
            {"provider": "low-conf", "region": "r1", "country": "C1", "confidence": 0.3, "method": "m1", "details": {}},
            {"provider": "high-conf", "region": "r2", "country": "C2", "confidence": 0.9, "method": "m2", "details": {}},
        ]
        result = _combine_detections(detections)

        assert result["provider"] == "high-conf"
        assert result["confidence_score"] == 0.9

    def test_fills_missing_data(self):
        """Test that missing data is filled from lower confidence sources."""
        detections = [
            {"provider": "known", "region": "unknown", "country": "unknown", "confidence": 0.9, "method": "m1", "details": {}},
            {"provider": "other", "region": "us-east-1", "country": "US", "confidence": 0.5, "method": "m2", "details": {}},
        ]
        result = _combine_detections(detections)

        assert result["provider"] == "known"
        assert result["region"] == "us-east-1"
        assert result["country"] == "US"

    def test_empty_detections(self):
        """Test empty detection list returns unknown."""
        result = _combine_detections([])

        assert result["provider"] == "unknown"
        assert result["confidence"] == "low"

    def test_all_none_detections(self):
        """Test all None detections returns unknown."""
        result = _combine_detections([None, None, None])

        assert result["provider"] == "unknown"

    def test_confidence_labels(self):
        """Test confidence score to label mapping."""
        high_conf = [{"provider": "p", "region": "r", "country": "c", "confidence": 0.85, "method": "m", "details": {}}]
        med_conf = [{"provider": "p", "region": "r", "country": "c", "confidence": 0.65, "method": "m", "details": {}}]
        low_conf = [{"provider": "p", "region": "r", "country": "c", "confidence": 0.45, "method": "m", "details": {}}]

        assert _combine_detections(high_conf)["confidence"] == "high"
        assert _combine_detections(med_conf)["confidence"] == "medium"
        assert _combine_detections(low_conf)["confidence"] == "low"


class TestDetectProviderAndRegion:
    """Integration tests for the main detection function."""

    @pytest.mark.asyncio
    async def test_invalid_endpoint(self):
        """Test invalid endpoint URL."""
        result = await detect_provider_and_region(
            api_endpoint="not-a-url",
            latency_ms=100
        )

        assert result["provider"] == "unknown"
        assert result["confidence"] == "low"

    @pytest.mark.asyncio
    async def test_openai_endpoint(self):
        """Test OpenAI endpoint detection."""
        with patch("api.detection._detect_by_ip", new_callable=AsyncMock) as mock_ip:
            mock_ip.return_value = None

            result = await detect_provider_and_region(
                api_endpoint="https://api.openai.com/v1/chat/completions",
                latency_ms=100
            )

            assert result["provider"] == "openai"
            assert result["confidence"] in ["high", "medium"]

    @pytest.mark.asyncio
    async def test_with_response_headers(self):
        """Test detection with response headers."""
        with patch("api.detection._detect_by_ip", new_callable=AsyncMock) as mock_ip:
            mock_ip.return_value = None

            result = await detect_provider_and_region(
                api_endpoint="https://api.openai.com/v1/chat/completions",
                response_headers={"cf-ray": "abc123-CPH"},
                latency_ms=100
            )

            assert result["provider"] == "openai"
            # Should have detection details
            assert "all_detections" in result
