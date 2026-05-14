#!/usr/bin/env bash
# =============================================================================
# SME Certificate Trust Platform — Fresh Linux Start Script
#
# Usage:
#   bash scripts/fresh_start_linux.sh [options]
#
# This script installs OS packages and platform dependencies, bootstraps the
# Hyperledger Fabric network, builds and starts the application stack, applies
# the database schema, seeds demo data, and prints health/access information.
# =============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

ORIGINAL_ARGS=("$@")

# ---------- Console helpers ---------------------------------------------------
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

usage() {
  cat <<USAGE
SME Certificate Trust Platform fresh Linux installer

Usage:
  bash scripts/fresh_start_linux.sh [options]

Options:
  --public-host HOST_OR_URL   Public IP/domain or full URL used for APP_URL/CORS_ORIGIN
  --force-env                 Regenerate .env and back up the existing file
  --reset-data                DESTRUCTIVE: remove app/Fabric volumes and generated material first
  --yes                       Skip destructive confirmation prompts
  --skip-system-update        Do not run OS package update/upgrade
  --skip-firewall             Do not open OS firewall ports 80/443
  --no-ccaas                  Use standard Fabric lifecycle deploy script instead of CCaaS
  -h, --help                  Show this help

Examples:
  bash scripts/fresh_start_linux.sh
  bash scripts/fresh_start_linux.sh --public-host 203.0.113.10
  bash scripts/fresh_start_linux.sh --public-host https://certs.example.com
  bash scripts/fresh_start_linux.sh --reset-data --yes
USAGE
}

# ---------- Defaults ----------------------------------------------------------
GO_VERSION="${GO_VERSION:-1.23.5}"
NODE_MAJOR="${NODE_MAJOR:-20}"
YARN_VERSION="${YARN_VERSION:-4.0.2}"
FABRIC_VERSION="${FABRIC_VERSION:-2.5.9}"
CHANNEL_NAME="${CHANNEL_NAME:-certificates}"
CC_NAME="${CC_NAME:-certificate_contract}"
CC_VERSION="${CC_VERSION:-1.0}"
CC_SEQUENCE="${CC_SEQUENCE:-1}"

PUBLIC_HOST=""
FORCE_ENV=false
RESET_DATA=false
YES=false
SKIP_SYSTEM_UPDATE=false
SKIP_FIREWALL=false
USE_CCAAS=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --public-host) PUBLIC_HOST="${2:-}"; shift 2 ;;
    --force-env) FORCE_ENV=true; shift ;;
    --reset-data) RESET_DATA=true; shift ;;
    --yes|-y) YES=true; shift ;;
    --skip-system-update) SKIP_SYSTEM_UPDATE=true; shift ;;
    --skip-firewall) SKIP_FIREWALL=true; shift ;;
    --no-ccaas) USE_CCAAS=false; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1. Run with --help for usage." ;;
  esac
 done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
NETWORK_DIR="$APP_DIR/blockchain/network"
NETWORK_SCRIPTS="$NETWORK_DIR/scripts"
COMPOSE_DIR="$APP_DIR/infra/compose"
FABRIC_COMPOSE="$NETWORK_DIR/docker/docker-compose-fabric.yaml"
APP_COMPOSE="$COMPOSE_DIR/compose.yaml"
ENV_FILE="$APP_DIR/.env"
CHAINCODE_CONTAINER="cc-${CC_NAME}"

export PATH="$PATH:/usr/local/bin:/usr/local/go/bin:$HOME/go/bin"
export FABRIC_CFG_PATH="$NETWORK_DIR/config"

# ---------- Utility functions -------------------------------------------------
require_not_root() {
  [[ "${EUID}" -ne 0 ]] || fail "Run as a normal sudo-enabled user, not root. Generated files should not be owned by root."
  command -v sudo >/dev/null 2>&1 || fail "sudo is required."
  sudo -v || fail "This user must have sudo privileges."
}

require_project_files() {
  [[ -f "$APP_DIR/package.json" ]] || fail "package.json not found. Run this script from inside the project repository."
  [[ -f "$FABRIC_COMPOSE" ]] || fail "Fabric compose file missing: $FABRIC_COMPOSE"
  [[ -f "$APP_COMPOSE" ]] || fail "Application compose file missing: $APP_COMPOSE"
}

