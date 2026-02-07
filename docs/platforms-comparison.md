# ESG and CO₂ Tracking Platforms for AI Usage - Comprehensive Comparison

## Overview

This document provides a detailed comparison of platforms and tools for tracking CO₂ emissions from AI workloads, including both enterprise ESG platforms and developer-focused tools.

## Enterprise ESG Platforms

### 1. Sweep - Sustainability Data Platform

**Website**: https://sweep.net

**AI-Specific Features**:
- ✅ **Impact Tracker**: Monitors energy consumption and carbon emissions of AI features used within Sweep
- Shows energy (kWh) and CO₂ per AI operation
- Includes water usage metrics when relevant
- Real-time transparency for AI-driven workflows

**Key Capabilities**:
- Comprehensive Scope 1-3 carbon tracking
- Value-chain emission tracking
- Audit-grade data alignment (TCFD, CDP, CSRD)
- AI-powered data management

**Integration**:
- APIs for data collection and export
- Cloud provider integrations
- Business system connections

**Best For**:
- Medium to large enterprises
- Financial institutions
- Companies with significant value-chain emissions
- Organizations using AI in sustainability workflows

**Pricing**: Enterprise SaaS, custom pricing based on organization size

---

### 2. Watershed - Enterprise Carbon Tracking

**Website**: https://watershed.com

**AI-Specific Features**:
- Cloud computing emissions tracking (includes AI workloads)
- Detailed drill-down by service/resource
- Real-time carbon monitoring

**Key Capabilities**:
- Developer-friendly API
- Cloud provider integrations (AWS, GCP, Azure)
- Region-specific emission factors
- Renewable energy procurement tracking
- Decarbonization strategy modeling

**Integration**:
- Robust API for automation
- Cloud billing data sync
- ERP system connections
- Can embed in software products

**Best For**:
- Tech companies
- Organizations with significant cloud/IT footprint
- Companies seeking real-time monitoring
- Carbon-neutral initiatives

**Pricing**: Enterprise SaaS, typically tens to hundreds of thousands USD annually

---

### 3. Microsoft Cloud for Sustainability

**Website**: https://microsoft.com/sustainability

**AI-Specific Features**:
- ✅ Automatic tracking of Azure AI services
- Emissions breakdown by service, region, and time
- Azure ML and Azure OpenAI tracking

**Key Capabilities**:
- Native Azure integration
- Datacenter PUE and renewable energy accounting
- Power BI visualization
- GHG Protocol certified methodology

**Integration**:
- Native Azure services
- API for programmatic access
- Power BI connectors
- Manual upload for non-Microsoft operations

**Best For**:
- Azure-centric organizations
- Companies with significant Azure AI workloads
- IT departments tracking cloud carbon footprint

**Pricing**: ~$4K-$10K/month for large deployments, free trial available

**Limitations**: Only covers Microsoft/Azure ecosystem automatically

---

### 4. Position Green - ESG Reporting & Carbon Management

**Website**: https://positiongreen.com

**AI-Specific Features**:
- Tracks AI under IT emissions (not dedicated)
- Digital infrastructure emissions in Scope 3

**Key Capabilities**:
- Comprehensive ESG data management
- 100+ data connectors
- CSRD compliance support
- Carbon accounting (Scopes 1-3)

**Integration**:
- API for data import/export
- ERP, HR, and cloud metrics
- Automated data import

**Best For**:
- European enterprises
- ESG compliance (CSRD, GRI)
- Manufacturing, energy, finance sectors
- Broad ESG reporting beyond carbon

**Pricing**: Custom enterprise licensing, demo-based quotes

---

### 5. Plan A - Carbon Management Platform

**Website**: https://plana.earth

**AI-Specific Features**:
- AI emissions tracked under overall IT footprint
- AI-powered data mapping and anomaly detection

**Key Capabilities**:
- TÜV-certified carbon calculations
- Science-based targets (SBTi)
- AI-assisted ESG data consolidation
- CSRD compliance focus
- Reduction planning

**Integration**:
- APIs and bulk uploads
- Cloud and data source connections
- Financial system integrations

**Best For**:
- EU-based companies
- Tech startups to large firms
- CSRD compliance requirements
- Software, finance, manufacturing sectors

**Pricing**: Subscription model, scaling by size and modules (mid-range for SMBs)

---

### 6. Persefoni - Climate Management Platform

