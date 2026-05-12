# SME Certificate Trust Platform — AI Session Context Summary

Use this file at the beginning of a new AI/dev session to avoid re-discovering the whole repository.

## 1. Product purpose

The platform is an enterprise blockchain document/certificate verification system for Egyptian SMEs. It supports:

- Issuer authorities creating templates and issuing certificates.
- SME holders viewing/sharing credentials.
- Public/verifier users validating certificate authenticity by ID, QR, or file hash.
- Hyperledger Fabric anchoring for immutable certificate metadata.
- PostgreSQL for application metadata.
- IPFS for off-chain content storage.
- Nginx reverse proxy, Prometheus/Grafana observability, and Docker Compose orchestration.

## 2. Official startup and runtime

Primary startup script:

```bash
bash scripts/start_all.sh
```

What it does:

1. Starts Fabric network from `blockchain/network/docker/docker-compose-fabric.yaml`.
2. Ensures channel/chaincode/profiles/wallets exist.
3. Starts app stack from `infra/compose/compose.yaml` with root `.env`.
4. Runs Prisma migrations and `prisma db push`.
5. Seeds demo data.

Important access URLs:

- Web: `http://localhost`
- API: `http://localhost/api`
- API health: `http://localhost/api/health`
- Blockchain health: `http://localhost/api/health/blockchain`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

Demo users:

- `admin@platform.local` / `Admin123!` — `PLATFORM_ADMIN`
- `issuer@msmeda.gov.eg` / `Demo123!` — `ISSUER_ADMIN`
- `sme@example.com` / `Demo123!` — `SME_USER`
- `verifier@auditor.com` / `Demo123!` — `VERIFIER_USER`

## 3. Monorepo structure

```text
apps/api/       NestJS backend API
apps/web/       React + Vite + Tailwind frontend
blockchain/     Hyperledger Fabric network + Go chaincode
infra/compose/  Docker Compose application stack
infra/nginx/    Nginx reverse proxy config
scripts/        Startup/restart/install/deployment helpers
docs/           Architecture and thesis documentation
```

## 4. Backend API structure

Backend entry points:

- `apps/api/src/main.ts` — Nest bootstrap, global prefix `/api`, URI versioning, CORS, Helmet, validation pipe, Swagger.
- `apps/api/src/app.module.ts` — Config validation, throttling, Prisma, Fabric, Email, and feature modules.
- `apps/api/src/health.controller.ts` — version-neutral `/api/health` and blockchain/block endpoints.

Core common services:

- `common/prisma/prisma.service.ts` — Prisma connection lifecycle.
- `common/fabric/fabric.service.ts` — Fabric Gateway SDK integration, chaincode submit/evaluate helpers, block height/status, tx id capture.
- `common/email/email.service.ts` — SMTP email helper, welcome/reset/contact notifications.

### Backend modules and key routes

#### Auth — `apps/api/src/modules/auth/`

Files:

- `auth.controller.ts`
- `auth.service.ts`
- `jwt.strategy.ts`
- `auth.module.ts`

