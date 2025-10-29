"""
EU Regional CO₂ tracking using regional average grid intensities.

Since real-time EU APIs require paid plans, this uses known regional averages
based on 2024 data. Updates quarterly.

Data sources:
- European Environment Agency (EEA)
- IEA Energy Statistics
- National grid operators
"""

from typing import Optional
from datetime import datetime

# Regional grid intensities (g CO₂/kWh) - 2024 averages
# Source: EEA, IEA, National Grid Data
GRID_INTENSITIES = {
    # Nordic (very clean - lots of hydro/wind)
    "DK": 120,   # Denmark - wind power leader
    "NO": 20,    # Norway - mostly hydro
    "SE": 45,    # Sweden - hydro + nuclear
    "FI": 85,    # Finland - mix
    "IS": 10,    # Iceland - geothermal

    # Western Europe
    "FR": 60,    # France - nuclear dominant
    "DE": 380,   # Germany - coal still significant
    "NL": 320,   # Netherlands - natural gas
    "BE": 180,   # Belgium - nuclear + gas
    "AT": 95,    # Austria - hydro
    "CH": 35,    # Switzerland - hydro + nuclear

    # Southern Europe
    "ES": 220,   # Spain - mix
    "IT": 280,   # Italy - gas + renewables
    "PT": 250,   # Portugal - mix
    "GR": 450,   # Greece - coal + gas

    # Eastern Europe
    "PL": 700,   # Poland - coal dominant
    "CZ": 450,   # Czech Republic - coal
    "HU": 280,   # Hungary - gas

    # British Isles
    "GB": 220,   # Great Britain - gas + renewables
    "IE": 320,   # Ireland - gas + wind

    # Average values
    "EU": 275,   # EU-27 average
    "EU-NORTH": 70,   # Nordic average
    "EU-WEST": 220,   # Western Europe average
    "EU-SOUTH": 300,  # Southern Europe average
    "EU-EAST": 500,   # Eastern Europe average
}

# Cloud provider typical regions
CLOUD_REGIONS = {
    # AWS
    "eu-west-1": "IE",      # Ireland
    "eu-west-2": "GB",      # London
    "eu-west-3": "FR",      # Paris
    "eu-north-1": "SE",     # Stockholm
    "eu-central-1": "DE",   # Frankfurt

    # Azure
    "northeurope": "IE",    # Ireland
    "westeurope": "NL",     # Netherlands
    "francecentral": "FR",  # France
    "germanywestcentral": "DE",  # Germany
    "norwayeast": "NO",     # Norway
    "swedencentral": "SE",  # Sweden

    # GCP
    "europe-west1": "BE",   # Belgium
    "europe-west2": "GB",   # London
    "europe-west3": "DE",   # Frankfurt
    "europe-west4": "NL",   # Netherlands
    "europe-north1": "FI",  # Finland
}


def get_grid_intensity(
    country_code: Optional[str] = None,
    cloud_region: Optional[str] = None
) -> dict:
    """
    Get grid intensity for an EU country or cloud region.

    Args:
        country_code: ISO 2-letter country code (e.g., "DK", "DE", "FR")
        cloud_region: Cloud region name (e.g., "eu-west-1", "northeurope")

    Returns:
        dict with intensity and metadata
    """

    # Determine country
    if cloud_region:
        country_code = CLOUD_REGIONS.get(cloud_region)
        if not country_code:
            raise ValueError(f"Unknown cloud region: {cloud_region}")

    if not country_code:
        country_code = "EU"  # Default to EU average

    country_code = country_code.upper()

    # Get intensity
    g_per_kwh = GRID_INTENSITIES.get(country_code)
    if not g_per_kwh:
        # Try to find a close match
        available = ", ".join(sorted(GRID_INTENSITIES.keys()))
        raise ValueError(
            f"Country code '{country_code}' not found. "
            f"Available: {available}"
        )

    kg_per_kwh = g_per_kwh / 1000.0

    return {
        "country": country_code,
        "intensity_g_per_kwh": g_per_kwh,
        "intensity_kg_per_kwh": kg_per_kwh,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source": "regional_average",
        "note": "Based on 2024 annual average data"
    }


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
    country_code: Optional[str] = None,
    cloud_region: Optional[str] = None,
    pue: float = 1.2
) -> dict:
    """
    Complete calculation: latency + power -> CO₂ emissions.

    Args:
        latency_ms: Inference latency in milliseconds
        power_watts: Power draw in watts
        country_code: ISO country code (e.g., "DK", "DE")
        cloud_region: Cloud region name (e.g., "eu-west-1")
        pue: Datacenter power usage effectiveness

    Returns:
        Complete emissions report
    """
    # Get grid intensity
    grid_data = get_grid_intensity(country_code, cloud_region)

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
    print("🇪🇺 EU Regional CO₂ Tracking Examples\n")
    print("=" * 70)

    # Example 1: Denmark
    print("\n📍 Example 1: AI inference in Denmark")
    result = calculate_inference_emissions(
        latency_ms=2500,
        power_watts=400,
        country_code="DK"
    )
    print(f"Country: Denmark")
    print(f"Grid intensity: {result['intensity_g_per_kwh']} g CO₂/kWh")
    print(f"Emissions: {result['emissions_g']:.3f} g CO₂")

    # Example 2: Germany (higher carbon intensity)
    print("\n📍 Example 2: AI inference in Germany")
    result = calculate_inference_emissions(
        latency_ms=2500,
        power_watts=400,
        country_code="DE"
    )
    print(f"Country: Germany")
    print(f"Grid intensity: {result['intensity_g_per_kwh']} g CO₂/kWh")
    print(f"Emissions: {result['emissions_g']:.3f} g CO₂")
    print(f"Difference: {(380/120):.1f}x higher than Denmark!")

    # Example 3: Cloud region (AWS Ireland)
    print("\n📍 Example 3: AWS eu-west-1 (Ireland)")
    result = calculate_inference_emissions(
        latency_ms=2500,
        power_watts=400,
        cloud_region="eu-west-1"
    )
    print(f"Cloud region: eu-west-1")
    print(f"Country: {result['country']}")
    print(f"Grid intensity: {result['intensity_g_per_kwh']} g CO₂/kWh")
    print(f"Emissions: {result['emissions_g']:.3f} g CO₂")

    # Example 4: Show all EU countries
    print("\n📊 Grid Intensity by Country (g CO₂/kWh)")
    print("-" * 70)

    countries = [
        ("🇳🇴 Norway", "NO"),
        ("🇸🇪 Sweden", "SE"),
        ("🇩🇰 Denmark", "DK"),
        ("🇫🇷 France", "FR"),
        ("🇩🇪 Germany", "DE"),
        ("🇵🇱 Poland", "PL"),
    ]

    for name, code in countries:
        data = get_grid_intensity(code)
        print(f"{name:20} | {data['intensity_g_per_kwh']:4} g/kWh")

    print("\n" + "=" * 70)
    print("💡 Tip: Choose regions with lower carbon intensity to reduce emissions!")
    print("   Nordic countries (NO, SE, DK) are 3-6x cleaner than coal-heavy regions.")
