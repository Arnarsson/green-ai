# Green AI API Service

RESTful API for tracking CO₂ emissions from AI usage with automatic provider detection.

## Features

- 🔍 **Auto-detection**: Automatically identify AI provider and datacenter location
- 🌍 **Multi-region**: Support for AWS, Azure, GCP datacenters across US, EU, and more
- ⚡ **Fast**: Async operations with <100ms response times
- 📊 **Accurate**: Combines multiple detection methods for ~70% accuracy (improving to 85%+)
- 🔒 **Secure**: Rate-limited (100 req/hour) with CORS support

## Quick Start

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Test the API

```bash
# Health check
curl http://localhost:8000/health

# List supported providers
curl http://localhost:8000/v1/providers

# List datacenter regions
curl http://localhost:8000/v1/regions
```

## API Endpoints

### 1. Manual Estimate (POST /v1/estimate)

Calculate emissions when you know the provider and region.

**Request:**
```bash
curl -X POST http://localhost:8000/v1/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "latency_ms": 2500,
    "provider": "openai",
    "region": "us-east-1",
    "power_watts": 400,
    "pue": 1.2
  }'
```

**Response:**
```json
{
  "emissions_g": 0.2634,
  "emissions_kg": 0.000263,
  "energy_kwh": 0.00027778,
  "grid_intensity_g_kwh": 380,
  "provider": "openai",
  "region": "us-east-1",
  "confidence": "high",
  "detection_method": "manual",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### 2. Auto-detect and Estimate (POST /v1/detect-and-estimate)

Automatically detect provider/region and calculate emissions.

**Request:**
```bash
curl -X POST http://localhost:8000/v1/detect-and-estimate \
  -H "Content-Type: application/json" \
  -d '{
    "api_endpoint": "https://api.openai.com/v1/chat/completions",
    "latency_ms": 2500,
    "response_headers": {
      "server": "cloudflare",
      "cf-ray": "8a1234567890abcd-CPH"
    },
    "power_watts": 400
  }'
```

**Response:**
```json
{
  "emissions_g": 0.2634,
  "emissions_kg": 0.000263,
  "energy_kwh": 0.00027778,
  "grid_intensity_g_kwh": 380,
  "detected_provider": "openai",
  "detected_region": "us-east-1",
  "detected_country": "US",
  "confidence": "high",
  "detection_method": "hostname",
  "detection_details": {
    "hostname": "api.openai.com",
    "pattern_matched": "openai.com",
    "all_likely_regions": ["us-east-1", "us-west-2"]
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### 3. List Providers (GET /v1/providers)

Get all supported AI providers and their known datacenters.

**Request:**
```bash
curl http://localhost:8000/v1/providers
```

**Response:**
```json
[
  {
    "name": "openai",
    "display_name": "OpenAI",
    "known_endpoints": ["api.openai.com", "chat.openai.com"],
    "likely_regions": ["us-east-1", "us-west-2"],
    "detection_accuracy": "95%"
  },
  {
    "name": "anthropic",
    "display_name": "Anthropic (Claude)",
    "known_endpoints": ["api.anthropic.com"],
    "likely_regions": ["us-west-2"],
    "detection_accuracy": "95%"
  }
]
```

### 4. List Regions (GET /v1/regions)

Get all datacenter regions with carbon intensity data.

**Request:**
```bash
curl http://localhost:8000/v1/regions
```

**Response:**
```json
[
  {
    "provider": "aws",
    "region_code": "us-east-1",
    "country": "US",
    "city": "Virginia",
    "intensity_g_kwh": 380,
    "coordinates": [38.13, -78.45],
    "renewable_percentage": 30
  },
  {
    "provider": "aws",
    "region_code": "eu-north-1",
    "country": "SE",
    "city": "Stockholm",
    "intensity_g_kwh": 45,
    "coordinates": [59.33, 18.06],
    "renewable_percentage": 95
  }
]
```

## Detection Methods

The API uses multiple detection methods with different confidence levels:

1. **Hostname Pattern Matching** (95% confidence)
   - Matches known provider domains (openai.com, anthropic.com, etc.)
   - Most reliable method

2. **Header Analysis** (80% confidence)
   - Analyzes Cloudflare Ray IDs, AWS headers, Azure headers
   - Good for proxied services

3. **IP Geolocation** (65% confidence)
   - Uses ip-api.com for free geolocation
   - Shows edge/proxy location (not always compute location)

4. **Latency Patterns** (60% confidence)
   - Estimates location based on response time
   - <50ms = same region, 50-100ms = same continent, etc.

The API combines all methods and uses the highest confidence result.

## Rate Limiting

- **Free tier**: 100 requests per hour per IP
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)

## Error Handling

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 404 Not Found
```json
{
  "error": "Endpoint not found",
  "message": "The endpoint /invalid does not exist",
  "docs": "/docs"
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded: 100 per 1 hour"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error message"
}
```

## Interactive Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Supported Providers

- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- Cohere
- Hugging Face
- Azure OpenAI
- AWS Bedrock

## Supported Regions

**AWS**: us-east-1, us-west-2, eu-west-1, eu-north-1, eu-central-1

**Azure**: norwayeast, westeurope, francecentral, germanywestcentral, northeurope

**GCP**: us-east1, europe-west1, europe-north1

## Carbon Intensity Data

Grid intensity values (g CO₂/kWh) vary by region:
- **Norway (NO)**: 20 (98% renewable)
- **Sweden (SE)**: 45 (95% renewable)
- **France (FR)**: 60 (70% renewable)
- **Denmark (DK)**: 120 (wind power)
- **Oregon (US-West-2)**: 120 (75% renewable)
- **Virginia (US-East-1)**: 380 (30% renewable)
- **Germany (DE)**: 380 (45% renewable)
- **Poland (PL)**: 700 (coal-heavy)

## Environment Variables

```bash
# Optional: Configure Redis for rate limiting
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: Configure logging
LOG_LEVEL=INFO
```

## Development

```bash
# Run with auto-reload
uvicorn api.main:app --reload

# Run tests (coming soon)
pytest

# Format code
black api/
isort api/

# Type checking
mypy api/
```

## Deployment

The API can be deployed to:
- Railway
- Render
- Fly.io
- Heroku
- Any platform supporting Python/FastAPI

See deployment guides in `/docs/deployment/` (coming soon).

## Roadmap

### Phase 1 (Current - Weeks 1-4)
- ✅ Basic API with 4 endpoints
- ✅ IP geolocation detection
- ✅ Provider database
- ⏳ Deploy to hosting platform
- ⏳ Beta testing

### Phase 2 (Weeks 5-8)
- Header analysis improvements
- Network tracing detection
- ML-based detection (~85% accuracy)
- Provider partnerships

### Phase 3 (Weeks 9-12)
- SDK wrapper approach
- HTTP proxy middleware
- Dashboard integration
- Auto-interception capabilities

## Contributing

This is currently a side project. Contributions welcome after public beta launch.

## License

MIT License - See LICENSE file for details

## Support

- Documentation: https://github.com/Arnarsson/green-ai/docs
- Issues: https://github.com/Arnarsson/green-ai/issues
