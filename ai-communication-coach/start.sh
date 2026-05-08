#!/bin/bash

# Start script for combined AI Communication Coach deployment
# Runs both backend and frontend in one container

echo "🚀 Starting AI Communication Coach..."

# Set default ports
BACKEND_PORT=${PORT:-8000}
FRONTEND_PORT=3000

# Generate JWT secret if not set
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "production-secret-change-in-env" ]; then
    export JWT_SECRET=$(openssl rand -hex 32)
    echo "🔑 Generated JWT_SECRET"
fi

# Create data directory
mkdir -p /app/data

# Start backend in background
echo "🔧 Starting Backend on port $BACKEND_PORT..."
cd /app/backend
python -c "
import uvicorn
import os
port = int(os.getenv('PORT', '8000'))
uvicorn.run('app.main:app', host='0.0.0.0', port=port, reload=False, log_level='info')
" &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/api/v1/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    sleep 1
done

# Start frontend
echo "🎨 Starting Frontend..."
cd /app/frontend
export NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT
npm run start &
FRONTEND_PID=$!

echo ""
echo "=============================================="
echo "🎉 AI Communication Coach is running!"
echo "=============================================="
echo ""
echo "📍 Frontend: http://localhost:$FRONTEND_PORT"
echo "📍 Backend API: http://localhost:$BACKEND_PORT/api/v1"
echo "📍 Health Check: http://localhost:$BACKEND_PORT/api/v1/health"
echo ""
echo "=============================================="
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
