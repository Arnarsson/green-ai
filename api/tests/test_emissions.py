"""
Unit tests for emissions calculation logic.
"""

import pytest
from api.emissions import calculate_emissions, emissions_to_comparison


class TestCalculateEmissions:
    """Tests for calculate_emissions function."""

    def test_basic_calculation(self):
        """Test basic emissions calculation with standard inputs."""
        result = calculate_emissions(
            latency_ms=1000,  # 1 second
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.2
        )

        assert "emissions_g" in result
        assert "emissions_kg" in result
        assert "energy_kwh" in result
        assert "timestamp" in result
        assert result["pue"] == 1.2
        assert result["power_watts"] == 400
        assert result["latency_ms"] == 1000

    def test_emissions_scale_with_latency(self):
        """Verify emissions scale linearly with latency."""
        result_1s = calculate_emissions(
            latency_ms=1000,
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.0
        )
        result_2s = calculate_emissions(
            latency_ms=2000,
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.0
        )

        # 2x latency should give 2x emissions (with small tolerance for rounding)
        assert abs(result_2s["emissions_g"] - 2 * result_1s["emissions_g"]) < 0.001

    def test_emissions_scale_with_power(self):
        """Verify emissions scale linearly with power consumption."""
        result_400w = calculate_emissions(
            latency_ms=1000,
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.0
        )
        result_800w = calculate_emissions(
            latency_ms=1000,
            power_watts=800,
            grid_intensity_g_kwh=400,
            pue=1.0
        )

        # 2x power should give 2x emissions (with small tolerance for rounding)
        assert abs(result_800w["emissions_g"] - 2 * result_400w["emissions_g"]) < 0.001

    def test_pue_multiplier(self):
        """Verify PUE correctly multiplies energy consumption."""
        result_pue1 = calculate_emissions(
            latency_ms=1000,
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.0
        )
        result_pue2 = calculate_emissions(
            latency_ms=1000,
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=2.0
        )

        # PUE 2.0 should give 2x emissions compared to PUE 1.0 (with small tolerance for rounding)
        assert abs(result_pue2["emissions_g"] - 2 * result_pue1["emissions_g"]) < 0.001

    def test_grid_intensity_impact(self):
        """Verify grid intensity correctly affects emissions."""
        result_clean = calculate_emissions(
            latency_ms=1000,
            power_watts=400,
            grid_intensity_g_kwh=100,  # Clean grid
            pue=1.0
        )
        result_dirty = calculate_emissions(
            latency_ms=1000,
            power_watts=400,
            grid_intensity_g_kwh=400,  # Dirty grid
            pue=1.0
        )

        # 4x grid intensity should give 4x emissions
        assert abs(result_dirty["emissions_g"] - 4 * result_clean["emissions_g"]) < 0.0001

    def test_zero_latency(self):
        """Test with zero latency (edge case)."""
        result = calculate_emissions(
            latency_ms=0,
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.2
        )

        assert result["emissions_g"] == 0
        assert result["energy_kwh"] == 0

    def test_very_long_latency(self):
        """Test with very long latency (1 hour)."""
        result = calculate_emissions(
            latency_ms=3600000,  # 1 hour
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.0
        )

        # 400W for 1 hour = 0.4 kWh
        # 0.4 kWh * 400 g/kWh = 160g CO2
        assert abs(result["emissions_g"] - 160) < 0.01

    def test_timestamp_format(self):
        """Verify timestamp is in ISO 8601 format."""
        result = calculate_emissions(
            latency_ms=1000,
            power_watts=400,
            grid_intensity_g_kwh=400,
            pue=1.2
        )

        # Should be parseable as ISO format and contain timezone
        assert "T" in result["timestamp"]
        assert "+" in result["timestamp"] or "Z" in result["timestamp"]

    def test_rounding(self):
        """Verify results are properly rounded."""
        result = calculate_emissions(
            latency_ms=1234,
            power_watts=456,
            grid_intensity_g_kwh=378,
            pue=1.15
        )

        # emissions_g should be rounded to 4 decimal places
        emissions_str = str(result["emissions_g"])
        if "." in emissions_str:
            decimal_places = len(emissions_str.split(".")[1])
            assert decimal_places <= 4


class TestEmissionsToComparison:
    """Tests for emissions_to_comparison function."""

    def test_basic_comparison(self):
        """Test basic comparison conversion."""
        result = emissions_to_comparison(1000)  # 1kg CO2

        assert "tv_streaming_seconds" in result
        assert "car_driving_meters" in result
        assert "tree_absorption_hours" in result
        assert "smartphone_charges" in result

    def test_zero_emissions(self):
        """Test comparison with zero emissions."""
        result = emissions_to_comparison(0)

        assert result["tv_streaming_seconds"] == 0
        assert result["car_driving_meters"] == 0
        assert result["tree_absorption_hours"] == 0
        assert result["smartphone_charges"] == 0

    def test_scaling(self):
        """Verify comparisons scale linearly."""
        result_1g = emissions_to_comparison(1)
        result_10g = emissions_to_comparison(10)

        assert abs(result_10g["car_driving_meters"] - 10 * result_1g["car_driving_meters"]) < 0.1
