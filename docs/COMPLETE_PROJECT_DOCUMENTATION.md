# SME Certificate Trust Platform — Complete Project Documentation

**Project purpose:** a production-oriented permissioned blockchain platform for issuing, storing, verifying, and revoking digital certificates for Egyptian SMEs.

This document is the current operational reference for the repository. It reflects the actual codebase layout, Docker Compose files, Hyperledger Fabric network, NestJS API, React frontend, database schema, and deployment scripts in this project.

---

## 1. Quick Start

### Fresh Linux deployment

Run from the repository root as a normal Linux user with `sudo` access:

```bash
bash scripts/fresh_start_linux.sh
```

The script installs Linux packages, Docker, Node.js 20, Yarn 4, Go, Hyperledger Fabric binaries, Fabric Docker images, starts the Fabric network, deploys chaincode, creates wallets and connection profiles, generates `.env`, builds the application stack, applies the Prisma schema, seeds demo data, and runs health checks.

### Restart an existing deployment

After a VM reboot or manual stop:

```bash
bash scripts/restart_application.sh
```

Use this script when data already exists. It does **not** regenerate crypto material, redeploy chaincode, recreate `.env`, or wipe volumes.

### Main access points

| Service | URL on the server |
|---|---|
| Public web UI | `http://<server-ip>/` |
| API through Nginx | `http://<server-ip>/api` |
| API health | `http://<server-ip>/api/health` |
| Blockchain status | `http://<server-ip>/api/health/blockchain` |
| Prometheus | `http://localhost:9090` by default |
| Grafana | `http://localhost:3001` by default |

Only ports **80** and **443** should be public. Internal service ports are bound to localhost or Docker networks where possible.

---

## 2. What the Platform Does

The platform manages the full certificate lifecycle:

1. **Issuer onboarding** — authorities and training providers register or are seeded as organizations.
2. **Template creation** — issuers create certificate templates with JSON-schema-like claims.
3. **Certificate issuance** — issuer creates a certificate for an SME holder.
4. **Hashing and metadata persistence** — the API computes hashes and stores application metadata in PostgreSQL.
5. **Blockchain anchoring** — core certificate facts are written to Hyperledger Fabric chaincode.
6. **Verification** — public or authenticated verifiers check certificate ID or document hash.
7. **Revocation** — issuer/admin revokes certificates, and revocation is reflected in both PostgreSQL and Fabric when available.
8. **Audit and monitoring** — activity is logged in audit tables and exposed through metrics endpoints and Prometheus/Grafana.

---

## 3. User Roles and Portals

### Application roles

| Role | Purpose |
|---|---|
| `PLATFORM_ADMIN` | Full platform administration and global visibility. |
| `CONSORTIUM_ADMIN` | Consortium-level administration for Fabric/governance operations. |
| `ISSUER_ADMIN` | Creates templates, issues certificates, revokes certificates for own organization. |
| `ISSUER_OPERATOR` | Issues certificates under an issuer organization. |
| `SME_USER` | Holder portal user who views and shares certificates. |
| `VERIFIER_USER` | Verifier portal user who validates certificates and views verification history. |
| `AUDITOR_USER` | Audit-focused role reserved in the schema. |

### Web portals and routes

| Portal | Main routes | Main capabilities |
|---|---|---|
| Public | `/`, `/verify`, `/verify/:certId`, `/docs`, `/pricing`, `/deployment`, `/about`, `/contact`, `/blockchain` | Landing pages, public verification, blockchain explorer, contact form. |
| Auth | `/login`, `/register`, `/reset-password` | Sign-in, self-registration, password reset. |
| Issuer | `/issuer`, `/issuer/templates`, `/issuer/issue`, `/issuer/bulk-issue`, `/issuer/revoke` | Dashboard, template builder, certificate issuance, bulk issue UI, revocation. |
| Holder | `/holder`, `/holder/certificate/:certId`, `/holder/share`, `/holder/wallet` | Certificate wallet, details, sharing center, wallet settings. |
| Verifier | `/verifier`, `/verifier/history` | Verification dashboard and history. |

