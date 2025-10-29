"""
Simple PoC: estimate CO₂ emissions of an AI inference call.

It fetches the current grid intensity from the UK Carbon Intensity API and uses
it to compute the carbon cost of a single request given its latency and assumed
power draw.
"""

import requests
from datetime import datetime


def fetch_gb_grid_intensity() -> float:
    """Return current GB grid intensity in kg CO₂/kWh."""
    resp = requests.get("https://api.carbonintensity.org.uk/intensity", timeout=5)
    resp.raise_for_status()
    data = resp.json()["data"][0]["intensity"]
    g_per_kwh = data.get("actual") or data.get("forecast")
    if g_per_kwh is None:
        raise ValueError(f"Unexpected payload: {data}")
    return float(g_per_kwh) / 1000.0  # g→kg


def estimate_emissions(
    grid_kg_per_kwh: float,
    latency_ms: int,
    power_watts: float = 400.0
) -> float:
    """Compute emissions in kg for a single inference call."""
    duration_hours = latency_ms / 1000.0 / 3600.0
    energy_kwh = (power_watts / 1000.0) * duration_hours
    return energy_kwh * grid_kg_per_kwh


if __name__ == "__main__":
    # Example parameters
    prompt_tokens = 50
    completion_tokens = 200
    latency_ms = 2500  # 2.5 seconds
    assumed_power = 400.0  # watts

    grid_intensity = fetch_gb_grid_intensity()
    emissions_kg = estimate_emissions(grid_intensity, latency_ms, assumed_power)

    total_tokens = prompt_tokens + completion_tokens
    print(f"Timestamp UTC: {datetime.utcnow().isoformat()}Z")
    print(f"Grid intensity: {grid_intensity:.3f} kg CO₂/kWh")
    print(f"Tokens: {total_tokens}")
    print(f"Latency: {latency_ms} ms; Power draw: {assumed_power} W")
    print(f"Estimated emissions: {emissions_kg*1000:.3f} g CO₂")