detect_package_manager() {
  if command -v dnf >/dev/null 2>&1; then echo dnf
  elif command -v yum >/dev/null 2>&1; then echo yum
  elif command -v apt-get >/dev/null 2>&1; then echo apt
  else fail "Supported package manager not found. Expected dnf, yum, or apt-get."
  fi
}

load_os_release() {
  OS_ID="unknown"; OS_LIKE=""; VERSION_CODENAME=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_ID="${ID:-unknown}"
    OS_LIKE="${ID_LIKE:-}"
    VERSION_CODENAME="${VERSION_CODENAME:-}"
  fi
}

arch_name() {
  case "$(uname -m)" in
    x86_64|amd64) echo amd64 ;;
    aarch64|arm64) echo arm64 ;;
    *) fail "Unsupported CPU architecture: $(uname -m)" ;;
  esac
}

reexec_with_docker_group_if_needed() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi

  if ! getent group docker >/dev/null 2>&1; then
    sudo groupadd docker
  fi

  if ! id -nG "$USER" | grep -qw docker; then
    info "Adding $USER to docker group..."
    sudo usermod -aG docker "$USER"
  fi

  if command -v sg >/dev/null 2>&1; then
    warn "Re-executing script with docker group permissions active."
    local args_q=""
    if ((${#ORIGINAL_ARGS[@]})); then
      printf -v args_q ' %q' "${ORIGINAL_ARGS[@]}"
    fi
    exec sg docker -c "bash $(printf '%q' "$SCRIPT_DIR/fresh_start_linux.sh")${args_q}"
  fi

  fail "Docker permissions are not active. Log out and back in, then run the script again."
}

install_base_packages() {
  local pm="$1"
  banner "Phase 1/10 — System packages"

  if [[ "$SKIP_SYSTEM_UPDATE" == false ]]; then
    info "Updating system packages using $pm..."
    case "$pm" in
      dnf) sudo dnf update -y ;;
      yum) sudo yum update -y ;;
      apt) sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y ;;
    esac
  else
    warn "Skipping system update as requested."
  fi

  info "Installing core tools..."
  case "$pm" in
    dnf)
      sudo dnf install -y dnf-plugins-core git curl wget tar unzip gcc gcc-c++ make openssl jq python3 dos2unix ca-certificates shadow-utils
      ;;
    yum)
      sudo yum install -y yum-utils git curl wget tar unzip gcc gcc-c++ make openssl jq python3 dos2unix ca-certificates shadow-utils
      ;;
    apt)
      sudo apt-get update
      sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl wget tar unzip build-essential openssl jq python3 python3-pip dos2unix ca-certificates gnupg lsb-release
      ;;
  esac
  ok "Core tools installed"
}

install_docker() {
  local pm="$1"
  banner "Phase 2/10 — Docker Engine and Compose"

  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    ok "Docker already installed: $(docker --version) / $(docker compose version --short)"
  else
    info "Installing Docker Engine..."
    case "$pm" in
      dnf)
        sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        ;;
      yum)
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        ;;
      apt)
        if [[ "$OS_ID" != "ubuntu" && "$OS_ID" != "debian" ]]; then
          curl -fsSL https://get.docker.com | sudo sh
        else
          local codename="$VERSION_CODENAME"
          if [[ -z "$codename" ]] && command -v lsb_release >/dev/null 2>&1; then codename="$(lsb_release -cs)"; fi
          [[ -n "$codename" ]] || fail "Could not determine apt distribution codename for Docker repository."
          sudo install -m 0755 -d /etc/apt/keyrings
          sudo rm -f /etc/apt/keyrings/docker.gpg
          curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
          sudo chmod a+r /etc/apt/keyrings/docker.gpg
          echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_ID} ${codename} stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
          sudo apt-get update
          sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        fi
        ;;
    esac
  fi

  sudo systemctl enable --now docker
  reexec_with_docker_group_if_needed
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not available."
  ok "Docker is ready: $(docker --version), compose $(docker compose version --short)"
}

