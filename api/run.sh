#!/bin/bash

# Green AI API Startup Script

echo "🚀 Starting Green AI API Service..."
echo ""

# Check if virtual environment exists
if [ ! -d "../venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python3 -m venv ../venv
    source ../venv/bin/activate
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
else
    source ../venv/bin/activate
fi

echo "✅ Virtual environment activated"
echo "🌐 Starting server on http://localhost:8000"
echo "📚 API docs available at http://localhost:8000/docs"
echo ""

# Start the server
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