**Website**: https://persefoni.com

**AI-Specific Features**:
- AI emissions captured as part of IT footprint
- Can tag specific projects (like AI R&D)

**Key Capabilities**:
- Enterprise-wide carbon footprint
- Regulatory disclosure support (SEC, CSRD, ISSB)
- Portfolio carbon tracking
- Scenario analysis
- Smart mapping with AI assistance

**Integration**:
- ERP system connections
- Data import tools
- API for enterprise customers
- Consulting firm partnerships

**Best For**:
- Fortune 500 companies
- Financial institutions
- Complex organizations with Scope 3 challenges
- Compliance reporting

**Pricing**: High-end SaaS, tens to hundreds of thousands USD annually

---

## Developer Tools & Libraries

### 1. CodeCarbon

**Type**: Open-source Python library

**Capabilities**:
- Real-time CPU/GPU power monitoring
- Automatic CO₂ calculation based on region
- Integration with ML frameworks (PyTorch, TensorFlow)
- Optional cloud dashboard

**Methodology**:
- Uses `pynvml` for GPU power draw
- System sensors for CPU
- IP-to-region mapping for grid intensity
- ElectricityMaps integration

**Accuracy**: ~90% for runtime energy consumption

**Integration**:
```python
from codecarbon import EmissionsTracker

tracker = EmissionsTracker()
tracker.start()
# Your model training/inference
tracker.stop()
```

**Best For**:
- ML researchers
- Data science teams
- Model optimization
- Academic papers

**Cost**: Free (MIT License)

---

### 2. EcoLogits

**Type**: Open-source Python library (2025)

**Capabilities**:
- LLM inference carbon tracking
- Per-API-call emissions
- Usage + embodied emissions
- Multi-provider support (OpenAI, Anthropic, etc.)

**Methodology**:
- Model-specific benchmarks
- Latency-based compute time
- Datacenter PUE accounting
- Embodied emissions amortization

**Integration**:
```python
from ecologits import track_llm

emissions = track_llm(
    model="gpt-4",
    provider="openai",
    tokens=250,
    latency_ms=2500
)
print(f"CO₂: {emissions.co2_g} g")
```

**Best For**:
- AI product developers
- LLM service providers
- User-facing transparency
- Internal monitoring

**Cost**: Free (open-source)

---

### 3. Experiment Impact Tracker

**Type**: Research-focused Python framework

**Capabilities**:
- Detailed experiment logging
- CPU/GPU utilization tracking
- Memory and energy logging
- Integration with experiment management (MLflow, Sacred)

**Methodology**:
- System API monitoring
- NVIDIA management library
- Region-based carbon factors

**Best For**:
- Academic research
- Model benchmarking
- SustaiNLP competition
- Reproducibility studies

**Cost**: Free (open-source)

---

### 4. ML CO₂ Calculator

**Type**: Web-based and CLI tool

**Capabilities**:
- Post-hoc training emission estimates
- Simple input parameters (hardware, runtime, region)
- Quick order-of-magnitude estimates

**Methodology**:
- Predefined hardware coefficients
- Average power usage assumptions
- Regional carbon intensity

**Accuracy**: Coarse (~±20%), suitable for estimates

**Best For**:
- Publication reporting
- Early-stage planning
- Quick estimates

**Cost**: Free (open-source)

---

## API Data Sources

### UK Carbon Intensity API

**URL**: https://api.carbonintensity.org.uk

**Coverage**: Great Britain only

**Features**:
- Real-time and forecast intensity
- Free to use
- Simple JSON API
- No authentication required

**Example Response**:
```json
{
  "data": [{
    "intensity": {
      "forecast": 135,
      "actual": 131
    }
  }]
}
```

**Units**: g CO₂/kWh

---

### Electricity Maps API

**URL**: https://portal.electricitymaps.com

**Coverage**: 100+ zones globally

**Features**:
- Real-time carbon intensity
- Historical data
- 72-hour forecasts
- Zone, coordinates, or cloud region lookup

**Tiers**:
- Free (non-commercial, limited zones)
- Paid (full access, production use)

**Example Request**:
```bash
curl "https://api-access.electricitymaps.com/free-tier/v3/carbon-intensity/latest?zone=DK-DK2" \
  -H "auth-token: YOUR_TOKEN"
```

**Units**: g CO₂e/kWh