install_go() {
  banner "Phase 3/10 — Go ${GO_VERSION}"
  local current=""
  current="$(go version 2>/dev/null | awk '{print $3}' | sed 's/go//' || true)"
  if [[ "$current" == "$GO_VERSION" ]]; then
    ok "Go ${GO_VERSION} already installed"
    return
  fi

  local arch; arch="$(arch_name)"
  local tarball="go${GO_VERSION}.linux-${arch}.tar.gz"
  info "Installing Go ${GO_VERSION} for ${arch}..."
  wget -q "https://go.dev/dl/${tarball}" -O "/tmp/${tarball}"
  sudo rm -rf /usr/local/go
  sudo tar -C /usr/local -xzf "/tmp/${tarball}"
  rm -f "/tmp/${tarball}"
  sudo tee /etc/profile.d/go.sh >/dev/null <<'GO_PROFILE'
export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin
export GOPATH=$HOME/go
GO_PROFILE
  grep -q '/usr/local/go/bin' "$HOME/.bashrc" 2>/dev/null || {
    echo 'export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin' >> "$HOME/.bashrc"
    echo 'export GOPATH=$HOME/go' >> "$HOME/.bashrc"
  }
  export PATH="$PATH:/usr/local/go/bin:$HOME/go/bin"
  ok "$(go version)"
}

install_node_yarn() {
  local pm="$1"
  banner "Phase 4/10 — Node.js ${NODE_MAJOR} and Yarn ${YARN_VERSION}"

  local current_major=""
  current_major="$(node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)"
  if [[ "$current_major" != "$NODE_MAJOR" ]]; then
    info "Installing Node.js ${NODE_MAJOR}..."
    curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" >/tmp/nodesource_rpm.sh 2>/dev/null || true
    case "$pm" in
      dnf) sudo bash /tmp/nodesource_rpm.sh && sudo dnf install -y nodejs ;;
      yum) sudo bash /tmp/nodesource_rpm.sh && sudo yum install -y nodejs ;;
      apt) curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs ;;
    esac
    rm -f /tmp/nodesource_rpm.sh
  fi

  command -v node >/dev/null 2>&1 || fail "Node.js installation failed."
  sudo corepack enable
  corepack prepare "yarn@${YARN_VERSION}" --activate || sudo corepack prepare "yarn@${YARN_VERSION}" --activate
  ok "Node $(node --version), Yarn $(yarn --version)"
}

