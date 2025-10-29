#!/usr/bin/env python3
"""
Regional Emissions Comparison Demo

Demonstrates how CO₂ emissions vary across different cloud regions
for the same AI inference task.
"""

import requests
import json
from typing import Dict, List

BASE_URL = "http://localhost:8000"


def estimate_emissions(provider: str, region: str, latency_ms: int = 2500) -> Dict:
    """Get emissions estimate for a specific provider/region."""
    response = requests.post(
        f"{BASE_URL}/v1/estimate",
        json={
            "latency_ms": latency_ms,
            "provider": provider,
            "region": region,
            "power_watts": 400,
            "pue": 1.2
        }
    )
    return response.json()


def main():
    print("🌍 Regional CO₂ Emissions Comparison")
    print("=" * 60)
    print()
    print("Scenario: GPT-4 inference with 2.5s latency")
    print()

    # Test regions across different providers
    test_cases = [
        ("aws", "eu-north-1", "Stockholm, Sweden (95% renewable)"),
        ("aws", "us-west-2", "Oregon, USA (75% renewable)"),
        ("azure", "norwayeast", "Oslo, Norway (98% renewable)"),
        ("aws", "eu-west-1", "Dublin, Ireland (40% renewable)"),
        ("aws", "us-east-1", "Virginia, USA (30% renewable)"),
        ("azure", "germanywestcentral", "Frankfurt, Germany (45% renewable)"),
    ]

    results = []

    for provider, region, description in test_cases:
        result = estimate_emissions(provider, region)
        results.append({
            "description": description,
            "provider": provider,
            "region": region,
            "emissions_g": result["emissions_g"],
            "grid_intensity": result["grid_intensity_g_kwh"],
        })

    # Sort by emissions (lowest to highest)
    results.sort(key=lambda x: x["emissions_g"])

    print("Results (sorted by emissions):")
    print("-" * 60)

    for i, r in enumerate(results, 1):
        print(f"{i}. {r['description']}")
        print(f"   Provider: {r['provider']}, Region: {r['region']}")
        print(f"   Emissions: {r['emissions_g']:.4f}g CO₂")
        print(f"   Grid intensity: {r['grid_intensity']}g CO₂/kWh")
        print()

    # Calculate savings
    lowest = results[0]["emissions_g"]
    highest = results[-1]["emissions_g"]
    savings_pct = ((highest - lowest) / highest) * 100

    print("💡 Key Insights:")
    print("-" * 60)
    print(f"Lowest emissions: {lowest:.4f}g CO₂ ({results[0]['description']})")
    print(f"Highest emissions: {highest:.4f}g CO₂ ({results[-1]['description']})")
    print(f"Potential savings: {savings_pct:.1f}% by choosing green regions")
    print()

    # Scale to 1 million requests
    print("📊 Scale Impact:")
    print("-" * 60)
    requests_per_day = 1_000_000

    for result in [results[0], results[-1]]:
        daily_kg = (result["emissions_g"] * requests_per_day) / 1000
        annual_kg = daily_kg * 365
        annual_tons = annual_kg / 1000

        print(f"{result['description']}:")
        print(f"  1M requests/day: {daily_kg:.2f}kg CO₂/day ({annual_tons:.2f} tons/year)")

    diff_tons = ((results[-1]["emissions_g"] - results[0]["emissions_g"]) * requests_per_day * 365) / 1_000_000
    print()
    print(f"Annual savings: {diff_tons:.2f} tons CO₂ by choosing greenest region")
    print(f"Equivalent to: {diff_tons * 5:.0f}m driving or {diff_tons * 125:.0f} tree-years")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("❌ Error: API server not running")
        print("Start the server with: ./run.sh")
    except Exception as e:
        print(f"❌ Error: {e}")
