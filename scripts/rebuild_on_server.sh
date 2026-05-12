#!/bin/bash
#
# SME Certificate Trust Platform - Rebuild Application Services
# Run this on the server after deploying updated source files
#
# Usage: ./scripts/rebuild_on_server.sh
#

set -e

PROJECT_ROOT="/home/opc/bc_applicaition"
COMPOSE_DIR="$PROJECT_ROOT/infra/compose"
APP_DIR="$PROJECT_ROOT"
ENV_FILE="$APP_DIR/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "======================================================================"
echo " Rebuilding Application Services"
echo "======================================================================"
echo ""

# ==========================================================================
# Step 1: Stop existing application containers (keep Fabric running)
# ==========================================================================
echo_info "Step 1: Stopping application containers..."

cd "$COMPOSE_DIR"

# Stop only the app services, not Fabric network
docker compose --env-file "$ENV_FILE" stop api web nginx prometheus grafana otel-collector 2>/dev/null || true
docker compose --env-file "$ENV_FILE" rm -f api web 2>/dev/null || true

# Remove old images to force fresh build
docker rmi compose-api compose-web 2>/dev/null || true

echo_info "Old containers and images removed"

# ==========================================================================
# Step 2: Verify source files are updated
# ==========================================================================
echo_info "Step 2: Verifying source files..."

# Check critical files exist
MISSING=0
for f in \
    "$PROJECT_ROOT/apps/web/tsconfig.json" \
    "$PROJECT_ROOT/apps/web/src/main.tsx" \
    "$PROJECT_ROOT/apps/api/src/health.controller.ts" \
    "$PROJECT_ROOT/apps/api/src/modules/auth/auth.module.ts" \
    "$PROJECT_ROOT/apps/api/src/modules/certificates/certificates.module.ts" \
    "$PROJECT_ROOT/infra/compose/prometheus.yml" \
    "$PROJECT_ROOT/infra/nginx/conf/default.conf"
do
    if [ ! -f "$f" ]; then
        echo_error "Missing: $f"
        MISSING=1
    fi
done

if [ "$MISSING" -eq 1 ]; then
    echo_error "Some files are missing! Run deploy_to_server.ps1 first."
    exit 1
fi

# Verify key fixes are applied
if grep -q "template\.name," "$PROJECT_ROOT/apps/api/src/modules/templates/templates.service.ts" 2>/dev/null; then
    echo_error "templates.service.ts still has 'template.name' - old version!"
    exit 1
fi

if grep -q "publicKey:" "$PROJECT_ROOT/apps/api/src/modules/wallet/wallet.service.ts" 2>/dev/null; then
    echo_error "wallet.service.ts still has 'publicKey' - old version!"
    exit 1
fi

echo_info "Source files verified"

# ==========================================================================
# Step 3: Rebuild Docker images
# ==========================================================================
echo_info "Step 3: Rebuilding Docker images (this may take a few minutes)..."

cd "$COMPOSE_DIR"

# Load env vars from the canonical root environment file. Compose env_file is
# not used for ${VAR} interpolation, so we also pass --env-file explicitly.
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Build with no cache to ensure fresh build
docker compose --env-file "$ENV_FILE" build --no-cache api web

echo_info "Docker images rebuilt successfully"

# ==========================================================================
# Step 4: Start all services
# ==========================================================================
echo_info "Step 4: Starting all application services..."

docker compose --env-file "$ENV_FILE" up -d

echo_info "Waiting for services to start..."
sleep 15

# ==========================================================================
# Step 5: Run database migrations
# ==========================================================================
echo_info "Step 5: Running database migrations..."

# Wait for PostgreSQL
echo_info "Waiting for PostgreSQL..."
until docker exec sme-cert-postgres pg_isready -U smeuser -d smecertdb > /dev/null 2>&1; do
    sleep 2
done

# Wait for API container to be running
echo_info "Waiting for API container..."
for i in $(seq 1 30); do
    if docker exec sme-cert-api ls /app/prisma/schema.prisma > /dev/null 2>&1; then
        break
    fi
    sleep 2
done

# Run migrations
docker exec sme-cert-api npx prisma migrate deploy 2>&1 || echo_warn "Migration may have failed - check logs"
docker exec sme-cert-api npx prisma db push --schema=/app/prisma/schema.prisma 2>&1 || echo_warn "Prisma db push may have failed - check logs"
docker exec sme-cert-api npx prisma generate 2>&1 || true

echo_info "Database migrations complete"

# ==========================================================================
# Step 6: Health check
# ==========================================================================
echo_info "Step 6: Running health checks..."

sleep 5

# Check API
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo_info "API health check: PASSED"
else
    echo_warn "API health check: FAILED (may still be starting)"
fi

# Check Web
if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    echo_info "Web health check: PASSED"
else
    echo_warn "Web health check: FAILED (may still be starting)"
fi

# ==========================================================================
# Summary
# ==========================================================================
echo ""
echo "======================================================================"
echo_info " Rebuild Complete!"
echo "======================================================================"
echo ""

docker compose --env-file "$ENV_FILE" ps

echo ""
echo "If any service failed, check logs with:"
echo "  docker compose -f $COMPOSE_DIR/compose.yaml logs api"
echo "  docker compose -f $COMPOSE_DIR/compose.yaml logs web"
echo ""
echo "Access points:"
echo "  API:     http://localhost:3000/api/health"
echo "  Web:     http://localhost:5173"
echo "  Nginx:   http://localhost:80"
echo "  Grafana: http://localhost:3001 (admin/admin)"
echo ""
