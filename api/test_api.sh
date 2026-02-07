#!/bin/bash

# Green AI API Test Script

BASE_URL="http://localhost:8000"

echo "🧪 Testing Green AI API"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Health Check${NC}"
curl -s $BASE_URL/health | python3 -m json.tool
echo ""
echo ""

echo -e "${BLUE}2. List Providers${NC}"
curl -s $BASE_URL/v1/providers | python3 -m json.tool | head -30
echo "... (truncated)"
echo ""
echo ""

echo -e "${BLUE}3. List Regions (first 3)${NC}"
curl -s $BASE_URL/v1/regions | python3 -m json.tool | head -40
echo "... (truncated)"
echo ""
echo ""

echo -e "${BLUE}4. Manual Estimate (OpenAI, US-East-1)${NC}"
curl -s -X POST $BASE_URL/v1/estimate \
  -H "Content-Type: application/json" \
  -d '{"latency_ms": 2500, "provider": "openai", "region": "us-east-1", "power_watts": 400, "pue": 1.2}' \
  | python3 -m json.tool
echo ""
echo ""

echo -e "${BLUE}5. Auto-detect (OpenAI)${NC}"
curl -s -X POST $BASE_URL/v1/detect-and-estimate \
  -H "Content-Type: application/json" \
  -d '{"api_endpoint": "https://api.openai.com/v1/chat/completions", "latency_ms": 2500, "power_watts": 400}' \
  | python3 -m json.tool
echo ""
echo ""

echo -e "${BLUE}6. Auto-detect (Anthropic)${NC}"
curl -s -X POST $BASE_URL/v1/detect-and-estimate \
  -H "Content-Type: application/json" \
  -d '{"api_endpoint": "https://api.anthropic.com/v1/messages", "latency_ms": 1800, "power_watts": 400}' \
  | python3 -m json.tool
echo ""
echo ""

echo -e "${BLUE}7. Auto-detect (Cohere)${NC}"
curl -s -X POST $BASE_URL/v1/detect-and-estimate \
  -H "Content-Type: application/json" \
  -d '{"api_endpoint": "https://api.cohere.ai/v1/generate", "latency_ms": 2000, "power_watts": 350}' \
  | python3 -m json.tool
echo ""
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "📚 View interactive docs at: $BASE_URL/docs"
echo "📖 View ReDoc at: $BASE_URL/redoc"
