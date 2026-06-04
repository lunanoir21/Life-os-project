#!/bin/sh
set -e

echo "→ Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "→ Starting Life OS backend on port 8080..."
DATABASE_URL="${DATABASE_URL:-file:/app/data/prod.db}" \
    /usr/local/bin/lifeos-backend &
BACKEND_PID=$!

# Give the backend a moment to start before Next.js begins serving
sleep 1

echo "→ Starting Life OS on port ${PORT:-3000}..."
exec node server.js