---

## 4. Repository Structure

```text
SME-Cert-Project/
├── apps/
│   ├── api/                         # NestJS backend API
│   │   ├── prisma/schema.prisma     # PostgreSQL schema
│   │   ├── prisma/seed.ts           # Demo organizations and users
│   │   └── src/
│   │       ├── common/              # Prisma, Fabric, email services
│   │       ├── modules/             # auth, certificates, templates, orgs, etc.
│   │       ├── health.controller.ts
│   │       └── main.ts
│   └── web/                         # React/Vite frontend
│       ├── src/pages/               # public, auth, issuer, holder, verifier pages
│       ├── src/layouts/
│       ├── src/services/
│       └── Dockerfile
├── blockchain/
│   ├── chaincode/certificate_contract/ # Go smart contract
│   └── network/
│       ├── config/                  # configtx, crypto-config, core config
│       ├── docker/                  # Fabric Docker Compose files
│       └── scripts/                 # Fabric lifecycle automation
├── infra/
│   ├── compose/compose.yaml         # App stack: DB, IPFS, API, web, Nginx, monitoring
│   ├── nginx/conf/                  # Reverse proxy configuration
│   └── storage/ipfs/                # IPFS container init config
├── scripts/
│   ├── fresh_start_linux.sh         # Canonical fresh Linux installer
│   ├── restart_application.sh       # Canonical safe restart script
│   ├── install.sh                   # Existing installer retained for compatibility
│   ├── restart.sh                   # Existing restart script retained for compatibility
│   ├── start_all.sh
│   ├── stop_all.sh
│   └── setup_https.sh
├── docs/
│   └── COMPLETE_PROJECT_DOCUMENTATION.md
├── .env.example
├── package.json
└── README.md
```

Generated runtime artifacts are intentionally not source-of-truth code:

```text
.env                                      # generated secrets and runtime config
wallets/org*/admin.id                    # Fabric SDK wallet identities
blockchain/network/crypto-config/        # Fabric crypto material
blockchain/network/channel-artifacts/     # Fabric channel blocks
blockchain/network/connection-profiles/   # Fabric SDK connection profiles
Docker volumes                           # PostgreSQL, IPFS, Fabric ledger, Grafana, Prometheus
```

---

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, React Query, Zustand, i18next |
| Backend | Node.js 20, NestJS 10, TypeScript, Prisma ORM, JWT auth, Winston logging |
| Database | PostgreSQL 16 |
| Blockchain | Hyperledger Fabric 2.5.x, 4 orgs, 3 Raft orderers, 8 peers, CouchDB state DB |
| Chaincode | Go smart contract using Fabric Contract API |
| Off-chain storage | IPFS Kubo container |
| Reverse proxy | Nginx |
| Observability | Prometheus, Grafana, OpenTelemetry collector |
| Packaging | Docker and Docker Compose v2 |
| Workspace tooling | Yarn 4 via Corepack |

---

## 6. Runtime Architecture

```text
                 Internet / Browser
                         │
                         ▼
              ┌─────────────────────┐
              │ Nginx reverse proxy  │  ports 80/443
              └──────────┬──────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
 ┌─────────────────┐           ┌─────────────────┐
 │ React web app   │           │ NestJS API       │
 │ container: web  │           │ container: api   │
 └─────────────────┘           └───────┬─────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌──────────────┐               ┌──────────────┐                ┌──────────────┐
│ PostgreSQL   │               │ IPFS Kubo    │                │ Fabric SDK   │
│ app metadata │               │ off-chain    │                │ gateway      │
└──────────────┘               └──────────────┘                └──────┬───────┘
                                                                        │
                                                                        ▼
                                            ┌─────────────────────────────────────┐
                                            │ Hyperledger Fabric network           │
                                            │ 3 orderers, 8 peers, 8 CouchDB nodes │
                                            │ chaincode: certificate_contract      │
                                            └─────────────────────────────────────┘
```

The application Docker Compose stack joins both `sme_cert_network` and `fabric_network` so the API container can reach Fabric peers/orderers using the generated connection profile.

