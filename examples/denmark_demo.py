"""
Denmark-specific CO₂ tracking demo.

Uses regional averages for Denmark until we get the correct Minstroem endpoint.
Denmark has one of Europe's cleanest grids thanks to wind power!
"""

from src.eu_regional_estimates import calculate_inference_emissions, get_grid_intensity


def denmark_demo():
    """Demo showing Danish AI emissions"""

    print("\n" + "="*70)
    print("  🇩🇰 Denmark AI CO₂ Tracking Demo")
    print("="*70 + "\n")

    # Get Denmark grid data
    grid_data = get_grid_intensity("DK")

    print(f"📊 Denmark Grid Status:")
    print(f"   Average intensity: {grid_data['intensity_g_per_kwh']} g CO₂/kWh")
    print(f"   Note: {grid_data['note']}")
    print(f"   Source: {grid_data['source']}")

    print(f"\n💚 Denmark Context:")
    print(f"   - One of Europe's cleanest grids")
    print(f"   - ~50% of electricity from wind power")
    print(f"   - 3x cleaner than EU average (120 vs 275 g/kWh)")
    print(f"   - 6x cleaner than coal-heavy grids (120 vs 700 g/kWh)")

    print("\n" + "-"*70)
    print("  AI Inference Scenarios - Denmark")
    print("-"*70 + "\n")

    scenarios = [
        {"name": "Small chatbot query", "latency_ms": 1000, "power_w": 300},
        {"name": "Document analysis", "latency_ms": 3000, "power_w": 400},
        {"name": "Code generation", "latency_ms": 8000, "power_w": 500},
    ]

    for scenario in scenarios:
        result = calculate_inference_emissions(
            latency_ms=scenario["latency_ms"],
            power_watts=scenario["power_w"],
            country_code="DK"
        )

        print(f"📊 {scenario['name']}")
        print(f"   Latency: {scenario['latency_ms']/1000:.1f}s @ {scenario['power_w']}W")
        print(f"   Emissions: {result['emissions_g']:.3f} g CO₂")
        print()

    # Compare with other regions
    print("-"*70)
    print("  Same Query, Different Locations")
    print("-"*70 + "\n")

    print("Comparing a 3-second inference at 400W:\n")

    regions = [
        ("🇳🇴 Norway (cleanest)", "NO"),
        ("🇩🇰 Denmark", "DK"),
        ("🇫🇷 France (nuclear)", "FR"),
        ("🇩🇪 Germany", "DE"),
        ("🇵🇱 Poland (coal)", "PL"),
    ]

    for name, code in regions:
        result = calculate_inference_emissions(
            latency_ms=3000,
            power_watts=400,
            country_code=code
        )
        print(f"{name:30} | {result['emissions_g']:6.3f} g CO₂")

    # Monthly projection for Denmark
    print("\n" + "-"*70)
    print("  Monthly Impact - Denmark")
    print("-"*70 + "\n")

    requests_per_day = 1000
    avg_emissions_g = 0.050  # Average from scenarios above

    daily_kg = (requests_per_day * avg_emissions_g) / 1000
    monthly_kg = daily_kg * 30
    yearly_kg = daily_kg * 365

    print(f"📈 With 1,000 requests/day in Denmark:")
    print(f"   Daily: {daily_kg:.2f} kg CO₂")
    print(f"   Monthly: {monthly_kg:.2f} kg CO₂")
    print(f"   Yearly: {yearly_kg:.2f} kg CO₂")
    print(f"   \n   Equivalent to driving: {yearly_kg * 5:.0f} km/year")

    # Comparison if hosted elsewhere
    result_de = calculate_inference_emissions(3000, 400, "DE")
    result_dk = calculate_inference_emissions(3000, 400, "DK")
    savings = ((result_de["emissions_g"] - result_dk["emissions_g"]) / result_de["emissions_g"]) * 100

    print(f"\n💡 Denmark vs. Germany:")
    print(f"   Hosting in Denmark saves {savings:.0f}% CO₂")
    print(f"   {yearly_kg:.0f} kg/year (DK) vs {yearly_kg * result_de['emissions_g'] / result_dk['emissions_g']:.0f} kg/year (DE)")

    print("\n" + "="*70)
    print("  🌱 Green Hosting Tips")
    print("="*70)
    print("""
1. Host in Nordic countries (DK, NO, SE) for cleanest energy
2. Denmark's wind power makes it ideal for AI workloads
3. Consider time-of-day: Wind production varies
4. Cache aggressively to reduce redundant computation
5. Use efficient models (smaller = less energy)
""")

    print("="*70 + "\n")


if __name__ == "__main__":
    denmark_demo()
