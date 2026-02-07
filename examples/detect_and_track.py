"""
Practical example: Detecting datacenter location and tracking emissions.

Shows different scenarios and how to handle location uncertainty.
"""

import sys
import os
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.eu_regional_estimates import calculate_inference_emissions


def scenario_1_unknown_location():
    """
    Scenario 1: Using OpenAI/Anthropic where location is unknown
    """
    print("\n" + "="*70)
    print("  Scenario 1: Unknown Datacenter Location (OpenAI/Anthropic)")
    print("="*70 + "\n")

    print("Problem: API doesn't tell you where it processed your request")
    print("\nSolution: Use conservative estimates with ranges\n")

    latency_ms = 2500
    power_w = 400

    # Provide range based on possible locations
    scenarios = {
        "Best case (Norway/Sweden)": "NO",
        "Likely (US average)": "EU",  # Using EU as proxy for US
        "Worst case (Coal-heavy grid)": "PL"
    }

    print(f"For a {latency_ms}ms inference at {power_w}W:\n")

    results = {}
    for name, country in scenarios.items():
        result = calculate_inference_emissions(latency_ms, power_w, country_code=country)
        results[name] = result
        print(f"{name:35} | {result['emissions_g']:.3f} g CO₂")

    # Report with range
    print(f"\n📊 Recommended reporting:")
    print(f"   Emissions: {results['Likely (US average)']['emissions_g']:.3f} g CO₂")
    print(f"   Range: {results['Best case (Norway/Sweden)']['emissions_g']:.3f} - "
          f"{results['Worst case (Coal-heavy grid)']['emissions_g']:.3f} g CO₂")
    print(f"   Assumption: US-based datacenter (documented in reports)")


def scenario_2_azure_control():
    """
    Scenario 2: Using Azure OpenAI where YOU choose the region
    """
    print("\n" + "="*70)
    print("  Scenario 2: You Control Location (Azure OpenAI/AWS Bedrock)")
    print("="*70 + "\n")

    print("Solution: Use cloud-hosted AI in regions YOU choose\n")

    # Compare different Azure regions
    regions = [
        ("Norway East (cleanest)", "NO", "norwayeast"),
        ("West Europe (NL)", "NL", "westeurope"),
        ("France Central", "FR", "francecentral"),
        ("Germany West Central", "DE", "germanywestcentral"),
    ]

    print("Same query, different Azure regions:\n")

    latency_ms = 2500
    power_w = 400

    for name, country, azure_region in regions:
        result = calculate_inference_emissions(latency_ms, power_w, country_code=country)
        print(f"{name:30} | {result['emissions_g']:.3f} g CO₂ | Azure: {azure_region}")

    print(f"\n💡 Recommendation:")
    print(f"   Deploy in Norway or Sweden for ~3-4x lower emissions!")


def scenario_3_latency_detection():
    """
    Scenario 3: Use latency to guess location
    """
    print("\n" + "="*70)
    print("  Scenario 3: Location Detection from Latency")
    print("="*70 + "\n")

    print("Measuring latency patterns to estimate location...\n")

    # Simulate latency measurements
    latency_samples = [85, 92, 88, 95, 87]  # milliseconds
    avg_latency = sum(latency_samples) / len(latency_samples)

    print(f"Average latency: {avg_latency:.1f}ms\n")

    if avg_latency < 50:
        location = "Same region (likely same country)"
        country = "DK"  # Assume Denmark if you're in DK
    elif avg_latency < 100:
        location = "Same continent (likely Europe)"
        country = "EU"
    elif avg_latency < 200:
        location = "Cross-continental (Europe-US)"
        country = "EU"  # Use EU average
    else:
        location = "Very distant"
        country = "EU"

    print(f"Estimated location: {location}")
    print(f"Using grid intensity for: {country}\n")

    result = calculate_inference_emissions(2500, 400, country_code=country)
    print(f"Emissions estimate: {result['emissions_g']:.3f} g CO₂")
    print(f"Confidence: Medium (based on latency pattern)")


