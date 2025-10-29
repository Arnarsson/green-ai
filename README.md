# Green AI - CO₂ Tracking for AI Usage

A proof-of-concept tool for tracking and estimating CO₂ emissions from AI model inference and training using open APIs.

## Overview

This project provides simple Python tools to estimate the carbon footprint of AI workloads by:
- Fetching real-time grid carbon intensity from public APIs
- Calculating energy consumption based on model parameters
- Estimating CO₂ emissions with datacenter overhead (PUE)

## Features

- **Simple POC**: Basic CO₂ estimation using UK Carbon Intensity API
- **Electricity Maps Integration**: Multi-region support with more accurate data
- **Datacenter Overhead**: Accounts for Power Usage Effectiveness (PUE)
- **Flexible**: Works with various cloud providers and regions

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Arnarsson/green-ai.git
cd green-ai

# Install dependencies
pip install -r requirements.txt

# Configure environment (for Electricity Maps integration)
cp .env.example .env
# Edit .env and add your ELECTRICITYMAPS_TOKEN
```

### Basic Usage

#### Simple POC (UK Grid)

```bash
python src/poc_api_call.py
```

This will fetch the current UK grid intensity and estimate emissions for a sample AI inference call.

#### Electricity Maps Integration

```python
import asyncio
from src.electricity_maps_integration import get_grid_intensity, estimate_ai_emissions

async def track_inference():
    # Get current grid intensity for your region
    intensity = await get_grid_intensity(zone="DK-DK2")  # Denmark

    # Calculate energy for a 2.5s inference at 400W
    latency_s = 2.5
    power_w = 400
    energy_kwh = (power_w / 1000) * (latency_s / 3600)

    # Estimate emissions
    result = estimate_ai_emissions(energy_kwh, intensity)
    print(f"CO₂ emissions: {result['emissions_g']:.3f} g")

asyncio.run(track_inference())
```

## Data Sources

### UK Carbon Intensity API
- **URL**: https://api.carbonintensity.org.uk
- **Coverage**: Great Britain only
- **Cost**: Free
- **Data**: Real-time and forecast grid intensity in g CO₂/kWh

### Electricity Maps API
- **URL**: https://api-access.electricitymaps.com
- **Coverage**: Global (100+ regions)
- **Cost**: Free tier available (non-commercial), paid plans for production
- **Data**: Real-time carbon intensity, historical data, forecasts
- **Supported Zones**: DK-DK1, DK-DK2, US-CAL-CISO, and many more

## Methodology

The tool estimates CO₂ emissions using:

1. **Energy Calculation**:
   ```
   Energy (kWh) = Power (W) × Time (hours) / 1000
   ```

2. **Datacenter Overhead (PUE)**:
   ```
   Total Energy = Energy × PUE
   ```
   - Default PUE: 1.2 (typical modern datacenter)
   - Range: 1.1 (very efficient) to 2.0 (older facilities)

3. **Emissions Calculation**:
   ```
   CO₂ (kg) = Total Energy (kWh) × Grid Intensity (kg CO₂/kWh)
   ```

## Example Results

For a typical AI inference:
- **Tokens**: 250 (50 prompt + 200 completion)
- **Latency**: 2.5 seconds
- **Power Draw**: 400W
- **Grid Intensity**: 131 g CO₂/kWh (UK average)
- **PUE**: 1.2

**Results**:
- Energy: 0.000277 kWh
- Total Energy (with PUE): 0.000333 kWh
- **CO₂ Emissions**: ~0.044 g CO₂ per request

## Platform Comparison

Based on extensive research, here are the leading platforms for AI CO₂ tracking:

### Enterprise ESG Platforms

| Platform | AI-Specific Tracking | Integration | Best For | Pricing |
|----------|---------------------|-------------|----------|---------|
| **Sweep** | ✅ Impact Tracker | APIs, Cloud | Tech companies using AI in sustainability workflows | Enterprise (custom) |
| **Watershed** | Via Cloud Usage | Strong API | Tech companies, real-time monitoring | Enterprise (custom) |
| **Microsoft Sustainability Manager** | ✅ Azure-specific | Native Azure | Azure-heavy organizations | $4K-$10K/month |
| **Position Green** | Via IT Emissions | 100+ connectors | European enterprises, ESG compliance | Custom quote |
| **Plan A** | Via IT Emissions | APIs, bulk upload | EU compliance (CSRD), mid-large companies | Custom quote |

### Developer Tools

| Tool | Scope | Methodology | Cost | Accuracy |
|------|-------|-------------|------|----------|
| **CodeCarbon** | Training & Inference | Real-time CPU/GPU monitoring | Free (OSS) | ~90% for runtime energy |
| **EcoLogits** | LLM Inference | Per-API-call estimation | Free (OSS) | Good for relative comparisons |
| **Experiment Impact Tracker** | Training | Experiment logging | Free (OSS) | Good for benchmarking |
| **ML CO₂ Calculator** | Training | Post-hoc estimation | Free | Coarse (~±20%) |

## Integration Patterns

### 1. API Hooks for Cloud Emissions
```python
# Track cloud-based AI workloads
async def track_cloud_inference(provider, region, energy_kwh):
    intensity = await get_grid_intensity(
        data_center_provider=provider,  # "aws", "gcp", "azure"
        data_center_region=region        # e.g., "eu-west-1"
    )
    return estimate_ai_emissions(energy_kwh, intensity)
