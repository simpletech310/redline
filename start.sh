#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Redline PWA — Local Development Startup Script
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo ""
echo "🏁 REDLINE — Starting Local Dev Environment"
echo "───────────────────────────────────────────────"

# 1. Check Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

# 2. Start Docker services (PostgreSQL + API)
echo "🐳 Starting Docker services (PostgreSQL + FastAPI)..."
docker-compose -f "$ROOT_DIR/docker-compose.yml" up -d --build

# 3. Wait for API to be healthy
echo "⏳ Waiting for API to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API is ready at http://localhost:8000"
    break
  fi
  sleep 2
done

# 4. Start Next.js frontend
echo "⚡ Starting Next.js frontend..."
cd "$FRONTEND_DIR"
npm run dev -- --webpack &
FRONTEND_PID=$!

echo ""
echo "───────────────────────────────────────────────"
echo "✅ Redline PWA is running!"
echo ""
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."
echo "───────────────────────────────────────────────"

# Keep running until Ctrl+C
trap "kill $FRONTEND_PID; docker-compose -f '$ROOT_DIR/docker-compose.yml' down; exit 0" SIGINT SIGTERM
wait $FRONTEND_PID
