"""
Minstroem API integration for Danish grid CO₂ data.

Minstroem provides real-time Danish electricity data including:
- CO₂ emissions (g/kWh)
- Energy prices
- Grid mix (wind, solar, etc.)

API Docs: https://api.minstroem.dk/
Coverage: Denmark (DK-DK1 and DK-DK2)
"""

import os
import requests
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("MINSTROEM_API_KEY")
API_SECRET = os.getenv("MINSTROEM_API_SECRET")
BASE_URL = "https://api.minstroem.dk"


def get_danish_grid_intensity(zone: str = "DK1") -> dict:
    """
    Get current CO₂ intensity for Danish grid.

    Args:
        zone: "DK1" (West Denmark) or "DK2" (East Denmark)

    Returns:
        dict with grid intensity and metadata
    """
    if not API_KEY or not API_SECRET:
        raise ValueError("MINSTROEM_API_KEY and MINSTROEM_API_SECRET must be set in .env")

    # Minstroem endpoint for CO2 emissions
    url = f"{BASE_URL}/v1/co2emissions"

    headers = {
        "X-API-Key": API_KEY,
        "X-API-Secret": API_SECRET
    }

    params = {
        "zone": zone
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Extract CO2 intensity (Minstroem returns g CO2/kWh)
        if isinstance(data, list) and len(data) > 0:
            latest = data[0]  # Most recent data point
            g_per_kwh = latest.get("co2_g_per_kwh") or latest.get("co2")
        else:
            g_per_kwh = data.get("co2_g_per_kwh") or data.get("co2")

        if g_per_kwh is None:
            raise ValueError(f"Could not extract CO2 data from response: {data}")

        kg_per_kwh = float(g_per_kwh) / 1000.0

        return {
            "zone": zone,
            "intensity_g_per_kwh": float(g_per_kwh),
            "intensity_kg_per_kwh": kg_per_kwh,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "source": "minstroem",
            "country": "Denmark"
        }

    except requests.exceptions.RequestException as e:
        raise Exception(f"Minstroem API error: {e}")


def estimate_emissions(
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
    total_energy_kwh = energy_kwh * pue
    emissions_kg = total_energy_kwh * grid_kg_per_kwh

    return {
        "energy_kwh": energy_kwh,
        "total_energy_with_pue_kwh": total_energy_kwh,
        "pue": pue,
        "grid_intensity_kg_per_kwh": grid_kg_per_kwh,
        "emissions_kg": emissions_kg,
        "emissions_g": emissions_kg * 1000
    }


def calculate_inference_emissions(
    latency_ms: int,
    power_watts: float = 400,
    zone: str = "DK1",
    pue: float = 1.2
) -> dict:
    """
    Complete calculation: latency + power -> CO₂ emissions for Denmark.

    Args:
        latency_ms: Inference latency in milliseconds
        power_watts: Power draw in watts
        zone: "DK1" (West) or "DK2" (East Denmark)
        pue: Datacenter power usage effectiveness

    Returns:
        Complete emissions report with Danish grid data
    """
    # Get current Danish grid intensity
    grid_data = get_danish_grid_intensity(zone)

    # Calculate energy
    duration_hours = latency_ms / 1000.0 / 3600.0
    energy_kwh = (power_watts / 1000.0) * duration_hours

    # Calculate emissions
    emissions = estimate_emissions(energy_kwh, grid_data["intensity_kg_per_kwh"], pue)

    # Combine results
    return {
        **grid_data,
        **emissions,
        "latency_ms": latency_ms,
        "power_watts": power_watts
    }


# Example usage
if __name__ == "__main__":
    print("\n🇩🇰 Minstroem - Danish Grid CO₂ Tracking\n")
    print("=" * 70)

    try:
        # Test DK1 (West Denmark)
        print("\n📍 West Denmark (DK1)")
        result = calculate_inference_emissions(
            latency_ms=2500,
            power_watts=400,
            zone="DK1"
        )
        print(f"Grid intensity: {result['intensity_g_per_kwh']:.1f} g CO₂/kWh")
        print(f"Energy (with PUE): {result['total_energy_with_pue_kwh']:.6f} kWh")
        print(f"Emissions: {result['emissions_g']:.3f} g CO₂")
        print(f"Timestamp: {result['timestamp']}")

        # Test DK2 (East Denmark)
        print("\n📍 East Denmark (DK2)")
        result = calculate_inference_emissions(
            latency_ms=2500,
            power_watts=400,
            zone="DK2"
        )
        print(f"Grid intensity: {result['intensity_g_per_kwh']:.1f} g CO₂/kWh")
        print(f"Emissions: {result['emissions_g']:.3f} g CO₂")

        print("\n" + "=" * 70)
        print("✅ Minstroem API working! Real-time Danish grid data.")
        print("📊 Limit: 50 requests/day (free tier)")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure:")
        print("1. .env file exists with MINSTROEM_API_KEY and MINSTROEM_API_SECRET")
        print("2. API credentials are correct")
        print("3. You haven't exceeded 50 requests/day")
