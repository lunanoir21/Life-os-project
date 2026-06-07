#!/usr/bin/env bash
# Life OS — single-command launcher
#
# ./start.sh                 build & start (clean output)
# ./start.sh --verbose       build & start + full Docker logs
# ./start.sh --rebuild       force fresh image build
# ./start.sh --logs          follow logs after start
# ./start.sh --stop          stop containers (keep data)
# ./start.sh --reset         stop + DELETE data volume
# ./start.sh --help          show this help
set -euo pipefail

# ── ANSI ─────────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  B='\033[1m' DIM='\033[2m'
  R='\033[31m' G='\033[32m' Y='\033[33m' BL='\033[34m' C='\033[36m' X='\033[0m'
else
  B='' DIM='' R='' G='' Y='' BL='' C='' X=''
fi

step() { printf "\n${B}${BL}◆${X} ${B}%s${X}\n" "$*"; }
ok()   { printf "${G}✓${X} %s\n" "$*"; }
warn() { printf "${Y}!${X} %s\n" "$*"; }
err()  { printf "${R}✗${X} %s\n" "$*" >&2; }
info() { printf "${C}▸${X} %s\n" "$*"; }
dim()  { printf "${DIM}  %s${X}\n" "$*"; }

# ── flags ─────────────────────────────────────────────────────────────────────
VERBOSE=0 STOP_MODE=0 RESET_MODE=0 REBUILD=0 FOLLOW_LOGS=0

for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=1 ;;
    --stop)       STOP_MODE=1 ;;
    --reset)      STOP_MODE=1; RESET_MODE=1 ;;
    --rebuild)    REBUILD=1 ;;
    --logs|-l)    FOLLOW_LOGS=1 ;;
    --help|-h)
      printf "${B}Life OS — Docker Launcher${X}\n\n"
      printf "Usage: ./start.sh [OPTIONS]\n\n"
      printf "Options:\n"
      printf "  ${C}--verbose, -v${X}   Full Docker build output (layers, timing)\n"
      printf "  ${C}--logs,    -l${X}   Follow container logs after start\n"
      printf "  ${C}--rebuild${X}       Force rebuild image from scratch\n"
      printf "  ${C}--stop${X}          Stop running containers (data preserved)\n"
      printf "  ${C}--reset${X}         Stop + ${R}permanently delete${X} all data\n\n"
      printf "Examples:\n"
      printf "  ./start.sh              # start silently\n"
      printf "  ./start.sh -v           # start + full build output\n"
      printf "  ./start.sh --rebuild -v # rebuild from scratch + full output\n"
      printf "  ./start.sh --stop       # stop\n"
      printf "  ./start.sh --reset      # stop + wipe data\n"
      exit 0 ;;
    *) err "Unknown option: $arg  (try --help)"; exit 1 ;;
  esac
done

# ── spinner ───────────────────────────────────────────────────────────────────
SPIN_PID=
SPIN_FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

spin_start() {
  [ "$VERBOSE" -eq 1 ] && return
  local msg="$1"
  ( i=0
    while true; do
      printf "\r${C}%s${X} %s   " "${SPIN_FRAMES[$((i % ${#SPIN_FRAMES[@]}))]}" "$msg"
      i=$((i+1)); sleep 0.08
    done ) &
  SPIN_PID=$!
  disown "$SPIN_PID" 2>/dev/null || true
}

spin_stop() {
  [ "$VERBOSE" -eq 1 ] && return
  [ -n "${SPIN_PID:-}" ] && kill "$SPIN_PID" 2>/dev/null || true
  SPIN_PID=
  printf "\r\033[2K"
}

# ── command runner ────────────────────────────────────────────────────────────
CMD_OUT=/tmp/lifeos_out_$$
trap 'rm -f "$CMD_OUT"' EXIT

run() {
  if [ "$VERBOSE" -eq 1 ]; then
    "$@"
  else
    "$@" >"$CMD_OUT" 2>&1
  fi
}

run_check() {
  if [ "$VERBOSE" -eq 1 ]; then
    "$@"; return $?
  else
    "$@" >"$CMD_OUT" 2>&1; return $?
  fi
}

dump_output() { [ "$VERBOSE" -eq 0 ] && [ -f "$CMD_OUT" ] && cat "$CMD_OUT" || true; }

# ── system info ───────────────────────────────────────────────────────────────
detect_os() {
  local os arch
  arch=$(uname -m)
  case "$(uname -s)" in
    Linux)
      if [ -f /etc/os-release ]; then
        # shellcheck disable=SC1091
        os=$(. /etc/os-release && echo "${PRETTY_NAME:-Linux}")
      else
        os="Linux"
      fi
      grep -qi microsoft /proc/version 2>/dev/null && os="$os (WSL)"
      ;;
    Darwin)
      local ver; ver=$(sw_vers -productVersion 2>/dev/null || echo "")
      os="macOS ${ver}"
      ;;
    MINGW*|MSYS*|CYGWIN*) os="Windows" ;;
    *) os="$(uname -s)" ;;
  esac
  echo "$os / $arch"
}

app_version() {
  grep '"version"' package.json 2>/dev/null \
    | head -1 | sed 's/.*"version": *"\([^"]*\)".*/\1/' || echo "?"
}

# ── docker detection ──────────────────────────────────────────────────────────
COMPOSE_CMD=""
DOCKER_VER=""
COMPOSE_VER=""