Routes:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/logout` — JWT required
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

Notes:

- Uses `bcryptjs` to avoid Alpine native bcrypt crashes.
- Login returns both camelCase and snake_case token fields.
- User status must be `ACTIVE` to login.
- Refresh token must match a live DB session.

#### Certificates — `apps/api/src/modules/certificates/`

Files:

- `certificates.controller.ts`
- `certificates.service.ts`

Routes:

- `POST /api/v1/certificates` — issue certificate, issuer/admin roles required
- `GET /api/v1/certificates/stats` — JWT required
- `GET /api/v1/certificates/recent` — JWT required
- `GET /api/v1/certificates/holder` — JWT required
- `GET /api/v1/certificates/verify-by-hash/:hash` — public verification
- `GET /api/v1/certificates/:id` — public metadata lookup
- `GET /api/v1/certificates/:id/verify` — public verification
- `POST /api/v1/certificates/:id/revoke` — issuer admin/platform admin required

Important behavior:

- Resolves template by DB id or business `templateId`.
- Auto-publishes templates on-chain before issuance if needed.
- Issues DB record first, then best-effort Fabric transaction.
- On Fabric success, stores `txId` back into Postgres.
- Verifies by DB id/cert id/hash and records `Verification` rows.
- Validates SHA-256 hash format.
- Revocation reason is normalized to chaincode-supported reason codes.

#### Templates — `apps/api/src/modules/templates/`

Routes:

- `GET /api/v1/templates` — JWT required, scoped by org unless platform/consortium admin
- `GET /api/v1/templates/:id`
- `POST /api/v1/templates` — issuer admin/platform admin
- `POST /api/v1/templates/:id/publish` — issuer roles/admin

Notes:

- Template versions are semantic, currently `1.0.0`.
- `requiredClaims` come from JSON schema `required` array.
- Publishing is best-effort Fabric registration.

#### Users — `apps/api/src/modules/users/`

Routes:

- `GET /api/v1/users` — admin only
- `GET /api/v1/users/:id` — self or admin
- `PATCH /api/v1/users/:id` — self or admin; safe fields only

#### Organizations — `apps/api/src/modules/organizations/`

Routes:

- `POST /api/v1/organizations/register` — public org registration
- `GET /api/v1/organizations/pending` — platform/consortium admin
- `GET /api/v1/organizations` — platform/consortium admin
- `PATCH /api/v1/organizations/:id/approve` — platform/consortium admin
- `PATCH /api/v1/organizations/:id/reject` — platform/consortium admin

#### Storage — `apps/api/src/modules/storage/`

Routes:

- `POST /api/v1/storage/ipfs` — JWT required
- `GET /api/v1/storage/ipfs/:cid` — JWT required

Notes:

- Uses direct IPFS HTTP API (`/api/v0/add`, `/api/v0/cat`) instead of `ipfs-http-client` dynamic import.
- Payload capped in controller.

#### Metrics — `apps/api/src/modules/metrics/`

Routes:

- `GET /api/v1/metrics/dashboard` — JWT required
- `GET /api/v1/metrics/issuance` — JWT required
- `GET /api/v1/metrics/verification` — JWT required

#### Wallet — `apps/api/src/modules/wallet/`

Routes:

- `GET /api/v1/wallet` — JWT required
- `POST /api/v1/wallet/rotate-keys` — JWT required

#### Audit — `apps/api/src/modules/audit/`

Routes:

- `GET /api/v1/audit` — JWT required; full access for `PLATFORM_ADMIN`, `CONSORTIUM_ADMIN`, `AUDITOR_USER`; otherwise self-scoped.

#### Contact — `apps/api/src/modules/contact/`

Route:

- `POST /api/v1/contact`

## 5. Prisma data model

Schema: `apps/api/prisma/schema.prisma`

Important models:

- `User` — auth/profile/role/session relationships.
- `Organization` — tenant/issuer metadata.
- `Session` — access/refresh token sessions.
- `Template` — certificate template metadata and JSON schema.
- `Certificate` — application certificate metadata mirrored from Fabric.
- `AccessGrant` — holder sharing tokens.
- `Verification` — verification event/evidence records.
- `AuditLog` — audit trail.
- `SystemConfig`, `EncryptionKey`, `DailyMetrics`, `ContactSubmission`, `PasswordResetToken`.

Important enums:

- `UserRole`: `PLATFORM_ADMIN`, `CONSORTIUM_ADMIN`, `ISSUER_ADMIN`, `ISSUER_OPERATOR`, `SME_USER`, `VERIFIER_USER`, `AUDITOR_USER`.
- `CertificateStatus`: `DRAFT`, `PENDING_SIGNATURE`, `ISSUED`, `REVOKED`, `EXPIRED`.
- `VerificationStatus`: `VALID`, `REVOKED`, `EXPIRED`, `INVALID_SIGNATURE`, `TAMPERED`, `UNKNOWN_ISSUER`.

Seed file: `apps/api/prisma/seed.ts`.

## 6. Blockchain structure

Network:

- `blockchain/network/docker/docker-compose-fabric.yaml` — Fabric containers.
- `blockchain/network/config/` — Fabric config (`configtx.yaml`, `core.yaml`, `crypto-config.yaml`).
- `blockchain/network/scripts/` — crypto/artifacts/channel/chaincode/profile/wallet scripts.

Chaincode:

- Root: `blockchain/chaincode/certificate_contract/`
- Contract: `contract/contract.go`
- Access control: `internal/access/access.go`
- Models: `internal/models/models.go`
- Validators: `internal/validators/validators.go`
- Tests: `contract/contract_test.go`

Important chaincode functions:

- `InitLedger`
- `RegisterIssuer`
- `GetIssuer`
- `CreateTemplate`
- `GetTemplate`
- `IssueCertificate`
- `GetCertificateRecord`
- `VerifyCertificateRecord`
- `RevokeCertificate`
- `ListCertificatesByHolder`
- `ListCertificatesByIssuer`
- `GetCertificateHistory`

Current deployed local chaincode after hardening:

- Name: `certificate_contract`
- Channel: `certificates`
- Version: `1.2`
- Sequence: `3`
- Mode: CCaaS container `cc-certificate_contract`

Key blockchain notes:

- `InitLedger` creates issuer `org1`.
- Cryptogen admin certs do not have custom attributes, so local chaincode access maps admin OU to admin/issuer roles.
- Validation avoids nondeterministic `time.Now()` checks.
- `GetCertificateRecord` returns JSON string to avoid Fabric contract-api optional field schema issues.
- Public verification uses `VerifyCertificateRecord`, which bypasses strict read ACL but still verifies issuer/status/hash.

## 7. Frontend structure

Entry:

- `apps/web/src/main.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/index.css`

Routing:

- Public layout: `/`, `/login`, `/register`, `/reset-password`, `/verify`, `/verify/:certId`, `/why-blockchain`, `/how-it-works`, `/docs`, `/pricing`, `/deployment`, `/about`, `/contact`, `/onboarding`, `/blockchain`
- Issuer: `/issuer`, `/issuer/templates`, `/issuer/issue`, `/issuer/bulk-issue`, `/issuer/revoke`
- Holder: `/holder`, `/holder/certificate/:certId`, `/holder/share`, `/holder/wallet`
- Verifier: `/verifier`, `/verifier/history`

Important frontend files:

- API client: `apps/web/src/services/api/client.ts`
- Auth API: `apps/web/src/services/api/auth.ts`
- Certificate/template/blockchain API: `apps/web/src/services/api/certificates.ts`
- Metrics API: `apps/web/src/services/api/metrics.ts`
- Auth store: `apps/web/src/state/auth.ts`
- SHA-256 utility: `apps/web/src/lib/hash.ts`
- SHA-256 test: `apps/web/src/lib/hash.spec.ts`

Major UI components added/upgraded:

- `components/shared/TrustCommandCenter.tsx` — cinematic landing hero / blockchain command center.
- `components/shared/VerificationIntelligencePanel.tsx` — trust explanation overlay on verify page.
- `components/shared/BlockchainVerificationVisualizer.tsx` — immersive file verification animation.

Main public pages:

- `pages/public/LandingPage.tsx`
- `pages/public/VerifyPage.tsx`
- `pages/public/BlockchainExplorerPage.tsx`
- `pages/public/OnboardingPage.tsx`

## 8. Deployment and infrastructure notes

Main compose file: `infra/compose/compose.yaml`

Services:

- `postgres`
- `ipfs`
- `api`
- `web`
- `nginx`
- `prometheus`
- `grafana`
- `otel-collector`

Security hardening:

- Internal service ports bind to `127.0.0.1`.
- Nginx is the public ingress on `80/443`.
- Nginx config: `infra/nginx/conf/default.conf`
- Added CSP and Permissions-Policy headers.
- Verification endpoints have dedicated Nginx rate limiting.

Docker notes:

- `.dockerignore` is critical to avoid disk exhaustion.
- Docker build cache can grow quickly on a small 30GB VM.
- If disk is tight, run:

```bash
docker builder prune -f
```

## 9. Current validation commands

Use these for fast sanity checks:

```bash
yarn typecheck
yarn build
yarn workspace @sme-cert/web test
yarn workspace @sme-cert/api test:e2e
cd blockchain/chaincode/certificate_contract && go test ./...
yarn workspace @sme-cert/web test:e2e
```

Runtime checks:

```bash
curl -sf http://localhost/api/health | jq .
curl -sf http://localhost/api/health/blockchain | jq .
cd infra/compose && docker compose --env-file ../../.env ps
```

Login smoke:

```bash
AUTH=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"issuer@msmeda.gov.eg","password":"Demo123!"}' | jq -r '.accessToken')

