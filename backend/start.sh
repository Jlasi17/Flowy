#!/bin/bash
# Karaoke Backend — Launch Script
# Usage: cd backend && ./start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🎤 Creating Python virtual environment..."
    /opt/homebrew/bin/python3 -m venv venv
    echo "📦 Installing dependencies (this may take a few minutes on first run)..."
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r requirements.txt
fi

# Activate and run
echo "🚀 Starting Karaoke backend on http://localhost:8000"
exec ./venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000 --reload