check_docker() {
  if ! command -v docker &>/dev/null; then
    err "Docker not found on PATH."
    dim "Install: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! docker info &>/dev/null; then
    err "Docker daemon is not running."
    dim "Run: sudo systemctl start docker   (or start Docker Desktop)"
    exit 1
  fi
  DOCKER_VER=$(docker version --format '{{.Server.Version}}' 2>/dev/null || docker --version | grep -oP '[\d.]+' | head -1)
  if docker compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    COMPOSE_VER=$(docker compose version --short 2>/dev/null || docker compose version | grep -oP '[\d.]+' | head -1)
  elif command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
    COMPOSE_VER=$(docker-compose version --short 2>/dev/null || docker-compose version | grep -oP '[\d.]+' | head -1)
  else
    err "Docker Compose plugin not found."
    dim "Upgrade Docker Desktop or: sudo apt install docker-compose-plugin"
    exit 1
  fi
}

dc() { run $COMPOSE_CMD "$@"; }
dc_live() { $COMPOSE_CMD "$@"; }  # always inherit stdio (logs, interactive)

# ── timing ────────────────────────────────────────────────────────────────────
T0=$SECONDS
elapsed() {
  local s=$((SECONDS - T0))
  [ "$s" -lt 60 ] && echo "${s}s" || echo "$((s/60))m $((s%60))s"
}

# ── health check ──────────────────────────────────────────────────────────────
wait_ready() {
  local url="http://localhost:3000" max=180 n=0
  spin_start "Waiting for Life OS to become ready..."
  while [ "$n" -lt "$max" ]; do
    if curl -sf --max-time 2 "$url" &>/dev/null; then
      spin_stop; return 0
    fi
    sleep 2; n=$((n+2))
    if [ "$VERBOSE" -eq 1 ] && [ $((n % 10)) -eq 0 ]; then
      dim "  …waiting (${n}s / ${max}s)"
    fi
  done
  spin_stop; return 1
}

# ── STOP / RESET ──────────────────────────────────────────────────────────────
do_stop() {
  check_docker

  if [ "$RESET_MODE" -eq 1 ]; then
    printf "${R}${B}WARNING:${X} This permanently deletes all Life OS data.\n"
    printf "Press ${B}Enter${X} to confirm, ${B}Ctrl+C${X} to abort: "
    read -r _
  fi

  step "Stopping Life OS"
  local args=("down")
  [ "$RESET_MODE" -eq 1 ] && args+=("--volumes")

  spin_start "Stopping containers..."
  if run_check $COMPOSE_CMD "${args[@]}"; then
    spin_stop
    if [ "$RESET_MODE" -eq 1 ]; then
      ok "Stack stopped and data volume deleted."
    else
      ok "Stack stopped. Data is preserved."
      dim "To also delete data: ./start.sh --reset"
    fi
  else
    spin_stop; dump_output
    err "Failed to stop the stack."
    exit 1
  fi
}

# ── START ─────────────────────────────────────────────────────────────────────
do_start() {
  local ver; ver=$(app_version)
  local os;  os=$(detect_os)

  printf "\n"
  printf "  ${B}${BL}Life OS${X}  ${DIM}v${ver}${X}\n"
  printf "  ${DIM}%s${X}\n" "$os"
  printf "\n"

  step "Checking Docker"
  check_docker
  ok "Docker Engine  v${DOCKER_VER}"
  ok "Compose        v${COMPOSE_VER}  (${COMPOSE_CMD})"

  if [ "$VERBOSE" -eq 1 ]; then
    local cpu mem ctx
    cpu=$(nproc 2>/dev/null || sysctl -n hw.logicalcpu 2>/dev/null || echo "?")
    mem=$(docker info --format '{{.MemTotal}}' 2>/dev/null \
          | awk '{printf "%.1f GB", $1/1073741824}' 2>/dev/null || echo "?")
    ctx=$(docker context show 2>/dev/null || echo "default")
    dim "CPU cores      : $cpu"
    dim "Docker memory  : $mem"
    dim "Docker context : $ctx"
    dim "BuildKit       : $(DOCKER_BUILDKIT=1 docker buildx version 2>/dev/null | head -1 || echo 'not available')"
  fi

  step "Building & starting stack"
  if [ "$VERBOSE" -eq 0 ]; then
    dim "(first build: several minutes — Rust + Next.js compilation)"
    spin_start "Building Docker image..."
  fi

  local up_args=("-d" "--build")
  [ "$REBUILD" -eq 1 ] && up_args+=("--no-cache") && warn "Force rebuild (--no-cache)"

  if ! run_check $COMPOSE_CMD up "${up_args[@]}"; then
    spin_stop; dump_output
    err "Build failed. Run with --verbose for details."
    [ "$VERBOSE" -eq 0 ] && dim "  ./start.sh --verbose"
    exit 1
  fi
  spin_stop
  ok "Stack started"

  step "Health check"
  if wait_ready; then
    ok "Life OS is ready  ($(elapsed))"
  else
    warn "Health check timed out — container may still be starting."
    dim "Check logs: ./start.sh --logs"
  fi

  printf "\n"
  printf "  ${G}${B}→  http://localhost:3000${X}\n\n"
  printf "  ${DIM}Verbose logs :${X}  ./start.sh --logs\n"
  printf "  ${DIM}Stop         :${X}  ./start.sh --stop\n"
  printf "  ${DIM}Wipe data    :${X}  ./start.sh --reset\n"
  printf "\n"

  if [ "$FOLLOW_LOGS" -eq 1 ]; then
    step "Following logs  (Ctrl+C detaches — stack keeps running)"
    dc_live logs -f --tail=60 || true
  fi
}

# ── entry ─────────────────────────────────────────────────────────────────────
[ "$STOP_MODE" -eq 1 ] && do_stop || do_start