install_fabric_binaries() {
  banner "Phase 5/10 — Hyperledger Fabric ${FABRIC_VERSION} binaries"
  local need_install=false
  for tool in cryptogen configtxgen peer osnadmin; do
    command -v "$tool" >/dev/null 2>&1 || need_install=true
  done

  if [[ "$need_install" == false ]] && cryptogen version 2>&1 | grep -q "v${FABRIC_VERSION}"; then
    ok "Fabric binaries already installed: $(cryptogen version 2>&1 | grep -o 'v[0-9][^ ]*' | head -1)"
    return
  fi

  local arch; arch="$(arch_name)"
  local tarball="hyperledger-fabric-linux-${arch}-${FABRIC_VERSION}.tar.gz"
  local url="https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/${tarball}"
  info "Downloading ${url}..."
  wget -q "$url" -O "/tmp/${tarball}"
  rm -rf /tmp/fabric-bin-extract
  mkdir -p /tmp/fabric-bin-extract
  tar -xzf "/tmp/${tarball}" -C /tmp/fabric-bin-extract
  sudo cp /tmp/fabric-bin-extract/bin/* /usr/local/bin/
  sudo chmod +x /usr/local/bin/{cryptogen,configtxgen,peer,osnadmin,orderer,discover,ledgerutil} 2>/dev/null || true
  rm -rf "/tmp/${tarball}" /tmp/fabric-bin-extract
  ok "Fabric binaries installed to /usr/local/bin"
}

pull_fabric_images() {
  banner "Phase 6/10 — Fabric Docker images"
  local images=(
    "hyperledger/fabric-peer:2.5"
    "hyperledger/fabric-orderer:2.5"
    "hyperledger/fabric-tools:2.5"
    "hyperledger/fabric-ccenv:2.5"
    "hyperledger/fabric-baseos:2.5"
    "couchdb:3.3"
  )
  for image in "${images[@]}"; do
    if docker image inspect "$image" >/dev/null 2>&1; then
      ok "$image already present"
    else
      info "Pulling $image..."
      docker pull "$image"
    fi
  done
}

sanitize_project_files() {
  banner "Phase 7/10 — Project scripts and Node dependencies"
  info "Fixing shell script permissions and line endings..."
  find "$APP_DIR" -path "$APP_DIR/.git" -prune -o -name '*.sh' -print0 | xargs -0 -r chmod +x
  if command -v dos2unix >/dev/null 2>&1; then
    find "$APP_DIR/scripts" "$NETWORK_SCRIPTS" -name '*.sh' -print0 2>/dev/null | xargs -0 -r dos2unix -q || true
  fi
  ok "Shell scripts are executable"

  info "Installing Yarn workspace dependencies..."
  cd "$APP_DIR"
  yarn install --immutable || yarn install
  ok "Workspace dependencies installed"
}

confirm_reset_if_requested() {
  [[ "$RESET_DATA" == true ]] || return 0
  banner "Destructive reset requested"
  warn "This will delete Docker volumes, generated Fabric crypto, wallets, channel artifacts, and seeded-data sentinels."
  if [[ "$YES" != true ]]; then
    read -r -p "Type RESET to continue: " answer
    [[ "$answer" == "RESET" ]] || fail "Reset cancelled."
  fi

  info "Stopping and deleting application/Fabric volumes..."
  if [[ -f "$ENV_FILE" ]]; then
    docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" down -v 2>/dev/null || true
  else
    docker compose -f "$APP_COMPOSE" down -v 2>/dev/null || true
  fi
  docker compose -f "$FABRIC_COMPOSE" down -v 2>/dev/null || true
  docker rm -f "$CHAINCODE_CONTAINER" 2>/dev/null || true
  rm -rf "$NETWORK_DIR/crypto-config" \
         "$NETWORK_DIR/channel-artifacts" \
         "$NETWORK_DIR/system-genesis-block" \
         "$NETWORK_DIR/connection-profiles" \
         "$APP_DIR/wallets" \
         "$APP_DIR/.data-seeded" \
         "$NETWORK_DIR/.channel-created" \
         "$NETWORK_DIR/.chaincode-deployed"
  ok "Reset complete"
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
  warn "Only $running Fabric containers are running; continuing so diagnostics can be shown."
  docker compose -f "$FABRIC_COMPOSE" ps || true
}

set_org1_peer_env() {
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID=Org1MSP
  export CORE_PEER_ADDRESS=localhost:7051
  export CORE_PEER_MSPCONFIGPATH="$NETWORK_DIR/crypto-config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
  export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK_DIR/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
}

chaincode_committed() {
  set_org1_peer_env
  peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" --name "$CC_NAME" >/dev/null 2>&1
}

bootstrap_fabric() {
  banner "Phase 8/10 — Hyperledger Fabric network"
  export FABRIC_CFG_PATH="$NETWORK_DIR/config"

  if [[ ! -d "$NETWORK_DIR/crypto-config/ordererOrganizations" ]]; then
    info "Generating Fabric crypto material..."
    bash "$NETWORK_SCRIPTS/generate_crypto.sh"
  else
    ok "Crypto material already exists"
  fi

  if [[ ! -f "$NETWORK_DIR/channel-artifacts/${CHANNEL_NAME}.block" ]]; then
    info "Generating channel artifacts..."
    bash "$NETWORK_SCRIPTS/generate_artifacts.sh"
  else
    ok "Channel artifact already exists"
  fi

  info "Starting Fabric containers..."
  docker compose -f "$FABRIC_COMPOSE" up -d
  wait_for_fabric 120 10

  info "Waiting for Raft leader election..."
  sleep 20

  info "Creating/joining channel ${CHANNEL_NAME}..."
  bash "$NETWORK_SCRIPTS/create_channel.sh"
  touch "$NETWORK_DIR/.channel-created"

  if chaincode_committed; then
    ok "Chaincode ${CC_NAME} is already committed"
    touch "$NETWORK_DIR/.chaincode-deployed"
  else
    info "Deploying chaincode ${CC_NAME}..."
    cd "$NETWORK_DIR"
    if [[ "$USE_CCAAS" == true && -f "$NETWORK_SCRIPTS/deploy_chaincode_ccaas.sh" ]]; then
      CC_VERSION="$CC_VERSION" CC_SEQUENCE="$CC_SEQUENCE" bash "$NETWORK_SCRIPTS/deploy_chaincode_ccaas.sh"
    else
      CC_VERSION="$CC_VERSION" CC_SEQUENCE="$CC_SEQUENCE" bash "$NETWORK_SCRIPTS/deploy_chaincode.sh"
    fi
    touch "$NETWORK_DIR/.chaincode-deployed"
  fi

  initialize_ledger

  info "Generating Fabric connection profiles..."
  bash "$NETWORK_SCRIPTS/generate_connection_profiles.sh"

  info "Creating Fabric admin wallets..."
  bash "$NETWORK_SCRIPTS/enroll_admin.sh"

  ok "Fabric network bootstrap complete"
}

initialize_ledger() {
  set_org1_peer_env
  local query_output=""
  query_output="$(peer chaincode query -C "$CHANNEL_NAME" -n "$CC_NAME" -c '{"function":"GetIssuer","Args":["org1"]}' 2>/dev/null || true)"
  if echo "$query_output" | grep -q 'org1'; then
    ok "Ledger already initialized"
    return 0
  fi

  info "Initializing ledger with InitLedger..."
  local orderer_ca="$NETWORK_DIR/crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
  local tls1="$NETWORK_DIR/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
  local tls2="$NETWORK_DIR/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
  local tls3="$NETWORK_DIR/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt"

  peer chaincode invoke \
    -o localhost:7050 --tls --cafile "$orderer_ca" \
    -C "$CHANNEL_NAME" -n "$CC_NAME" \
    --peerAddresses localhost:7051  --tlsRootCertFiles "$tls1" \
    --peerAddresses localhost:9051  --tlsRootCertFiles "$tls2" \
    --peerAddresses localhost:11051 --tlsRootCertFiles "$tls3" \
    -c '{"function":"InitLedger","Args":[]}'

  sleep 6
  ok "Ledger initialization invoked"
}

detect_public_host() {
  if [[ -n "$PUBLIC_HOST" ]]; then
    echo "$PUBLIC_HOST"
    return
  fi
  curl -fsS --max-time 5 http://checkip.amazonaws.com 2>/dev/null | tr -d '[:space:]' || \
  curl -fsS --max-time 5 http://ifconfig.me 2>/dev/null | tr -d '[:space:]' || \
  hostname -I | awk '{print $1}' || \
  echo "localhost"
}

url_from_host() {
  local host="$1"
  if [[ "$host" =~ ^https?:// ]]; then echo "$host"; else echo "http://${host}"; fi
}

setup_environment_file() {
  banner "Phase 9/10 — Application environment"
  local host app_url
  host="$(detect_public_host)"
  app_url="$(url_from_host "$host")"

  if [[ -f "$ENV_FILE" && "$FORCE_ENV" == false ]]; then
    ok "Using existing .env at $ENV_FILE"
    sed -i '/^SMTP_[A-Za-z_]*=[[:space:]]*$/d' "$ENV_FILE" || true
    return
  fi

  if [[ -f "$ENV_FILE" ]]; then
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    warn "Existing .env backed up before regeneration"
  fi

  local jwt_secret master_key pg_pass grafana_pass
  jwt_secret="$(openssl rand -base64 48 | tr -d '\n=/+')"
  master_key="$(openssl rand -hex 32)"
  pg_pass="$(openssl rand -base64 24 | tr -d '\n=/+')"
  grafana_pass="$(openssl rand -base64 16 | tr -d '\n=/+')"

  cat > "$ENV_FILE" <<ENV_EOF
# Auto-generated by scripts/fresh_start_linux.sh on $(date -u '+%Y-%m-%d %H:%M UTC')
# Keep this file private. Do not commit it.

POSTGRES_DB=smecertdb
POSTGRES_USER=smeuser
POSTGRES_PASSWORD=${pg_pass}

JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=1h
MASTER_ENCRYPTION_KEY=${master_key}

FABRIC_CHANNEL_NAME=${CHANNEL_NAME}
FABRIC_CHAINCODE_NAME=${CC_NAME}
FABRIC_CONNECTION_PROFILE_PATH=/app/fabric/profiles/connection-org1.json
FABRIC_WALLET_PATH=/app/wallets/org1

CORS_ORIGIN=${app_url}
APP_URL=${app_url}
PLATFORM_NAME=SME Certificate Trust Platform

# SMTP is optional. Leave unset to disable outbound email.
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=noreply@example.com
# SMTP_PASS=change-me
# CONTACT_TO_EMAIL=admin@example.com

GF_SECURITY_ADMIN_PASSWORD=${grafana_pass}
OTEL_ENABLED=true
PROMETHEUS_ENABLED=true
SWAGGER_ENABLED=false
ENV_EOF

  chmod 600 "$ENV_FILE"
  ok ".env created at $ENV_FILE"
}

wait_for_postgres() {
  info "Waiting for PostgreSQL..."
  local elapsed=0
  until docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" exec -T postgres pg_isready -U smeuser -d smecertdb >/dev/null 2>&1; do
    sleep 3
    elapsed=$((elapsed + 3))
    [[ "$elapsed" -lt 90 ]] || fail "PostgreSQL did not become ready. Check: docker logs sme-cert-postgres"
  done
  ok "PostgreSQL is ready"
}

wait_for_api() {
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

start_application_stack() {
  banner "Phase 10/10 — Application stack"
  cd "$COMPOSE_DIR"
  info "Building and starting app stack..."
  docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" up -d --build

  wait_for_postgres

  info "Applying Prisma schema..."
  docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" exec -T api \
    npx prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss || \
    warn "Prisma db push failed. Check API logs and database connectivity."

  info "Seeding demo data..."
  if docker compose --env-file "$ENV_FILE" -f "$APP_COMPOSE" exec -T api \
      npx ts-node --transpile-only --compiler-options '{"module":"commonjs"}' prisma/seed.ts; then
    touch "$APP_DIR/.data-seeded"
    ok "Demo data seeded"
  else
    warn "Seed failed. Demo login accounts may be unavailable."
  fi

  wait_for_api
}

configure_firewall() {
  [[ "$SKIP_FIREWALL" == false ]] || { warn "Skipping firewall configuration as requested."; return 0; }
  banner "Firewall"
  if command -v firewall-cmd >/dev/null 2>&1 && sudo firewall-cmd --state >/dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-port=80/tcp >/dev/null 2>&1 || true
    sudo firewall-cmd --permanent --add-port=443/tcp >/dev/null 2>&1 || true
    sudo firewall-cmd --reload >/dev/null 2>&1 || true
    ok "firewalld ports 80/443 opened"
  elif command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -qi active; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    ok "ufw ports 80/443 allowed"
  else
    warn "No active firewalld/ufw detected. Configure cloud firewall/security-list rules for ports 80 and 443."
  fi
}

print_summary() {
  local host app_url grafana_pass
  host="$(detect_public_host)"
  app_url="$(url_from_host "$host")"
  grafana_pass="$(grep '^GF_SECURITY_ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2- || true)"

  banner "Fresh start complete"
  echo -e "${GREEN}${BOLD}Access:${NC}"
  echo "  Web UI:            ${app_url}"
  echo "  API:               ${app_url}/api"
  echo "  API health:        ${app_url}/api/health"
  echo "  Blockchain status: ${app_url}/api/health/blockchain"
  echo "  Grafana:           http://${host#http://}:3001  (admin / ${grafana_pass})"
  echo ""
  echo -e "${GREEN}${BOLD}Demo credentials:${NC}"
  echo "  admin@platform.local    Admin123!"
  echo "  issuer@msmeda.gov.eg    Demo123!"
  echo "  sme@example.com         Demo123!"
  echo "  verifier@auditor.com    Demo123!"
  echo ""
  echo -e "${CYAN}${BOLD}Useful commands:${NC}"
  echo "  Restart after reboot: bash $SCRIPT_DIR/restart_application.sh"
  echo "  App logs:             docker compose --env-file $ENV_FILE -f $APP_COMPOSE logs -f"
  echo "  API logs:             docker logs -f sme-cert-api"
  echo "  Fabric status:        docker compose -f $FABRIC_COMPOSE ps"
  echo ""
  echo -e "${YELLOW}${BOLD}Remember:${NC} open ports 80/443 in your cloud firewall/security list if accessing remotely."
}

main() {
  banner "SME Certificate Trust Platform — Fresh Linux Start"
  require_not_root
  require_project_files
  load_os_release
  local pm; pm="$(detect_package_manager)"

  install_base_packages "$pm"
  install_docker "$pm"
  install_go
  install_node_yarn "$pm"
  install_fabric_binaries
  pull_fabric_images
  sanitize_project_files
  confirm_reset_if_requested
  bootstrap_fabric
  setup_environment_file
  start_application_stack
  configure_firewall
  print_summary
}

main "$@"
