#!/usr/bin/env bash
# =============================================================================
# SME Certificate Trust Platform — Safe Restart Script
#
# Usage:
#   bash scripts/restart_application.sh [--rebuild] [--migrate] [--skip-health]
#
# This script restarts an existing deployment without regenerating Fabric crypto,
# redeploying chaincode, deleting volumes, or changing .env.
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'
ORIGINAL_ARGS=("$@")

if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
fi

ok()    { echo -e "  ${GREEN}✓${NC} $*"; }
warn()  { echo -e "  ${YELLOW}⚠${NC}  $*"; }
info()  { echo -e "  ${CYAN}→${NC} $*"; }
fail()  { echo -e "\n  ${RED}✗ FATAL:${NC} $*\n" >&2; exit 1; }
banner(){ echo ""; echo -e "${BLUE}${BOLD}== $* ==${NC}"; echo ""; }

trap 'fail "Command failed at line ${LINENO}: ${BASH_COMMAND}"' ERR

REBUILD=false
MIGRATE=false
SKIP_HEALTH=false

usage() {
  cat <<USAGE
SME Certificate Trust Platform safe restart

Usage:
  bash scripts/restart_application.sh [options]

Options:
  --rebuild      Rebuild application images while starting the app stack
  --migrate      Run Prisma db push after PostgreSQL is ready
  --skip-health  Do not wait for health endpoints
  -h, --help     Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebuild) REBUILD=true; shift ;;
    --migrate) MIGRATE=true; shift ;;
    --skip-health) SKIP_HEALTH=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1. Run with --help for usage." ;;
  esac
 done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
NETWORK_DIR="$APP_DIR/blockchain/network"
COMPOSE_DIR="$APP_DIR/infra/compose"
FABRIC_COMPOSE="$NETWORK_DIR/docker/docker-compose-fabric.yaml"
APP_COMPOSE="$COMPOSE_DIR/compose.yaml"
ENV_FILE="$APP_DIR/.env"
CHANNEL_NAME="${CHANNEL_NAME:-certificates}"
CC_NAME="${CC_NAME:-certificate_contract}"
CHAINCODE_CONTAINER="cc-${CC_NAME}"

export PATH="$PATH:/usr/local/bin:/usr/local/go/bin:$HOME/go/bin"
export FABRIC_CFG_PATH="$NETWORK_DIR/config"