---

## 7. Docker Services

### Application stack (`infra/compose/compose.yaml`)

| Service | Container | Purpose | Host binding |
|---|---|---|---|
| `postgres` | `sme-cert-postgres` | PostgreSQL app DB | `127.0.0.1:5432` |
| `ipfs` | `sme-cert-ipfs` | IPFS API/gateway/swarm | `127.0.0.1:5001`, `8080`, `4001` |
| `api` | `sme-cert-api` | NestJS backend | `127.0.0.1:3000` |
| `web` | `sme-cert-web` | React static build served by Nginx | `127.0.0.1:5173` |
| `nginx` | `sme-cert-nginx` | Public reverse proxy | `80`, `443` |
| `prometheus` | `sme-cert-prometheus` | Metrics scraping | `127.0.0.1:9090` |
| `grafana` | `sme-cert-grafana` | Metrics dashboards | `127.0.0.1:3001` |
| `otel-collector` | `sme-cert-otel` | OpenTelemetry collector | `127.0.0.1:4317/4318/8888/8889` |

### Fabric stack (`blockchain/network/docker/docker-compose-fabric.yaml`)

| Component | Count | Notes |
|---|---:|---|
| Raft orderers | 3 | `orderer.example.com`, `orderer2.example.com`, `orderer3.example.com` |
| Peers | 8 | 2 peers per organization |
| CouchDB state DBs | 8 | one CouchDB per peer |
| Chaincode container | 1 when CCaaS is used | `cc-certificate_contract`, created by `deploy_chaincode_ccaas.sh` |

---

## 8. Hyperledger Fabric Network

### Organizations

| Org | Business name | MSP ID | Peer0 | Peer1 |
|---|---|---|---:|---:|
| Org1 | Ministry of Trade and Industry | `Org1MSP` | `7051` | `8051` |
| Org2 | MSMEDA | `Org2MSP` | `9051` | `10051` |
| Org3 | Training Providers | `Org3MSP` | `11051` | `12051` |
| Org4 | External Auditors | `Org4MSP` | `13051` | `14051` |

### Orderers

| Orderer | gRPC | Admin | Ops health |
|---|---:|---:|---:|
| `orderer.example.com` | `7050` | `7053` | `9443` |
| `orderer2.example.com` | `8050` | `8053` | `9444` |
| `orderer3.example.com` | `9050` | `9053` | `9445` |

### Channel and chaincode

| Item | Value |
|---|---|
| Channel | `certificates` |
| Chaincode | `certificate_contract` |
| Default version | `1.0` |
| Default sequence | `1` |
| Preferred deployment mode | Chaincode-as-a-Service (`deploy_chaincode_ccaas.sh`) |

### Chaincode functions

| Function | Purpose |
|---|---|
| `InitLedger` | Bootstraps default issuer data. |
| `RegisterIssuer` | Registers a new issuer organization on-chain. |
| `GetIssuer` | Reads issuer data. |
| `CreateTemplate` | Registers a certificate template on-chain. |
| `GetTemplate` | Reads a template by ID/version. |
| `IssueCertificate` | Anchors certificate metadata and hash on-chain. |
| `GetCertificateRecord` | Reads certificate metadata from Fabric state. |
| `VerifyCertificateRecord` | Checks status, issuer, expiration, revocation, and optional hash. |
| `RevokeCertificate` | Marks a certificate revoked and emits a revocation event. |
| `ListCertificatesByHolder` | CouchDB rich query by holder ID. |
| `ListCertificatesByIssuer` | CouchDB rich query by issuer organization. |
| `GetCertificateHistory` | Reads immutable transaction history for one certificate key. |

---

## 9. Backend API

The API uses a global prefix of `/api` and URI versioning. Most feature routes are under `/api/v1/...`; health routes are version-neutral.

