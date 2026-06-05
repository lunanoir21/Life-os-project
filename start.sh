#!/usr/bin/env bash
# Life OS — one-command Docker launcher (Linux / macOS / WSL).
#
# Usage:
#   ./start.sh           build & start, then follow logs
#   ./start.sh stop      stop containers (keep data)
#   ./start.sh reset     stop containers AND delete the data volume
#   ./start.sh logs      tail logs only
#
# Requires Docker Desktop or the Docker Engine + the compose plugin.

set -euo pipefail

# Pick `docker compose` (plugin) or fall back to the legacy `docker-compose`.
if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
else
    echo "✗ Docker Compose not found. Install Docker Desktop or the compose plugin." >&2
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "✗ Docker daemon is not running. Start Docker Desktop and retry." >&2
    exit 1
fi

cmd="${1:-up}"
case "$cmd" in
    up|start|"")
        echo "▸ Building and starting Life OS…"
        "${COMPOSE[@]}" up -d --build
        echo ""
        echo "→ Open http://localhost:3000"
        echo "  Stop:  ./start.sh stop"
        echo "  Reset: ./start.sh reset   (deletes the data volume)"
        echo ""
        echo "▸ Tailing logs (Ctrl+C to detach — the stack keeps running)"
        "${COMPOSE[@]}" logs -f --tail=50
        ;;
    stop|down)
        "${COMPOSE[@]}" down
        ;;
    reset)
        "${COMPOSE[@]}" down --volumes
        echo "✓ Stack stopped and data volume removed."
        ;;
    logs)
        "${COMPOSE[@]}" logs -f --tail=100
        ;;
    *)
        echo "Unknown command: $cmd" >&2
        echo "Usage: ./start.sh [up|stop|reset|logs]" >&2
        exit 2
        ;;
esac
