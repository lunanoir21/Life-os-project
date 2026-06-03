#!/bin/sh
set -e

# Ensure the SQLite database matches the current Prisma schema.
# `db push` is idempotent: it creates the database file on first boot
# and applies any schema changes on subsequent boots.
echo "→ Syncing database schema..."
node node_modules/prisma/build/index.js db push --skip-generate

echo "→ Starting Life OS on port ${PORT:-3000}..."
exec node server.js
