"""
Enhanced CO₂ tracking with Electricity Maps API integration.

This module provides integration with Electricity Maps for more accurate
grid intensity data across multiple regions.
"""

import os
from typing import Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

# Configuration
ELECTRICITYMAPS_TOKEN = os.getenv("ELECTRICITYMAPS_TOKEN")
ELECTRICITYMAPS_BASE = os.getenv(
    "ELECTRICITYMAPS_BASE",
    "https://api-access.electricitymaps.com/free-tier"
)


async def get_grid_intensity(
    zone: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    data_center_provider: Optional[str] = None,
    data_center_region: Optional[str] = None,
    emission_factor_type: str = "lifecycle"
) -> float:
    """
    Fetch current grid intensity from Electricity Maps.

    Args:
        zone: Grid zone (e.g., "DK-DK2", "US-CAL-CISO")
        lat: Latitude for geo-lookup
        lon: Longitude for geo-lookup
        data_center_provider: Cloud provider ("aws", "gcp", "azure")
        data_center_region: Cloud region (e.g., "eu-west-1")
        emission_factor_type: "lifecycle" or "direct"

    Returns:
        Grid intensity in kg CO₂e/kWh

    Raises:
        ValueError: If API token is missing or response is invalid
        httpx.HTTPStatusError: If API request fails
    """
    if not ELECTRICITYMAPS_TOKEN:
        raise ValueError("ELECTRICITYMAPS_TOKEN not set in environment")

    params = {"emissionFactorType": emission_factor_type}

    if zone:
        params["zone"] = zone
    if lat is not None and lon is not None:
        params["lat"] = lat
        params["lon"] = lon
    if data_center_provider and data_center_region:
        params["dataCenterProvider"] = data_center_provider
        params["dataCenterRegion"] = data_center_region

    url = f"{ELECTRICITYMAPS_BASE}/v3/carbon-intensity/latest"
    headers = {"auth-token": ELECTRICITYMAPS_TOKEN}

    async with httpx.AsyncClient(timeout=6.0) as client:
        response = await client.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

        g_per_kwh = data.get("carbonIntensity")
        if g_per_kwh is None:
            raise ValueError(f"Unexpected response: {data}")

        kg_per_kwh = float(g_per_kwh) / 1000.0
        return kg_per_kwh


def estimate_ai_emissions(
    energy_kwh: float,
    grid_kg_per_kwh: float,
    pue: float = 1.2
) -> dict:
    """
    Estimate CO₂ emissions for AI workload.

    Args:
        energy_kwh: Energy consumed in kWh
        grid_kg_per_kwh: Grid carbon intensity in kg CO₂/kWh
        pue: Power Usage Effectiveness (datacenter overhead)

    Returns:
        Dictionary with emissions breakdown
    """
    # Account for datacenter overhead (PUE)
    total_energy_kwh = energy_kwh * pue

    # Calculate emissions
    emissions_kg = total_energy_kwh * grid_kg_per_kwh

    return {
        "energy_kwh": energy_kwh,
        "total_energy_with_pue_kwh": total_energy_kwh,
        "pue": pue,
        "grid_intensity_kg_per_kwh": grid_kg_per_kwh,
        "emissions_kg": emissions_kg,
        "emissions_g": emissions_kg * 1000
    }


# Example usage
if __name__ == "__main__":
    import asyncio

    async def main():
        # Example: Check Denmark Zone 2
        try:
            intensity = await get_grid_intensity(zone="DK-DK2")
            print(f"Denmark DK-2 grid intensity: {intensity:.3f} kg CO₂/kWh")

            # Simulate a 2.5s AI inference at 400W
            latency_s = 2.5
            power_w = 400
            energy_kwh = (power_w / 1000) * (latency_s / 3600)

            result = estimate_ai_emissions(energy_kwh, intensity)
            print(f"\nAI Inference Emissions:")
            print(f"  Energy used: {result['energy_kwh']:.6f} kWh")
            print(f"  With PUE {result['pue']}: {result['total_energy_with_pue_kwh']:.6f} kWh")
            print(f"  CO₂ emissions: {result['emissions_g']:.3f} g")

        except Exception as e:
            print(f"Error: {e}")
            print("\nMake sure to set ELECTRICITYMAPS_TOKEN in your .env file")

    asyncio.run(main())