### Important endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | API health check. |
| `GET` | `/api/health/blockchain` | Public | Fabric connection status and block height if available. |
| `GET` | `/api/health/blockchain/blocks?count=5` | Public | Recent blockchain blocks. |
| `GET` | `/api/health/blockchain/blocks/:blockNumber` | Public | Specific block summary. |
| `POST` | `/api/v1/auth/login` | Public | Login and return JWT/refresh token. |
| `POST` | `/api/v1/auth/register` | Public | Self-register allowed roles. |
| `POST` | `/api/v1/auth/logout` | JWT | Logout current session. |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh access token. |
| `POST` | `/api/v1/auth/forgot-password` | Public | Request reset email. |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset password using token. |
| `POST` | `/api/v1/certificates` | JWT issuer/admin | Issue certificate. |
| `GET` | `/api/v1/certificates/stats` | JWT | Issuer/platform stats. |
| `GET` | `/api/v1/certificates/recent` | JWT | Recent certificates. |
| `GET` | `/api/v1/certificates/holder` | JWT | Holder's certificates. |
| `GET` | `/api/v1/certificates/:id` | Public | Certificate details by DB ID or `certId`. |
| `GET` | `/api/v1/certificates/:id/verify` | Public | Verify certificate ID. |
| `GET` | `/api/v1/certificates/verify-by-hash/:hash` | Public | Verify by SHA-256 document hash. |
| `POST` | `/api/v1/certificates/:id/revoke` | JWT issuer admin/admin | Revoke certificate. |
| `GET` | `/api/v1/templates` | JWT | List templates scoped by role/org. |
| `GET` | `/api/v1/templates/:id` | JWT | Read template. |
| `POST` | `/api/v1/templates` | JWT issuer admin/admin | Create template. |
| `POST` | `/api/v1/templates/:id/publish` | JWT issuer/admin | Publish template and try to register it on-chain. |
| `POST` | `/api/v1/organizations/register` | Public | Submit organization registration. |
| `GET` | `/api/v1/organizations/pending` | JWT admin | Pending organization registrations. |
| `GET` | `/api/v1/organizations` | JWT admin | All organizations. |
| `PATCH` | `/api/v1/organizations/:id/approve` | JWT admin | Approve organization. |
| `PATCH` | `/api/v1/organizations/:id/reject` | JWT admin | Reject organization. |
| `POST` | `/api/v1/storage/ipfs` | JWT | Store data in IPFS. |
| `GET` | `/api/v1/storage/ipfs/:cid` | JWT | Retrieve IPFS data. |
| `GET` | `/api/v1/wallet` | JWT | Wallet info. |
| `POST` | `/api/v1/wallet/rotate-keys` | JWT | Rotate encryption keys. |
| `GET` | `/api/v1/audit` | JWT | Audit logs, role scoped. |
| `GET` | `/api/v1/metrics/dashboard` | JWT | Dashboard metrics. |
| `GET` | `/api/v1/metrics/issuance` | JWT | Issuance metrics. |
| `GET` | `/api/v1/metrics/verification` | JWT | Verification metrics. |
| `POST` | `/api/v1/contact` | Public | Contact form submission. |

Swagger is available at `/api/docs` only when `SWAGGER_ENABLED=true`.

---

## 10. Database Model Summary

The Prisma schema defines the application state in PostgreSQL.

| Model | Purpose |
|---|---|
| `User` | User accounts, roles, status, organization link, locale. |
| `Organization` | Issuer/SME/auditor/government organizations and Fabric MSP mapping. |
| `Session` | JWT/refresh-token session records. |
| `Template` | Certificate templates, JSON schema, versioning, blockchain publication state. |
| `Certificate` | Certificate metadata, claims, hash, pointer, status, issuance/revocation details. |
| `AccessGrant` | Holder sharing/access grant records. |
| `Verification` | Verification attempts and evidence. |
| `AuditLog` | Security and business audit events. |
| `SystemConfig` | Runtime configuration entries. |
| `EncryptionKey` | Wrapped encryption key records. |
| `DailyMetrics` | Aggregated business metrics. |
| `ContactSubmission` | Contact form messages. |
| `PasswordResetToken` | Password reset token hashes. |

The database is synchronized during deployment with:

