# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Green AI is a RESTful API service for tracking CO₂ emissions from AI usage. It automatically detects AI providers (OpenAI, Anthropic, Cohere, etc.) and datacenter locations, then estimates carbon footprint using real grid carbon intensity data.

## Development Commands

```bash
# Start development server
./api/run.sh
# OR manually:
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Install dependencies
pip install -r api/requirements.txt          # API service
pip install -r requirements.txt              # POC/examples

# Docker
docker build -t green-ai-api .
docker-compose up
```

**API Documentation**: http://localhost:8000/docs (Swagger UI)

## Testing

```bash
# Run all tests with coverage
pytest api/tests -v --cov=api --cov-report=term-missing

# Run specific test file
pytest api/tests/test_emissions.py -v

# Run single test
pytest api/tests/test_emissions.py::TestCalculateEmissions::test_basic_calculation -v

# Run tests matching a pattern
pytest api/tests -k "detection" -v
```

Test configuration uses `asyncio_mode = "auto"` for async tests. Set `ENVIRONMENT=test` and `LOG_LEVEL=WARNING` when running tests.

## Code Quality

```bash
# Format (line-length=100)
black api --line-length 100

# Lint (max-complexity=10)
flake8 api --max-complexity=10 --max-line-length=100

# Type check
mypy api --ignore-missing-imports

# Security
bandit -r api -ll -ii
safety check
```

CI runs all checks on PRs to main. Black formatting and flake8 must pass.

## Architecture

```
api/
├── main.py           # FastAPI app, endpoints, middleware stack
├── models.py         # Pydantic v2 request/response schemas
├── config.py         # Settings via BaseSettings (.env loading)
├── detection.py      # Provider/datacenter detection (4-method cascade)
├── emissions.py      # CO₂ calculation logic
├── database.py       # Provider and datacenter reference data
├── exceptions.py     # Custom exception hierarchy
├── logging_config.py # Structured logging (JSON/text formatters)
└── tests/            # pytest test suite
```

### Detection System (api/detection.py)
4-method cascade with confidence scoring:
1. **Hostname Pattern Matching** (95%) - Known endpoints (openai.com, anthropic.com)
2. **Response Headers Analysis** (80%) - Cloudflare Ray ID, AWS/Azure headers
3. **IP Geolocation** (65%) - ip-api.com with 24h TTL caching
4. **Latency Pattern Analysis** (40-60%) - Regional distance estimation

### Emissions Calculation (api/emissions.py)
```
Energy (kWh) = Power (W) / 1000 × Time (hours)
CO₂ (kg) = Energy × PUE × Grid Intensity (kg CO₂/kWh)
```

### Exception Hierarchy (api/exceptions.py)
All exceptions inherit from `GreenAIException` with `status_code`, `error_code`, `details`:
- `ValidationError` (422) - Invalid request data
- `ProviderDetectionError` (400) - Detection failed
- `ExternalServiceError` (503) - External API failure
- `RateLimitExceededError` (429) - Rate limit hit
- `DataNotFoundError` (404) - Provider/region not found

### Middleware Stack (order matters in main.py)
1. `SecurityHeadersMiddleware` - HSTS, CSP, X-Frame-Options
2. `RequestLoggingMiddleware` - Request/response logging with request ID
3. `CORSMiddleware` - CORS headers

### API Endpoints
- `POST /v1/estimate` - Manual emissions estimate (known provider/region)
- `POST /v1/detect-and-estimate` - Auto-detect provider/region, then estimate
- `GET /v1/providers` - List supported AI providers
- `GET /v1/regions` - List datacenter regions with carbon intensity
- `GET /health` - Health check
- `GET /health/detailed` - Extended health with dependency checks
- `GET /metrics` - Prometheus metrics

## Configuration

Key environment variables (see `.env.example`):
- `ENVIRONMENT`: test/development/production
- `LOG_LEVEL`: DEBUG/INFO/WARNING/ERROR
- `LOG_FORMAT`: json (production) or text (development)
- `RATE_LIMIT_REQUESTS`: Requests per period (default: 100)
- `RATE_LIMIT_PERIOD`: hour/minute/second/day
- `DEFAULT_POWER_WATTS`: Default AI inference power (default: 400)
- `DEFAULT_PUE`: Power Usage Effectiveness (default: 1.2)
