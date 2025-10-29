# API Testing Results

## Electricity Maps Free Tier Limitations

### Test Date
October 29, 2025

### API Key Tested
Type: Free Tier

### Results

The free tier API key has **severe limitations**:

```json
{
  "error": "Request unauthorized for zoneKey=...",
  "message": "You do not have access to this specific endpoint for this specific zone."
}
```

**Tested Zones** (all unauthorized):
- 🇫🇷 FR (France)
- 🇬🇧 GB (Great Britain)
- 🇩🇪 DE (Germany)
- 🇪🇸 ES (Spain)
- 🇩🇰 DK-DK1, DK-DK2 (Denmark)
- 🇺🇸 US-CAL-CISO (California)

### Free Tier Restrictions

According to testing and documentation:
- ✅ API key authenticates successfully
- ❌ No access to zone-specific data
- ❌ Cannot query carbon intensity for specific regions
- 💰 Requires paid plan for production use

### Pricing
Visit https://portal.electricitymaps.com for:
- Individual plans: Starting at $40/month
- Business plans: Custom pricing
- Full zone access and historical data

---

## ✅ Working Alternative: UK Carbon Intensity API

**Status**: ✅ **Fully Functional** (No authentication required)

### Quick Test
```bash
python src/poc_api_call.py
```

### Example Output
```
Timestamp UTC: 2025-10-29T13:34:00Z
Grid intensity: 0.131 kg CO₂/kWh
Tokens: 250
Latency: 2500 ms; Power draw: 400.0 W
Estimated emissions: 0.044 g CO₂
```

### Advantages
- ✅ **Free**: No API key required
- ✅ **Real-time**: Current and forecast data
- ✅ **Reliable**: Official UK government data
- ✅ **Simple**: Clean JSON API
- ✅ **Great for POC**: Perfect for demos

### Limitations
- 🇬🇧 **UK only**: Great Britain coverage only
- Cannot track other regions

---

## Recommendations

### For POC/Demo
✅ **Use UK Carbon Intensity API**
- Already implemented and tested
- Free and reliable
- Perfect for demonstrating the concept

### For Production (Multi-Region)

**Option 1: Cloud Provider APIs**
- ✅ AWS Carbon Footprint Tool (free for AWS customers)
- ✅ Azure Sustainability Manager (included with Azure)
- ✅ Google Cloud Carbon Footprint (free for GCP customers)
- Best accuracy for cloud workloads

**Option 2: CodeCarbon**
- ✅ Free open-source library
- Direct measurement of CPU/GPU usage
- Real-time emissions tracking
- Works anywhere

**Option 3: Electricity Maps Paid**
- Full global coverage (100+ zones)
- Historical data and forecasts
- Cloud datacenter support
- $40+/month

**Option 4: WattTime API**
- Alternative to Electricity Maps
- Free tier available for non-commercial
- North America focus

---

## Code Examples

### Using UK API (Free, Works Now)
```python
from src.poc_api_call import fetch_gb_grid_intensity, estimate_emissions

# Get current UK grid intensity
intensity = fetch_gb_grid_intensity()

# Calculate emissions for an AI inference
emissions_kg = estimate_emissions(intensity, latency_ms=2500)
print(f"CO₂: {emissions_kg * 1000:.3f} g")
```

### Using Electricity Maps (Requires Paid Plan)
```python
from src.electricity_maps_integration import get_grid_intensity

# This would work with a paid plan
intensity = await get_grid_intensity(zone="DK-DK2")
```

### Using Cloud Provider (AWS Example)
```python
# AWS provides carbon footprint data via their Carbon Footprint Tool
# Access through AWS Console → Customer Carbon Footprint Tool
# Or via AWS Cost Explorer API
```

### Using CodeCarbon (Free, Direct Measurement)
```python
from codecarbon import EmissionsTracker

tracker = EmissionsTracker()
tracker.start()

# Your AI inference code here
result = model.generate(prompt)

emissions = tracker.stop()
print(f"CO₂: {emissions * 1000:.3f} g")
```

---

## Summary

| Solution | Cost | Coverage | Accuracy | Setup Difficulty |
|----------|------|----------|----------|-----------------|
| **UK Carbon Intensity** | Free | 🇬🇧 UK only | High | Easy ✅ |
| **CodeCarbon** | Free | Global | Very High | Medium |
| **Cloud Provider APIs** | Free* | Their DC | Very High | Medium |
| **Electricity Maps (Paid)** | $40+/mo | Global | High | Easy |
| **WattTime** | Free tier | North America | High | Medium |

*Free for existing cloud customers

---

## Next Steps

1. ✅ **Continue with UK API** for POC and demos
2. For production, choose based on needs:
   - **Cloud-based AI?** → Use cloud provider APIs
   - **On-premise/hybrid?** → Use CodeCarbon
   - **Need global zones?** → Consider paid Electricity Maps or WattTime
3. Document methodology and assumptions
4. Set up monitoring and reporting

---

*For questions about Electricity Maps pricing, visit: https://portal.electricitymaps.com*