```bash
docker compose --env-file .env -f infra/compose/compose.yaml exec -T api \
  npx prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss
```

Demo data is seeded with:

```bash
docker compose --env-file .env -f infra/compose/compose.yaml exec -T api \
  npx ts-node --transpile-only --compiler-options '{"module":"commonjs"}' prisma/seed.ts
```

---

## 11. Environment Variables

The runtime stack reads the root `.env` file. The fresh-start script creates it automatically.

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | Yes | Password for PostgreSQL user `smeuser`. |
| `JWT_SECRET` | Yes | Secret used to sign JWTs. |
| `JWT_EXPIRES_IN` | No | Default access token lifetime, usually `1h`. |
| `MASTER_ENCRYPTION_KEY` | Yes | 64-character hex AES master key. |
| `FABRIC_CHANNEL_NAME` | No | Defaults to `certificates`. |
| `FABRIC_CHAINCODE_NAME` | No | Defaults to `certificate_contract`. |
| `FABRIC_CONNECTION_PROFILE_PATH` | No | API container path for org1 connection profile. |
| `FABRIC_WALLET_PATH` | No | API container path for org1 wallet. |
| `CORS_ORIGIN` | Yes for browser access | Allowed frontend origins. |
| `APP_URL` | Yes | Public URL used for QR links and reset emails. |
| `PLATFORM_NAME` | No | Display name. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional | Email transport. Leave unset to disable sending. Do not set empty values. |
| `CONTACT_TO_EMAIL` | Optional | Destination for contact form emails. |
| `GF_SECURITY_ADMIN_PASSWORD` | Yes | Grafana admin password. |
| `OTEL_ENABLED` | No | Enables tracing-related config. |
| `PROMETHEUS_ENABLED` | No | Enables metrics-related config. |
| `SWAGGER_ENABLED` | No | Enables `/api/docs` when `true`. |

Generate new secrets manually if needed:

```bash
openssl rand -base64 48 | tr -d '\n=/+'   # JWT_SECRET
openssl rand -hex 32                       # MASTER_ENCRYPTION_KEY
openssl rand -base64 24 | tr -d '\n=/+'   # POSTGRES_PASSWORD
```

---

## 12. Fresh Deployment Procedure

### Recommended VM size

| Resource | Minimum | Recommended |
|---|---:|---:|
| vCPU | 4 | 4–8 |
| RAM | 8 GB | 12–16 GB |
| Disk | 100 GB | 150+ GB SSD |
| OS | Oracle Linux 8/9, Ubuntu 22.04/24.04, Debian 12 | Oracle Linux 8/9 or Ubuntu 22.04 LTS |

### One command

```bash
bash scripts/fresh_start_linux.sh
```

Useful options:

```bash
bash scripts/fresh_start_linux.sh --public-host 203.0.113.10
bash scripts/fresh_start_linux.sh --public-host https://certs.example.com
bash scripts/fresh_start_linux.sh --skip-system-update
bash scripts/fresh_start_linux.sh --force-env
bash scripts/fresh_start_linux.sh --reset-data --yes
```

`--reset-data` is destructive: it removes Fabric ledger volumes, PostgreSQL data, IPFS data, generated crypto material, wallets, and sentinels.

### What the script does

1. Detects Linux distribution and validates `sudo` access.
2. Updates system packages unless skipped.
3. Installs base packages (`git`, `curl`, `wget`, `tar`, `unzip`, `jq`, `python3`, `openssl`, build tools, etc.).
4. Installs Docker Engine and Compose plugin.
5. Installs Go, Node.js 20, Yarn 4, and Fabric binaries.
6. Pulls Fabric Docker images.
7. Installs Yarn workspace dependencies.
8. Generates Fabric crypto material and channel artifacts.
9. Starts Fabric orderers, peers, and CouchDB containers.
10. Creates/joins the `certificates` channel.
11. Deploys `certificate_contract` chaincode, preferably as CCaaS.
12. Initializes the ledger if it has not already been initialized.
13. Generates Fabric connection profiles and admin wallets.
14. Generates `.env` if needed.
15. Builds and starts the application stack.
16. Applies Prisma schema and seeds demo data.
17. Opens OS firewall ports 80/443 when supported.
18. Prints service URLs, credentials, and useful commands.