```

### 2. User-Facing Transparency
```python
# Show users the carbon cost
print(f"This query consumed ~{emissions_g:.2f} g CO₂")
print(f"Equivalent to {emissions_g/1000 * 3:.1f} seconds of TV streaming")
```

### 3. Dashboard Integration
```python
# Export to ESG platform
monthly_report = {
    "period": "2025-10",
    "total_emissions_kg": 12.5,
    "requests": 100000,
    "avg_per_request_g": 0.125
}
```

## Accuracy Considerations

### What This Tool Estimates
- ✅ Energy consumption based on power draw and latency
- ✅ Grid carbon intensity for the region
- ✅ Datacenter overhead (PUE)

### What It Doesn't Include
- ❌ Network energy (data transmission)
- ❌ Embodied emissions (hardware manufacturing)
- ❌ Cooling system variations
- ❌ Model training emissions (unless separately tracked)

### Improving Accuracy
1. **Measure actual power draw** using tools like CodeCarbon
2. **Use provider-specific data** when available (AWS/Azure/GCP carbon reports)
3. **Track at inference level** rather than estimating
4. **Account for hardware specifics** (GPU model, utilization)

## Roadmap

- [ ] FastAPI service for real-time tracking
- [ ] Support for more grid APIs (WattTime, ElectricityMap)
- [ ] Integration with major cloud providers' carbon APIs
- [ ] Dashboard for visualizing emissions over time
- [ ] CodeCarbon integration for training jobs
- [ ] Batch processing for historical analysis

## Research & Resources

This project is based on comprehensive research into CO₂ tracking platforms and methodologies. See the full research document in `/docs/research.md`.

### Key References
- UK Carbon Intensity API: https://api.carbonintensity.org.uk
- Electricity Maps: https://portal.electricitymaps.com
- CodeCarbon: https://codecarbon.io
- GHG Protocol: https://ghgprotocol.org
- Cloud Carbon Footprint: https://cloudcarbonfootprint.org

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - See LICENSE file for details

## Acknowledgments

Research compiled from:
- Sweep's AI Impact Tracker
- Watershed's carbon accounting methodology
- Microsoft's Sustainability Manager documentation
- CodeCarbon and EcoLogits projects
- Electricity Maps API documentation

---

**Note**: This is a proof-of-concept tool. For production use, consider enterprise platforms like Sweep, Watershed, or cloud provider-specific tools for more accurate tracking.
