# Usage Guide - Green AI CO₂ Tracking

## Getting Started

### Prerequisites

- Python 3.7 or higher
- pip package manager
- (Optional) Electricity Maps API key for multi-region support

### Installation Steps

1. **Clone the repository**:
```bash
git clone https://github.com/Arnarsson/green-ai.git
cd green-ai
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Configure environment** (for Electricity Maps):
```bash
cp .env.example .env
```

Edit `.env` and add your API token:
```bash
ELECTRICITYMAPS_TOKEN=your_token_here
```

Get your token from: https://portal.electricitymaps.com/

---

## Basic Usage Examples

### Example 1: Simple UK Grid Tracking

The simplest way to track CO₂ is using the UK Carbon Intensity API (no authentication required):

```bash
python src/poc_api_call.py
```

**Output**:
```
Timestamp UTC: 2025-10-29T14:21:00Z
Grid intensity: 0.131 kg CO₂/kWh
Tokens: 250
Latency: 2500 ms; Power draw: 400.0 W
Estimated emissions: 0.044 g CO₂
```

**What it does**:
- Fetches current UK grid carbon intensity
- Simulates an AI inference (2.5s, 400W)
- Calculates CO₂ emissions

---

### Example 2: Track with Electricity Maps (Denmark)

For more regions and better accuracy, use Electricity Maps:

```python
import asyncio
from src.electricity_maps_integration import get_grid_intensity, estimate_ai_emissions

async def main():
    # Get grid intensity for Denmark Zone 2
    intensity = await get_grid_intensity(zone="DK-DK2")
    print(f"Grid intensity: {intensity:.3f} kg CO₂/kWh")

    # Simulate a 3-second inference at 500W
    latency_s = 3.0
    power_w = 500
    energy_kwh = (power_w / 1000) * (latency_s / 3600)

    # Calculate emissions
    result = estimate_ai_emissions(energy_kwh, intensity)

    print(f"Energy: {result['energy_kwh']:.6f} kWh")
    print(f"With PUE: {result['total_energy_with_pue_kwh']:.6f} kWh")
    print(f"CO₂: {result['emissions_g']:.3f} g")

asyncio.run(main())
```

---

### Example 3: Track Cloud Provider Regions

Track emissions for specific cloud datacenters:

```python
import asyncio
from src.electricity_maps_integration import get_grid_intensity

async def track_cloud_regions():
    providers = [
        {"provider": "aws", "region": "eu-west-1"},
        {"provider": "gcp", "region": "europe-west1"},
        {"provider": "azure", "region": "westeurope"}
    ]

    for p in providers:
        intensity = await get_grid_intensity(
            data_center_provider=p["provider"],
            data_center_region=p["region"]
        )
        print(f"{p['provider']} {p['region']}: {intensity:.3f} kg/kWh")

asyncio.run(track_cloud_regions())
```

---

### Example 4: Batch Processing Multiple Inferences

Track emissions for a batch of AI requests:

```python
import asyncio
from src.electricity_maps_integration import get_grid_intensity, estimate_ai_emissions

async def track_batch(num_requests=100):
    # Get current grid intensity
    intensity = await get_grid_intensity(zone="DK-DK2")

    total_emissions_g = 0

    for i in range(num_requests):
        # Simulate varying latencies (1-5 seconds)
        latency_s = 1 + (i % 5)
        power_w = 400
        energy_kwh = (power_w / 1000) * (latency_s / 3600)

        result = estimate_ai_emissions(energy_kwh, intensity)
        total_emissions_g += result['emissions_g']

    print(f"Total requests: {num_requests}")
    print(f"Total emissions: {total_emissions_g:.2f} g CO₂")
    print(f"Average per request: {total_emissions_g/num_requests:.3f} g CO₂")
    print(f"Equivalent to: {total_emissions_g/1000:.1f} kg CO₂")

asyncio.run(track_batch(1000))
```

---

### Example 5: Real-time OpenAI API Tracking

Wrap your OpenAI API calls to track emissions:

```python
import asyncio
import time
from openai import OpenAI
from src.electricity_maps_integration import get_grid_intensity, estimate_ai_emissions

client = OpenAI()

async def tracked_completion(prompt):
    # Get current grid intensity
    intensity = await get_grid_intensity(zone="US-CAL-CISO")  # California

    # Make API call and time it
    start = time.time()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    latency_s = time.time() - start

    # Get token counts
    tokens = response.usage.total_tokens

    # Estimate energy (assuming 400W average for GPT-4 inference)
    power_w = 400
    energy_kwh = (power_w / 1000) * (latency_s / 3600)

    # Calculate emissions
    result = estimate_ai_emissions(energy_kwh, intensity)

    print(f"Response generated:")
    print(f"  Tokens: {tokens}")
    print(f"  Latency: {latency_s:.2f}s")
    print(f"  CO₂: {result['emissions_g']:.3f} g")
    print(f"  Equivalent to: {result['emissions_g']/1000*3:.1f}s of TV")

    return response.choices[0].message.content

# Usage
asyncio.run(tracked_completion("Explain climate change in 50 words"))
```

---

### Example 6: Export to CSV for Analysis

Track and export emissions data:

```python
import asyncio
import csv
from datetime import datetime
from src.electricity_maps_integration import get_grid_intensity, estimate_ai_emissions

