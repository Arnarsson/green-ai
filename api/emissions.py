"""
CO₂ Emissions Calculation Logic
--------------------------------
Calculates emissions based on:
- Energy consumption (power × time)
- Datacenter overhead (PUE)
- Grid carbon intensity (g CO₂/kWh)
"""

from datetime import datetime, timezone


def calculate_emissions(
    latency_ms: int, power_watts: float, grid_intensity_g_kwh: float, pue: float = 1.2
) -> dict:
    """
    Calculate CO₂ emissions for an AI inference.

    Args:
        latency_ms: Request latency in milliseconds
        power_watts: Power draw in watts
        grid_intensity_g_kwh: Grid carbon intensity (g CO₂/kWh)
        pue: Power Usage Effectiveness (datacenter overhead)

    Returns:
        dict with emissions and metadata
    """

    # Calculate energy consumption
    duration_hours = latency_ms / 1000.0 / 3600.0
    energy_kwh = (power_watts / 1000.0) * duration_hours

    # Apply datacenter overhead (PUE)
    total_energy_kwh = energy_kwh * pue

    # Calculate emissions
    emissions_kg = total_energy_kwh * (grid_intensity_g_kwh / 1000.0)
    emissions_g = emissions_kg * 1000

    return {
        "emissions_g": round(emissions_g, 4),
        "emissions_kg": round(emissions_kg, 6),
        "energy_kwh": round(energy_kwh, 8),
        "total_energy_with_pue_kwh": round(total_energy_kwh, 8),
        "pue": pue,
        "grid_intensity_g_kwh": grid_intensity_g_kwh,
        "power_watts": power_watts,
        "latency_ms": latency_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def emissions_to_comparison(emissions_g: float) -> dict:
    """
    Convert emissions to relatable comparisons.

    Returns:
        dict with comparison metrics
    """

    # Conversions
    tv_seconds = emissions_g / 1000 * 3  # ~3s TV per gram
    driving_meters = emissions_g * 5  # ~5m driving per gram
    tree_hours = emissions_g / 21  # Trees absorb ~21g CO₂/hour

    return {
        "tv_streaming_seconds": round(tv_seconds, 1),
        "car_driving_meters": round(driving_meters, 1),
        "tree_absorption_hours": round(tree_hours, 2),
        "smartphone_charges": round(emissions_g / 8, 2),  # ~8g per full charge
    }