require_existing_deployment() {
  [[ -f "$FABRIC_COMPOSE" ]] || fail "Missing Fabric compose file: $FABRIC_COMPOSE"
  [[ -f "$APP_COMPOSE" ]] || fail "Missing app compose file: $APP_COMPOSE"
  [[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE. Run scripts/fresh_start_linux.sh first."
  [[ -d "$NETWORK_DIR/crypto-config/ordererOrganizations" ]] || fail "Missing Fabric crypto material. Run a fresh start first."
  [[ -f "$NETWORK_DIR/connection-profiles/connection-org1.json" ]] || fail "Missing Fabric connection profile. Run a fresh start first."
  [[ -f "$APP_DIR/wallets/org1/admin.id" ]] || fail "Missing Fabric admin wallet. Run a fresh start first."
}

ensure_docker_access() {
  if ! command -v docker >/dev/null 2>&1; then
    fail "Docker is not installed. Run scripts/fresh_start_linux.sh first."
  fi

  sudo systemctl start docker 2>/dev/null || true

  if docker info >/dev/null 2>&1; then
    ok "Docker daemon is running"
    return 0
  fi

  if [[ "${EUID}" -ne 0 ]] && command -v sg >/dev/null 2>&1 && id -nG "$USER" | grep -qw docker; then
    warn "Re-executing with docker group permissions active."
    local args_q=""
    if ((${#ORIGINAL_ARGS[@]})); then
      printf -v args_q ' %q' "${ORIGINAL_ARGS[@]}"
    fi
    exec sg docker -c "bash $(printf '%q' "$SCRIPT_DIR/restart_application.sh")${args_q}"
  fi

  fail "Docker daemon is not accessible. Ensure Docker is running and your user belongs to the docker group."
}

wait_for_fabric() {
  local max_wait="${1:-120}"
  local expected="${2:-10}"
  local elapsed=0
  local running=0
  info "Waiting for Fabric containers (${max_wait}s max)..."
  while [[ "$elapsed" -lt "$max_wait" ]]; do
    running="$(docker compose -f "$FABRIC_COMPOSE" ps --status running -q 2>/dev/null | wc -l | tr -d ' ')"
    if [[ "$running" -ge "$expected" ]]; then
      ok "$running Fabric containers running"
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    [[ $((elapsed % 20)) -eq 0 ]] && info "  $running containers running after ${elapsed}s..."
  done
  warn "Only $running Fabric containers are running; inspect with: docker compose -f $FABRIC_COMPOSE ps"
}

start_chaincode_container_if_present() {
  if docker ps -a --format '{{.Names}}' | grep -qx "$CHAINCODE_CONTAINER"; then
    if docker ps --format '{{.Names}}' | grep -qx "$CHAINCODE_CONTAINER"; then
      ok "Chaincode container $CHAINCODE_CONTAINER is running"
    else
      info "Starting chaincode container $CHAINCODE_CONTAINER..."
      docker start "$CHAINCODE_CONTAINER" >/dev/null
      ok "Chaincode container started"
    fi
  else
    warn "No CCaaS container named $CHAINCODE_CONTAINER found. This is normal if standard lifecycle chaincode was used."
  fi
}

wait_for_postgres() {
  info "Waiting for PostgreSQL..."
  local elapsed=0
  until docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" exec -T postgres pg_isready -U smeuser -d smecertdb >/dev/null 2>&1; do
    sleep 3
    elapsed=$((elapsed + 3))
    [[ "$elapsed" -lt 90 ]] || { warn "PostgreSQL did not become ready within 90s"; return 1; }
  done
  ok "PostgreSQL is ready"
}

run_migrations_if_requested() {
  [[ "$MIGRATE" == true ]] || return 0
  wait_for_postgres || return 0
  info "Applying Prisma schema..."
  docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" exec -T api \
    npx prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss || \
    warn "Prisma db push failed. Check API logs."
}

wait_for_api() {
  [[ "$SKIP_HEALTH" == false ]] || { warn "Skipping health waits as requested."; return 0; }
  info "Waiting for API health endpoint..."
  local elapsed=0
  while [[ "$elapsed" -lt 150 ]]; do
    if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
      ok "API is healthy"
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    [[ $((elapsed % 30)) -eq 0 ]] && info "  API still starting after ${elapsed}s..."
  done
  warn "API did not become healthy within 150s. Check: docker logs sme-cert-api --tail 100"
}

health_summary() {
  banner "Health summary"

  check_url() {
    local name="$1" url="$2"
    if curl -sf --max-time 5 "$url" >/dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} $name"
    else
      echo -e "  ${YELLOW}⚠${NC}  $name"
    fi
  }

  check_url "Nginx          http://localhost/health" "http://localhost/health"
  check_url "API            http://localhost:3000/api/health" "http://localhost:3000/api/health"
  check_url "Prometheus     http://localhost:9090/-/healthy" "http://localhost:9090/-/healthy"
  check_url "Grafana        http://localhost:3001/api/health" "http://localhost:3001/api/health"

  for port in 9443 9444 9445; do
    if curl -sfk --max-time 3 "https://localhost:${port}/healthz" >/dev/null 2>&1; then
      echo -e "  ${GREEN}✓${NC} Orderer ops :${port}"
    else
      echo -e "  ${YELLOW}⚠${NC}  Orderer ops :${port}"
    fi
  done

  echo ""
  echo "Container counts:"
  echo "  Fabric: $(docker compose -f "$FABRIC_COMPOSE" ps --status running -q 2>/dev/null | wc -l | tr -d ' ') running"
  echo "  App:    $(docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" ps --status running -q 2>/dev/null | wc -l | tr -d ' ') running"
}

print_summary() {
  local host
  host="$(curl -fsS --max-time 5 http://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || hostname -I | awk '{print $1}' || echo localhost)"
  banner "Restart complete"
  echo "Platform URL: http://${host}"
  echo "API health:   http://${host}/api/health"
  echo ""
  echo "Useful commands:"
  echo "  App logs:      docker compose --env-file $ENV_FILE -f $APP_COMPOSE logs -f"
  echo "  API logs:      docker logs -f sme-cert-api"
  echo "  Fabric status: docker compose -f $FABRIC_COMPOSE ps"
  echo "  Restart API:   docker compose --env-file $ENV_FILE -f $APP_COMPOSE restart api"
}

main() {
  banner "SME Certificate Trust Platform — Safe Restart"
  require_existing_deployment
  ensure_docker_access

  banner "Step 1/3 — Fabric network"
  docker compose -f "$FABRIC_COMPOSE" up -d
  wait_for_fabric 120 10
  start_chaincode_container_if_present
  info "Waiting briefly for Raft/orderer readiness..."
  sleep 15

  banner "Step 2/3 — Application stack"
  cd "$COMPOSE_DIR"
  if [[ "$REBUILD" == true ]]; then
    docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" up -d --build
  else
    docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" up -d
  fi
  run_migrations_if_requested
  wait_for_api

  banner "Step 3/3 — Checks"
  health_summary
  print_summary
}

main "$@"