**Zones**: DK-DK1, DK-DK2, US-CAL-CISO, FR, DE, etc.

---

## Platform Selection Guide

### Choose Enterprise ESG Platform If:
- ✅ Need comprehensive ESG reporting (beyond carbon)
- ✅ Regulatory compliance requirements (CSRD, SEC)
- ✅ Multi-department coordination
- ✅ Audit-grade data needed
- ✅ Budget for enterprise software

**Recommendation by Use Case**:
- **AI-heavy tech company**: Sweep (Impact Tracker) or Watershed (API)
- **Azure-centric**: Microsoft Sustainability Manager
- **EU compliance**: Plan A or Position Green
- **Financial institution**: Persefoni

---

### Choose Developer Tools If:
- ✅ Need granular, per-model tracking
- ✅ Want to embed in AI workflows
- ✅ Research or benchmarking focus
- ✅ Limited budget
- ✅ Technical team

**Recommendation by Use Case**:
- **Model training**: CodeCarbon
- **LLM inference**: EcoLogits
- **Academic research**: Experiment Impact Tracker
- **Quick estimates**: ML CO₂ Calculator

---

## Integration Patterns

### Pattern 1: Cloud-Based AI Workloads

```python
# Use Electricity Maps for region-specific intensity
async def track_cloud_inference():
    intensity = await get_grid_intensity(
        data_center_provider="aws",
        data_center_region="eu-west-1"
    )
    emissions = estimate_ai_emissions(energy_kwh, intensity)
    return emissions
```

### Pattern 2: User-Facing Transparency

```python
# Show emissions to end-users
result = model.generate(prompt)
print(f"This response used {emissions:.2f} g CO₂")
print(f"≈ {emissions/1000 * 3:.1f}s of TV streaming")
```

### Pattern 3: ESG Dashboard Integration

```python
# Export to enterprise ESG platform
monthly_data = {
    "category": "AI_Compute_Emissions",
    "scope": 2,
    "emissions_kg": total_emissions,
    "period": "2025-10"
}
# POST to ESG platform API
```

---

## Accuracy Comparison

| Approach | Accuracy | Granularity | Effort | Cost |
|----------|----------|-------------|--------|------|
| Enterprise ESG Platform | High (audit-grade) | Monthly/Service | Low (automated) | High |
| Cloud Provider Data | Very High | Service/Region | Low | Included |
| CodeCarbon (runtime) | ~90% | Per-run | Medium | Free |
| EcoLogits (inference) | Good (relative) | Per-call | Low | Free |
| Grid API + Estimation | ~70-80% | Per-call | Low | Free |
| ML CO₂ Calculator | ~±20% | Per-training | Very Low | Free |

---

## Best Practices

1. **Start Simple**: Use free APIs and tools for POC
2. **Measure Actual Usage**: Prefer CodeCarbon over estimates when possible
3. **Account for PUE**: Include datacenter overhead (1.1-2.0x)
4. **Use Regional Data**: Grid intensity varies significantly by location
5. **Track Over Time**: Establish baseline and monitor trends
6. **Consider Embodied Emissions**: Hardware manufacturing impact
7. **Combine Approaches**: Enterprise platform + granular tools
8. **Validate**: Cross-reference different methods
9. **Document Methodology**: Be transparent about assumptions
10. **Optimize**: Use data to drive efficiency improvements

---

## Future Trends

- **Standardization**: Emerging standards for AI carbon reporting
- **Real-time APIs**: More providers offering live carbon data
- **Inference Focus**: Growing attention on inference vs. training emissions
- **Regulatory Pressure**: Mandatory reporting likely in EU and beyond
- **Carbon-Aware Computing**: Dynamic workload scheduling based on grid intensity
- **Hardware Advances**: More efficient chips reducing baseline emissions

---

## References

- Sweep AI Impact Tracker: https://sweep.net
- Watershed Documentation: https://watershed.com
- Microsoft Sustainability Manager: https://microsoft.com/sustainability
- CodeCarbon: https://codecarbon.io
- EcoLogits GitHub: https://github.com/genai-impact/ecologits
- Electricity Maps: https://electricitymaps.com
- UK Carbon Intensity: https://carbonintensity.org.uk
- GHG Protocol: https://ghgprotocol.org
- Cloud Carbon Footprint: https://cloudcarbonfootprint.org

---

*Last Updated: October 2025*