async def log_to_csv(requests_data, filename="emissions_log.csv"):
    intensity = await get_grid_intensity(zone="DK-DK2")

    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'timestamp', 'latency_s', 'power_w', 'energy_kwh',
            'grid_intensity', 'emissions_g', 'zone'
        ])
        writer.writeheader()

        for req in requests_data:
            latency_s = req['latency_s']
            power_w = req.get('power_w', 400)
            energy_kwh = (power_w / 1000) * (latency_s / 3600)

            result = estimate_ai_emissions(energy_kwh, intensity)

            writer.writerow({
                'timestamp': datetime.utcnow().isoformat(),
                'latency_s': latency_s,
                'power_w': power_w,
                'energy_kwh': result['energy_kwh'],
                'grid_intensity': intensity,
                'emissions_g': result['emissions_g'],
                'zone': 'DK-DK2'
            })

    print(f"Logged {len(requests_data)} requests to {filename}")

# Usage
requests = [
    {'latency_s': 2.5},
    {'latency_s': 3.2},
    {'latency_s': 1.8},
]
asyncio.run(log_to_csv(requests))
```

---

## Configuration Options

### Power Draw Estimates

Different models have different power requirements:

| Model Type | Typical Power (W) | Range |
|------------|-------------------|-------|
| Small LLM (7B params) | 50-100 | 30-150 |
| Medium LLM (13-30B) | 200-300 | 150-400 |
| Large LLM (70B+) | 400-600 | 300-800 |
| GPT-4 class | 400-500 | 300-700 |
| Image generation | 300-500 | 200-600 |

**Adjust power estimates** based on your model:
```python
power_w = 600  # For larger models
energy_kwh = (power_w / 1000) * (latency_s / 3600)
```

### PUE (Power Usage Effectiveness)

Datacenter efficiency varies:

| Datacenter Type | Typical PUE |
|-----------------|-------------|
| Hyperscale (Google, AWS) | 1.1-1.2 |
| Modern enterprise | 1.3-1.5 |
| Typical enterprise | 1.5-1.8 |
| Older facilities | 1.8-2.5 |

**Adjust PUE** in calculations:
```python
result = estimate_ai_emissions(
    energy_kwh,
    intensity,
    pue=1.1  # Very efficient datacenter
)
```

---

## Regional Zones

### Electricity Maps Zone Codes

Common zones for tracking:

**Europe**:
- Denmark: `DK-DK1`, `DK-DK2`
- Germany: `DE`
- France: `FR`
- UK: `GB`
- Norway: `NO-NO1`, `NO-NO2`, `NO-NO3`, `NO-NO4`, `NO-NO5`

**North America**:
- California: `US-CAL-CISO`
- Texas: `US-TEX-ERCO`
- New York: `US-NY-NYIS`

**Cloud Provider Regions** (use data center parameters instead):
```python
# AWS eu-west-1 (Ireland)
intensity = await get_grid_intensity(
    data_center_provider="aws",
    data_center_region="eu-west-1"
)
```

---

## Interpreting Results

### Understanding Emissions

**Typical AI Inference**:
- Small query: 0.01-0.05 g CO₂
- Medium query: 0.05-0.15 g CO₂
- Large query: 0.15-0.50 g CO₂

**Context**:
- 1g CO₂ ≈ 3 seconds of TV streaming
- 1kg CO₂ ≈ 5km driving (average car)
- 1000 requests @ 0.1g each = 100g = 0.5km driving

### Optimization Opportunities

If emissions are high, consider:

1. **Model Optimization**:
   - Use smaller, distilled models
   - Implement caching for repeated queries
   - Batch requests when possible

2. **Infrastructure**:
   - Choose regions with cleaner grids
   - Use renewable energy procurement
   - Optimize datacenter PUE

3. **Timing**:
   - Schedule batch jobs for low-carbon hours
   - Use forecast APIs to find optimal times

---

## Troubleshooting

### API Errors

**"ELECTRICITYMAPS_TOKEN not set"**:
```bash
# Add to .env file
echo "ELECTRICITYMAPS_TOKEN=your_token" >> .env
```

**"HTTP 401 Unauthorized"**:
- Check your API token is correct
- Verify token has not expired
- Free tier may have zone restrictions

**"HTTP 502 Bad Gateway"**:
- API may be temporarily unavailable
- Retry with exponential backoff
- Fall back to UK API or cached values

### Accuracy Issues

**Emissions seem too high/low**:
- Verify power draw estimate matches your hardware
- Check grid intensity makes sense for region
- Confirm PUE value is appropriate
- Ensure latency measurement is accurate

**Grid intensity unavailable**:
```python
try:
    intensity = await get_grid_intensity(zone="DK-DK2")
except Exception:
    # Fall back to regional average
    intensity = 0.3  # kg CO₂/kWh (European average)
```

---

## Next Steps

1. **Integrate with your application**
2. **Set up monitoring and alerts**
3. **Export data to dashboard/ESG platform**
4. **Optimize based on insights**
5. **Report to stakeholders**

See `/docs/platforms-comparison.md` for enterprise platform integration options.

---

*For questions or contributions, see our GitHub repository: https://github.com/Arnarsson/green-ai*
