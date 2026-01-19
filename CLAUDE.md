# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Green AI is a RESTful API service for tracking CO₂ emissions from AI usage. It automatically detects AI providers (OpenAI, Anthropic, Cohere, etc.) and datacenter locations, then estimates carbon footprint using real grid carbon intensity data.

## Development Commands

```bash
# Start development server (from project root)
cd api && uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Or use the startup script
./api/run.sh

# Install dependencies (API service)
pip install -r api/requirements.txt

# Install dependencies (POC/examples)
pip install -r requirements.txt

# Docker build and run
docker build -t green-ai-api .
docker-compose up

# Test endpoints
./api/test_api.sh
```

**API Documentation**: http://localhost:8000/docs (Swagger UI)

## Architecture

```
api/                    # Main FastAPI service
├── main.py             # App setup, endpoints, routing
├── models.py           # Pydantic request/response schemas
├── detection.py        # Provider/datacenter detection (4-method cascade)
├── emissions.py        # CO₂ calculation (Energy × PUE × Grid Intensity)
└── database.py         # Provider and datacenter reference data

src/                    # POC and research tools
├── electricity_maps_integration.py   # Grid API integration
├── eu_regional_estimates.py          # Regional calculations
└── minstroem_integration.py          # Alternative grid data

examples/               # Usage examples and integration guides
docs/                   # Documentation and guides
```

## Key Concepts

### Detection System (api/detection.py)
4-method cascade with confidence scoring:
1. **Hostname Pattern Matching** (95% confidence) - Known endpoints
2. **Response Headers Analysis** (80%) - Cloudflare Ray ID, AWS/Azure headers
3. **IP Geolocation** (65%) - Uses ip-api.com
4. **Latency Pattern Analysis** (40-60%) - Regional distance estimation

### Emissions Calculation (api/emissions.py)
```
Energy (kWh) = Power (W) / 1000 × Time (hours)
CO₂ (kg) = Energy × PUE × Grid Intensity (kg CO₂/kWh)
```

### API Endpoints
- `POST /v1/estimate` - Manual emissions estimate (known provider/region)
- `POST /v1/detect-and-estimate` - Auto-detect provider/region, then estimate
- `GET /v1/providers` - List supported AI providers
- `GET /v1/regions` - List datacenter regions with carbon intensity
- `GET /health` - Health check

## Tech Stack

- **Framework**: FastAPI with Pydantic v2
- **Server**: Uvicorn (async)
- **HTTP Client**: httpx (async)
- **Rate Limiting**: slowapi (100 req/hr per IP)
- **DNS**: dnspython
- **Runtime**: Python 3.12+
