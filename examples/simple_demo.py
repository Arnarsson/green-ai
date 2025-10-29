"""
Simple working demo using UK Carbon Intensity API (no auth required)

This demonstrates CO₂ tracking that works right now, without any API keys.
"""

import requests
from datetime import datetime


def demo():
    """Run a simple demo of CO₂ tracking"""

    print("\n" + "="*70)
    print("  Green AI - CO₂ Tracking Demo")
    print("="*70 + "\n")

    # Fetch current UK grid intensity
    print("📡 Fetching current UK grid carbon intensity...")
    try:
        resp = requests.get("https://api.carbonintensity.org.uk/intensity", timeout=5)
        resp.raise_for_status()
        data = resp.json()["data"][0]["intensity"]
        g_per_kwh = data.get("actual") or data.get("forecast")
        kg_per_kwh = g_per_kwh / 1000.0

        print(f"✅ Grid intensity: {g_per_kwh} g CO₂/kWh ({kg_per_kwh:.3f} kg/kWh)")
    except Exception as e:
        print(f"❌ Error: {e}")
        return

    print("\n" + "-"*70)
    print("  Simulating AI Inference Scenarios")
    print("-"*70 + "\n")

    # Scenario 1: Small query (like a simple chatbot response)
    scenarios = [
        {
            "name": "Small Query (Simple chatbot)",
            "tokens": 100,
            "latency_s": 1.0,
            "power_w": 300
        },
        {
            "name": "Medium Query (Document analysis)",
            "tokens": 500,
            "latency_s": 3.0,
            "power_w": 400
        },
        {
            "name": "Large Query (Code generation)",
            "tokens": 2000,
            "latency_s": 8.0,
            "power_w": 500
        }
    ]

    for scenario in scenarios:
        # Calculate energy
        duration_hours = scenario["latency_s"] / 3600.0
        energy_kwh = (scenario["power_w"] / 1000.0) * duration_hours

        # Account for datacenter overhead (PUE = 1.2)
        pue = 1.2
        total_energy_kwh = energy_kwh * pue

        # Calculate emissions
        emissions_kg = total_energy_kwh * kg_per_kwh
        emissions_g = emissions_kg * 1000

        # Equivalent comparisons
        tv_seconds = emissions_g / 1000 * 3  # ~3s TV per gram

        print(f"📊 {scenario['name']}")
        print(f"   Tokens: {scenario['tokens']}")
        print(f"   Latency: {scenario['latency_s']}s @ {scenario['power_w']}W")
        print(f"   Energy: {energy_kwh:.6f} kWh (+ {(total_energy_kwh - energy_kwh):.6f} kWh overhead)")
        print(f"   💨 CO₂: {emissions_g:.3f} g")
        print(f"   ≈ {tv_seconds:.1f} seconds of TV streaming")
        print()

    # Monthly projection
    print("-"*70)
    print("  Monthly Impact Projection")
    print("-"*70 + "\n")

    requests_per_day = 1000
    avg_emissions_g = 0.08  # Average from scenarios above

    daily_kg = (requests_per_day * avg_emissions_g) / 1000
    monthly_kg = daily_kg * 30
    yearly_kg = daily_kg * 365

    print(f"📈 Assuming {requests_per_day:,} requests/day @ {avg_emissions_g:.2f}g each:")
    print(f"   Daily: {daily_kg:.2f} kg CO₂")
    print(f"   Monthly: {monthly_kg:.2f} kg CO₂")
    print(f"   Yearly: {yearly_kg:.2f} kg CO₂")
    print(f"   \n   Equivalent to driving: {yearly_kg * 5:.0f} km/year")
    print()

    print("="*70)
    print("  💡 Optimization Tips")
    print("="*70)
    print("""
1. Use smaller models when possible (30-50% less emissions)
2. Implement caching for repeated queries (avoid redundant computation)
3. Batch requests when latency allows (more efficient)
4. Choose regions with cleaner grids (can reduce emissions by 50%+)
5. Optimize prompts to reduce tokens/latency
""")

    print("="*70)
    print(f"  Demo completed at {datetime.utcnow().isoformat()}Z")
    print("="*70 + "\n")


if __name__ == "__main__":
    demo()
