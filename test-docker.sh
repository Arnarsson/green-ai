#!/bin/bash

# Green AI API - Docker Test Script
# Test Docker build locally before deploying to Coolify

echo "🐳 Testing Green AI API Docker Build"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Docker image
echo -e "${BLUE}Step 1: Building Docker image...${NC}"
docker build -t green-ai-api:test .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 2: Run container
echo -e "${BLUE}Step 2: Starting container...${NC}"
docker run -d \
    --name green-ai-test \
    -p 8001:8000 \
    -e LOG_LEVEL=info \
    green-ai-api:test

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start container!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Container started on port 8001${NC}"
echo ""

# Step 3: Wait for health check
echo -e "${BLUE}Step 3: Waiting for API to be ready...${NC}"
sleep 5

# Step 4: Test health endpoint
echo -e "${BLUE}Step 4: Testing health endpoint...${NC}"
HEALTH=$(curl -s http://localhost:8001/health)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Health check failed!${NC}"
    docker logs green-ai-test
    docker stop green-ai-test
    docker rm green-ai-test
    exit 1
fi

echo "Response: $HEALTH"
echo -e "${GREEN}✅ Health check passed${NC}"
echo ""

# Step 5: Test providers endpoint
echo -e "${BLUE}Step 5: Testing providers endpoint...${NC}"
PROVIDERS=$(curl -s http://localhost:8001/v1/providers | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null)

if [ $? -eq 0 ] && [ "$PROVIDERS" -gt 0 ]; then
    echo "Found $PROVIDERS providers"
    echo -e "${GREEN}✅ Providers endpoint working${NC}"
else
    echo -e "${RED}❌ Providers endpoint failed${NC}"
fi
echo ""

# Step 6: Test detection endpoint
echo -e "${BLUE}Step 6: Testing detection endpoint...${NC}"
DETECTION=$(curl -s -X POST http://localhost:8001/v1/detect-and-estimate \
    -H "Content-Type: application/json" \
    -d '{"api_endpoint": "https://api.openai.com/v1/chat/completions", "latency_ms": 2500, "power_watts": 400}' \
    | python3 -c "import sys, json; data=json.load(sys.stdin); print(f'Provider: {data[\"detected_provider\"]}, Emissions: {data[\"emissions_g\"]}g')" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$DETECTION"
    echo -e "${GREEN}✅ Detection endpoint working${NC}"
else
    echo -e "${RED}❌ Detection endpoint failed${NC}"
fi
echo ""

# Step 7: Show container info
echo -e "${BLUE}Step 7: Container information:${NC}"
docker stats green-ai-test --no-stream
echo ""

# Step 8: View logs
echo -e "${BLUE}Step 8: Recent container logs:${NC}"
docker logs --tail 20 green-ai-test
echo ""

# Cleanup option
echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo "Container is running on http://localhost:8001"
echo "View docs at: http://localhost:8001/docs"
echo ""
echo "To stop and remove the test container:"
echo "  docker stop green-ai-test && docker rm green-ai-test"
echo ""
echo "To keep it running, press Ctrl+C now."
echo "Otherwise, it will be cleaned up in 10 seconds..."

sleep 10

# Cleanup
echo ""
echo -e "${BLUE}Cleaning up...${NC}"
docker stop green-ai-test
docker rm green-ai-test

echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""
echo "Ready to deploy to Coolify!"