curl -sf -H "Authorization: Bearer $AUTH" \
  http://localhost/api/v1/certificates/stats | jq .
```

End-to-end issue/verify smoke:

```bash
AUTH=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"issuer@msmeda.gov.eg","password":"Demo123!"}' | jq -r '.accessToken')

HASH=$(printf 'qa-proof' | sha256sum | awk '{print $1}')

TEMPLATE=$(curl -s -X POST http://localhost/api/v1/templates \
  -H "Authorization: Bearer $AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"name":"QA Template","description":"QA","schema":{"type":"object","required":["program"]}}')

TID=$(echo "$TEMPLATE" | jq -r '.id')

CERT=$(curl -s -X POST http://localhost/api/v1/certificates \
  -H "Authorization: Bearer $AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"templateId\":\"$TID\",\"holderEmail\":\"qa@example.com\",\"holderName\":\"QA Holder\",\"documentHash\":\"$HASH\",\"documentName\":\"qa.txt\",\"documentSize\":8,\"data\":{\"program\":\"QA\"}}")

CID=$(echo "$CERT" | jq -r '.certificateId')

curl -s http://localhost/api/v1/certificates/$CID/verify | jq .
```

## 10. Known risks / next recommended improvements

- Root filesystem is small and has reached high usage during validation; expand disk or move Docker data before production demos.
- Frontend has a large Vite chunk; use route-level `React.lazy` and dynamic imports for QR/visualizer pages.
- Automated tests are still not exhaustive; add service-level NestJS unit tests and Playwright journeys for login, issuer issuance, holder dashboard, verifier verification, revocation, and mobile layouts.
- Production Fabric should use Fabric CA identities with explicit attributes instead of cryptogen-admin fallback.
- Rotate demo/generated secrets and use a managed secret store before real deployment.
- Enable TLS through `scripts/setup_https.sh` or equivalent.
