"""
Unit tests for database lookup functions.
"""

from api.database import (
    get_grid_intensity,
    PROVIDER_DATABASE,
    DATACENTER_DATABASE,
    COUNTRY_GRID_INTENSITY,
)


class TestGetGridIntensity:
    """Tests for get_grid_intensity function."""

    def test_specific_aws_region(self):
        """Test lookup for specific AWS region."""
        result = get_grid_intensity(provider="aws", region="us-east-1")

        assert result["source"] == "datacenter"
        assert result["intensity_g_per_kwh"] == 380
        assert result["country"] == "US"

    def test_specific_azure_region(self):
        """Test lookup for specific Azure region."""
        result = get_grid_intensity(provider="azure", region="norwayeast")

        assert result["source"] == "datacenter"
        assert result["intensity_g_per_kwh"] == 20  # Norway is very clean
        assert result["country"] == "NO"

    def test_country_code_fallback(self):
        """Test country code fallback when region unknown."""
        result = get_grid_intensity(country_code="DK")

        assert result["source"] == "country"
        assert result["intensity_g_per_kwh"] == 120  # Denmark
        assert result["country"] == "DK"

    def test_country_code_case_insensitive(self):
        """Test country code is case-insensitive."""
        result_upper = get_grid_intensity(country_code="DK")
        result_lower = get_grid_intensity(country_code="dk")

        assert result_upper["intensity_g_per_kwh"] == result_lower["intensity_g_per_kwh"]

    def test_provider_likely_region(self):
        """Test fallback to provider's likely region."""
        result = get_grid_intensity(provider="openai")

        assert result["source"] == "provider_default"
        # OpenAI likely uses us-east-1 or us-west-2

    def test_global_average_fallback(self):
        """Test global average fallback when nothing matches."""
        result = get_grid_intensity(
            provider="unknown-provider", region="unknown-region", country_code="XX"
        )

        assert result["source"] == "global_average"
        assert result["intensity_g_per_kwh"] == 400

    def test_no_parameters(self):
        """Test with no parameters returns global average."""
        result = get_grid_intensity()

        assert result["source"] == "global_average"
        assert result["intensity_g_per_kwh"] == 400

    def test_renewable_percentage_included(self):
        """Test renewable percentage is included when available."""
        result = get_grid_intensity(provider="aws", region="eu-north-1")

        assert "renewable_pct" in result
        assert result["renewable_pct"] == 95  # Stockholm


class TestProviderDatabase:
    """Tests for PROVIDER_DATABASE structure."""

    def test_all_providers_have_required_fields(self):
        """Test all providers have required fields."""
        required_fields = ["display_name", "endpoints", "likely_regions", "detection_accuracy"]

        for provider_name, provider_data in PROVIDER_DATABASE.items():
            for field in required_fields:
                assert field in provider_data, f"{provider_name} missing {field}"

    def test_provider_endpoints_are_lists(self):
        """Test provider endpoints are lists."""
        for provider_name, provider_data in PROVIDER_DATABASE.items():
            assert isinstance(provider_data["endpoints"], list)
            assert len(provider_data["endpoints"]) > 0

    def test_known_providers_exist(self):
        """Test known providers are in database."""
        expected_providers = ["openai", "anthropic", "cohere", "huggingface"]

        for provider in expected_providers:
            assert provider in PROVIDER_DATABASE


class TestDatacenterDatabase:
    """Tests for DATACENTER_DATABASE structure."""

    def test_all_datacenters_have_required_fields(self):
        """Test all datacenters have required fields."""
        required_fields = ["country", "intensity_g_kwh"]

        for cloud_provider, regions in DATACENTER_DATABASE.items():
            for region_code, region_data in regions.items():
                for field in required_fields:
                    assert field in region_data, f"{cloud_provider}/{region_code} missing {field}"

    def test_intensity_values_reasonable(self):
        """Test intensity values are in reasonable range."""
        for cloud_provider, regions in DATACENTER_DATABASE.items():
            for region_code, region_data in regions.items():
                intensity = region_data["intensity_g_kwh"]
                assert (
                    0 < intensity < 1000
                ), f"{region_code} has unreasonable intensity: {intensity}"

    def test_known_cloud_providers_exist(self):
        """Test known cloud providers are in database."""
        expected_providers = ["aws", "azure", "gcp"]

        for provider in expected_providers:
            assert provider in DATACENTER_DATABASE


class TestCountryGridIntensity:
    """Tests for COUNTRY_GRID_INTENSITY data."""

    def test_intensity_values_reasonable(self):
        """Test all country intensities are reasonable."""
        for country, intensity in COUNTRY_GRID_INTENSITY.items():
            assert 0 < intensity < 1000, f"{country} has unreasonable intensity: {intensity}"

    def test_nordic_countries_are_clean(self):
        """Test Nordic countries have low carbon intensity."""
        nordic_countries = ["NO", "SE", "FI", "DK"]

        for country in nordic_countries:
            if country in COUNTRY_GRID_INTENSITY:
                assert COUNTRY_GRID_INTENSITY[country] < 200

    def test_coal_heavy_countries_are_dirty(self):
        """Test coal-heavy countries have high carbon intensity."""
        coal_countries = ["PL"]  # Poland

        for country in coal_countries:
            if country in COUNTRY_GRID_INTENSITY:
                assert COUNTRY_GRID_INTENSITY[country] > 500