def scenario_4_documented_assumptions():
    """
    Scenario 4: Professional tracking with documented assumptions
    """
    print("\n" + "="*70)
    print("  Scenario 4: Professional Tracking (Documented Assumptions)")
    print("="*70 + "\n")

    # Configuration with documented assumptions
    TRACKING_CONFIG = {
        "openai_gpt4": {
            "provider": "OpenAI",
            "model": "GPT-4",
            "location_assumption": "US East Coast",
            "grid_intensity_g_kwh": 400,
            "confidence": "low",
            "reasoning": "Based on latency ~90ms from Europe, likely US East",
            "last_verified": "2025-10-29"
        },
        "azure_norway": {
            "provider": "Azure OpenAI",
            "model": "GPT-4",
            "location_assumption": "Norway East datacenter",
            "grid_intensity_g_kwh": 20,
            "confidence": "high",
            "reasoning": "Explicitly deployed in Azure Norway East region",
            "last_verified": "2025-10-29"
        }
    }

    print("Example: Professional emissions report\n")

    provider = "openai_gpt4"
    config = TRACKING_CONFIG[provider]

    latency_ms = 2500
    power_w = 400
    energy_kwh = (power_w / 1000) * (latency_ms / 3600000)
    emissions_g = energy_kwh * config["grid_intensity_g_kwh"] * 1.2  # PUE

    print(f"Provider: {config['provider']}")
    print(f"Model: {config['model']}")
    print(f"Emissions: {emissions_g:.3f} g CO₂")
    print(f"\nAssumptions:")
    print(f"  Location: {config['location_assumption']}")
    print(f"  Grid intensity: {config['grid_intensity_g_kwh']} g CO₂/kWh")
    print(f"  Confidence: {config['confidence']}")
    print(f"  Reasoning: {config['reasoning']}")
    print(f"  Last verified: {config['last_verified']}")


def scenario_5_selfhosted():
    """
    Scenario 5: Self-hosted models - you know exact location
    """
    print("\n" + "="*70)
    print("  Scenario 5: Self-Hosted Models (Known Location)")
    print("="*70 + "\n")

    print("Advantage: You know EXACTLY where your GPU server is!")
    print("\nExample: Self-hosted LLaMA 2 in Denmark\n")

    result = calculate_inference_emissions(
        latency_ms=3000,
        power_watts=500,  # GPU power draw
        country_code="DK"
    )

    print(f"Location: Denmark datacenter")
    print(f"Grid intensity: {result['intensity_g_per_kwh']} g CO₂/kWh")
    print(f"Emissions: {result['emissions_g']:.3f} g CO₂")
    print(f"Confidence: HIGH (known location + grid data)")


def main():
    """Run all scenarios"""

    print("\n" + "🌍" * 35)
    print("  DATACENTER LOCATION & EMISSIONS TRACKING GUIDE")
    print("🌍" * 35)

    scenario_1_unknown_location()
    time.sleep(0.5)

    scenario_2_azure_control()
    time.sleep(0.5)

    scenario_3_latency_detection()
    time.sleep(0.5)

    scenario_4_documented_assumptions()
    time.sleep(0.5)

    scenario_5_selfhosted()

    # Summary
    print("\n" + "="*70)
    print("  📋 SUMMARY: Best Practices")
    print("="*70)
    print("""
1. BEST: Use cloud-hosted AI (Azure/AWS) in regions YOU choose
   → High accuracy, full control over location

2. GOOD: Document assumptions for API-only services
   → Clear reasoning, confidence levels, regular review

3. ACCEPTABLE: Use ranges when location unknown
   → Best/likely/worst case scenarios

4. MEASURE: Use tools like CodeCarbon for self-hosted
   → Direct measurement beats estimates

5. OPTIMIZE: Choose green regions when possible
   → Norway, Sweden, France = 3-10x less emissions

6. REPORT: Always include confidence and assumptions
   → Transparency builds trust in your data
""")

    print("="*70 + "\n")


if __name__ == "__main__":
    main()