---

## 13. Restart Procedure

Use restart when generated crypto, ledgers, database volumes, and `.env` already exist:

```bash
bash scripts/restart_application.sh
```

Options:

```bash
bash scripts/restart_application.sh --rebuild   # rebuild app images while starting
bash scripts/restart_application.sh --migrate   # also run Prisma db push
bash scripts/restart_application.sh --skip-health
```

Restart order:

1. Ensure Docker daemon is running.
2. Start Fabric containers.
3. Start the CCaaS chaincode container if it exists but is stopped.
4. Start PostgreSQL, IPFS, API, web, Nginx, Prometheus, Grafana, and OTel.
5. Optionally run migrations.
6. Wait for health endpoints and print a summary.

---

## 14. Demo Data

Seeded credentials:

| Email | Password | Role |
|---|---|---|
| `admin@platform.local` | `Admin123!` | `PLATFORM_ADMIN` |
| `issuer@msmeda.gov.eg` | `Demo123!` | `ISSUER_ADMIN` |
| `sme@example.com` | `Demo123!` | `SME_USER` |
| `verifier@auditor.com` | `Demo123!` | `VERIFIER_USER` |

Change these before exposing the platform publicly.

---

## 15. Operations

### Status

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker compose --env-file .env -f infra/compose/compose.yaml ps
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml ps
```

### Logs

```bash
docker logs -f sme-cert-api
docker logs -f sme-cert-nginx
docker logs -f sme-cert-postgres
docker logs -f sme-cert-ipfs
docker logs -f peer0.org1.example.com
docker logs -f orderer.example.com
docker compose --env-file .env -f infra/compose/compose.yaml logs -f
```

### Health checks

```bash
curl http://localhost/api/health
curl http://localhost/api/health/blockchain
curl http://localhost:3000/api/health
curl -sk https://localhost:9443/healthz
bash blockchain/network/scripts/fabric-health.sh smoke
```

### Stop services without deleting data

```bash
docker compose --env-file .env -f infra/compose/compose.yaml stop
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml stop
```

### Stop and remove application containers only

```bash
docker compose --env-file .env -f infra/compose/compose.yaml down
```

### Full destructive reset

Prefer the scripted reset:

```bash
bash scripts/fresh_start_linux.sh --reset-data --yes
```

Manual reset, if needed:

```bash
docker compose --env-file .env -f infra/compose/compose.yaml down -v
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml down -v
docker rm -f cc-certificate_contract 2>/dev/null || true
rm -rf blockchain/network/crypto-config \
       blockchain/network/channel-artifacts \
       blockchain/network/connection-profiles \
       wallets \
       .data-seeded \
       blockchain/network/.channel-created \
       blockchain/network/.chaincode-deployed
```

### Backups

Database backup:

```bash
mkdir -p backups
 docker exec sme-cert-postgres pg_dump -U smeuser smecertdb | gzip > "backups/smecertdb_$(date +%Y%m%d_%H%M%S).sql.gz"
