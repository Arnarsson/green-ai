# Determining Datacenter Location for AI Emissions

## The Challenge

Most AI API providers (OpenAI, Anthropic, Cohere, etc.) **don't disclose** where your request was processed. This makes accurate carbon tracking difficult.

## Detection Methods

### Method 1: Provider Documentation (Best)

Check if your AI provider publishes datacenter locations:

| Provider | Location Info | Notes |
|----------|---------------|-------|
| **OpenAI** | ❌ Not disclosed | Likely US (multiple regions) |
| **Anthropic** | ❌ Not disclosed | Likely US + AWS regions |
| **Azure OpenAI** | ✅ You choose region | Use Azure region CO₂ data |
| **AWS Bedrock** | ✅ You choose region | Use AWS region CO₂ data |
| **Google Vertex AI** | ✅ You choose region | Use GCP region CO₂ data |
| **Hugging Face** | ⚠️ Varies | Check endpoint URL |

### Method 2: Network Latency Analysis

Measure latency to infer likely region:

```python
import time
import requests

def estimate_region_from_latency():
    """Rough estimation based on response time"""

    start = time.time()
    # Your API call here
    response = api.call(...)
    latency_ms = (time.time() - start) * 1000

    if latency_ms < 50:
        return "Same region/country"
    elif latency_ms < 100:
        return "Same continent"
    elif latency_ms < 200:
        return "Cross-continental (Europe-US)"
    else:
        return "Very distant or slow"
```

**Limitations**:
- Network conditions vary
- CDNs and caching affect results
- Load balancing may route differently

### Method 3: IP Geolocation

Check the API endpoint's IP location:

```python
import socket
import requests

def locate_api_endpoint(hostname):
    """Get approximate location of API server"""

    # Resolve IP
    ip = socket.gethostbyname(hostname)

    # Use IP geolocation service (free)
    response = requests.get(f"http://ip-api.com/json/{ip}")
    data = response.json()

    return {
        "ip": ip,
        "country": data.get("country"),
        "region": data.get("regionName"),
        "city": data.get("city")
    }

# Example
location = locate_api_endpoint("api.openai.com")
print(f"API likely hosted in: {location['country']}")
```

**Limitations**:
- Shows API gateway, not actual compute location
- Load balancers may have different IPs
- Doesn't guarantee where inference ran

### Method 4: Request Headers Analysis

Some providers include region hints in headers:

```python
def check_headers(response):
    """Look for region indicators in response headers"""

    headers = response.headers

    # Common indicators
    indicators = {
        "x-amzn-RequestId": "AWS region may be in request ID",
        "x-ms-request-id": "Azure region identifier",
        "x-goog-gfe-backend-request-cost": "Google infrastructure",
        "cf-ray": "Cloudflare (shows datacenter code)",
    }

    for header, meaning in indicators.items():
        if header in headers:
            print(f"Found: {header} = {headers[header][:20]}...")
            print(f"Meaning: {meaning}")
```

### Method 5: Provider-Specific Settings

#### Azure OpenAI (Recommended for Control)

```python
from openai import AzureOpenAI

client = AzureOpenAI(
    api_key="...",
    api_version="2024-02-01",
    azure_endpoint="https://YOUR-RESOURCE.openai.azure.com"  # Your chosen region
)

# You control the region!
# Use corresponding carbon intensity:
# - westeurope: Netherlands (320 g CO₂/kWh)
# - northeurope: Ireland (320 g CO₂/kWh)
# - francecentral: France (60 g CO₂/kWh)
# - norwayeast: Norway (20 g CO₂/kWh)
```

#### AWS Bedrock

```python
import boto3

bedrock = boto3.client(
    'bedrock-runtime',
    region_name='eu-west-1'  # You specify region!
)

# Region -> Country -> Carbon intensity:
# eu-west-1: Ireland (320 g CO₂/kWh)
# eu-north-1: Sweden (45 g CO₂/kWh)
# eu-central-1: Germany (380 g CO₂/kWh)
```

## Practical Approaches

### Approach 1: Conservative Estimate

Use **average grid intensity** for likely region:

```python
PROVIDER_ESTIMATES = {
    "openai": 400,        # US average (g CO₂/kWh)
    "anthropic": 400,     # US average
    "cohere": 350,        # US/Canada
    "azure-openai": None, # User-specified region
    "aws-bedrock": None,  # User-specified region
}

def get_provider_intensity(provider, region=None):
    """Get carbon intensity for AI provider"""

    if region:  # Cloud providers where you choose region
        return CLOUD_REGIONS[region]
    else:  # API-only providers
        return PROVIDER_ESTIMATES.get(provider, 400)  # Default to US
```

### Approach 2: Ask Your Provider

Contact your AI provider's support:

```
Subject: Carbon Emissions Tracking - Datacenter Locations

Hello,

I'm implementing carbon emissions tracking for our AI usage.
Could you provide:

1. Which datacenters/regions process API requests?
2. Can we specify preferred regions?
3. Do you publish carbon intensity data?
4. Are there any environmental impact reports?

This helps us meet our sustainability goals.

Thanks!
```

### Approach 3: Use Regional Deployment

**Best practice:** Deploy your AI in regions YOU control:

```python
# Option 1: Azure OpenAI in Norway (cleanest)
azure_client = AzureOpenAI(
    azure_endpoint="https://your-norway-resource.openai.azure.com"
)
emissions = calculate_emissions(
    latency_ms=2500,
    country_code="NO"  # Norway: 20 g/kWh!
)

# Option 2: AWS Bedrock in Sweden
bedrock = boto3.client('bedrock-runtime', region_name='eu-north-1')
emissions = calculate_emissions(
    latency_ms=2500,
    country_code="SE"  # Sweden: 45 g/kWh
)
```

### Approach 4: Multi-Provider Tracking

Track by provider with assumptions documented:

```python
class CarbonTracker:
    # Document your assumptions
    ASSUMPTIONS = {
        "openai": {
            "region": "us-east",
            "intensity_g_kwh": 400,
            "note": "Assumed US East Coast based on latency patterns"
        },
        "azure-openai-norway": {
            "region": "norwayeast",
            "intensity_g_kwh": 20,
            "note": "Confirmed: Azure Norway East region"
        }
    }

    def track(self, provider, latency_ms, power_w=400):
        config = self.ASSUMPTIONS[provider]
        intensity_kg = config["intensity_g_kwh"] / 1000

        energy_kwh = (power_w / 1000) * (latency_ms / 3600000)
        emissions_g = energy_kwh * config["intensity_g_kwh"] * 1.2  # PUE

        return {
            "emissions_g": emissions_g,
            "region": config["region"],
            "note": config["note"]
        }
```

## Recommendations by Scenario

### Scenario 1: Using OpenAI/Anthropic/Cohere APIs

**Problem**: No location control

**Solution**:
1. Use US average (400 g CO₂/kWh)
2. Document assumption clearly
3. Consider switching to cloud-hosted if accuracy matters

```python
# Conservative tracking
emissions = calculate_emissions(
    latency_ms=2500,
    country_code="EU"  # Use EU average if unclear
)
# Add note in reports: "Based on estimated US datacenter location"
```

### Scenario 2: Using Cloud-Hosted AI

**Problem**: Solved! You control location

**Solution**:
1. Choose greenest region (Norway, Sweden, France)
2. Use exact regional carbon intensity
3. Track with confidence

```python
# Azure OpenAI in Norway
emissions = calculate_emissions(
    latency_ms=2500,
    cloud_region="norwayeast"  # Norway: 20 g CO₂/kWh
)
```

### Scenario 3: Self-Hosted Models

**Problem**: You know exact location

**Solution**:
1. Use your datacenter's country
2. Or use direct measurement (CodeCarbon)

```python
# You know you're in Denmark
emissions = calculate_emissions(
    latency_ms=2500,
    country_code="DK"  # Denmark: 120 g CO₂/kWh
)
```

## Best Practices

### 1. Document Everything

```python
CARBON_TRACKING_CONFIG = {
    "version": "1.0",
    "last_updated": "2025-10-29",
    "assumptions": {
        "openai_gpt4": {
            "location": "Assumed US East based on latency <100ms",
            "grid_intensity": 400,  # g CO₂/kWh
            "confidence": "low",
            "fallback": "Use provider average if unsure"
        },
        "azure_norway": {
            "location": "Confirmed: Azure Norway East",
            "grid_intensity": 20,
            "confidence": "high",
            "source": "Azure Sustainability Calculator"
        }
    }
}
```

### 2. Measure and Update

```python
def update_location_assumption():
    """Periodically verify location assumptions"""

    # Measure latency over time
    latencies = measure_latency_pattern()

    # Check if assumptions still valid
    if avg_latency < 50:
        return "likely_local_region"
    elif avg_latency > 200:
        return "possibly_different_continent"
```

### 3. Use Ranges

When uncertain, provide ranges:

```python
emissions_report = {
    "best_case": calculate_emissions(..., country_code="NO"),  # Norway
    "likely": calculate_emissions(..., country_code="EU"),     # EU avg
    "worst_case": calculate_emissions(..., country_code="PL")  # Poland
}

print(f"Emissions: {emissions_report['likely']:.2f} g")
print(f"Range: {emissions_report['best_case']:.2f} - {emissions_report['worst_case']:.2f} g")
```

## Summary

| Method | Accuracy | Effort | When to Use |
|--------|----------|--------|-------------|
| **Provider docs** | High | Low | Always start here |
| **Cloud regions** | Very High | Low | When you control deployment |
| **Latency analysis** | Medium | Medium | For general estimates |
| **IP geolocation** | Low | Low | Quick approximation |
| **Conservative average** | Low | Very Low | When nothing else available |

## Quick Decision Tree

```
Do you control the AI deployment location?
├─ YES → Use exact region's carbon intensity ✅
└─ NO → Can you contact the provider?
    ├─ YES → Ask for datacenter info
    └─ NO → Use conservative estimates:
        ├─ If latency < 100ms → Use your region
        ├─ If provider is US-based → Use US average (400 g/kWh)
        └─ If uncertain → Use global average (500 g/kWh)
```

---

**Bottom Line**: For accurate tracking, use cloud-hosted AI (Azure OpenAI, AWS Bedrock) in regions YOU choose. Otherwise, document your assumptions clearly.