```

Important data to preserve:

- PostgreSQL Docker volume.
- Fabric peer/orderer Docker volumes.
- `blockchain/network/crypto-config/`.
- `blockchain/network/channel-artifacts/`.
- `blockchain/network/connection-profiles/`.
- `wallets/`.
- `.env`.

---

## 16. HTTPS

For a domain pointing to the server and public ports 80/443 open:

```bash
bash scripts/setup_https.sh certs.example.com admin@example.com
```

Review the script output. It may ask you to mount `/etc/letsencrypt` into the Nginx service if the compose file does not already include that volume.

After enabling HTTPS, update `.env`:

```bash
APP_URL=https://certs.example.com
CORS_ORIGIN=https://certs.example.com
```

Then restart:

```bash
bash scripts/restart_application.sh
```

---

## 17. Security Notes

- Keep `.env`, wallets, and Fabric crypto material private.
- Do not commit generated secrets or Fabric identities.
- Keep Swagger disabled in production unless needed temporarily.
- Keep Prometheus, Grafana, PostgreSQL, IPFS, Fabric peer/orderer ports private.
- Open only ports 80 and 443 publicly.
- Rotate demo passwords immediately.
- Configure real SMTP credentials only with non-empty values; empty SMTP variables can fail validation.
- Use HTTPS for production and set `APP_URL`/`CORS_ORIGIN` to the HTTPS URL.
- Back up both PostgreSQL and Fabric materials; backing up only PostgreSQL is not enough for blockchain recovery.

---

## 18. Troubleshooting

### Docker permission denied

The installer adds the current user to the `docker` group and re-executes through `sg docker` when possible. If Docker still fails:

```bash
sudo usermod -aG docker "$USER"
logout
# log in again
```

### Fabric binaries missing

```bash
cd /tmp
wget -q https://github.com/hyperledger/fabric/releases/download/v2.5.9/hyperledger-fabric-linux-amd64-2.5.9.tar.gz
tar xzf hyperledger-fabric-linux-amd64-2.5.9.tar.gz
sudo cp bin/* /usr/local/bin/
cryptogen version
peer version
```

### API cannot connect to Fabric

Check that Fabric is up and profiles/wallets exist:

```bash
docker compose -f blockchain/network/docker/docker-compose-fabric.yaml ps
ls blockchain/network/connection-profiles/connection-org1.json
ls wallets/org1/admin.id
docker logs sme-cert-api --tail 100
```

Then restart the API:

```bash
docker compose --env-file .env -f infra/compose/compose.yaml restart api
```

### Chaincode container missing or stopped

If using CCaaS:

```bash
docker ps -a | grep cc-certificate_contract
docker start cc-certificate_contract
```

If it does not exist, redeploy chaincode from a healthy Fabric network:

```bash
cd blockchain/network
CC_VERSION=1.0 CC_SEQUENCE=1 bash scripts/deploy_chaincode_ccaas.sh
```

### Prisma schema issues

```bash
docker compose --env-file .env -f infra/compose/compose.yaml exec -T api \
  npx prisma db push --schema=/app/prisma/schema.prisma --accept-data-loss
```

### SMTP validation error

Remove empty SMTP values:

```bash
sed -i '/^SMTP_HOST=$/d;/^SMTP_USER=$/d;/^SMTP_PASS=$/d' .env
bash scripts/restart_application.sh
```

### Port conflict

```bash
sudo ss -tulpn | grep -E ':80|:443|:3000|:5432|:7050'
```

Stop conflicting host services or adjust compose ports.

### Disk pressure

```bash
df -h
docker system df
docker image prune -f
sudo journalctl --vacuum-time=7d
```

Avoid `docker volume prune` unless you intentionally want to delete application/Fabric data.

---

## 19. Developer Commands

```bash
yarn install
yarn build
yarn test
yarn lint
yarn typecheck
```

Run API locally:

```bash
yarn workspace @sme-cert/api dev
```

Run web locally:

```bash
yarn workspace @sme-cert/web dev
```

Run app stack in Docker:

```bash
docker compose --env-file .env -f infra/compose/compose.yaml up -d --build
```

---

## 20. Production Checklist

- [ ] Fresh install completed successfully.
- [ ] `.env` generated and stored securely.
- [ ] Demo passwords changed or demo users disabled.
- [ ] Public DNS configured.
- [ ] HTTPS enabled.
- [ ] `APP_URL` and `CORS_ORIGIN` set to public HTTPS URL.
- [ ] Only ports 80/443 public in cloud firewall/security lists.
- [ ] PostgreSQL/Fabric/IPFS volumes included in backup plan.
- [ ] Grafana password changed and access restricted.
- [ ] SMTP configured if password resets/contact email are required.
- [ ] Monitoring dashboards reviewed.
- [ ] Restart script tested after a reboot.

---

**Last updated:** May 2026
