# SME Certificate Trust Platform

A permissioned blockchain platform for issuing, storing, verifying, and revoking digital certificates for Egyptian SMEs.

The system combines:

- **React/Vite frontend** with public, issuer, holder, and verifier portals.
- **NestJS API** with JWT authentication, Prisma/PostgreSQL, IPFS integration, Fabric SDK integration, audit logs, metrics, and role-scoped certificate workflows.
- **Hyperledger Fabric 2.5 network** with 4 organizations, 3 Raft orderers, 8 peers, CouchDB state databases, and Go chaincode.
- **Docker Compose infrastructure** for PostgreSQL, IPFS, API, web, Nginx, Prometheus, Grafana, OpenTelemetry, and Fabric.

## Documentation

Read the complete project documentation here:

➡️ **[docs/COMPLETE_PROJECT_DOCUMENTATION.md](docs/COMPLETE_PROJECT_DOCUMENTATION.md)**

It includes architecture, services, ports, API endpoints, database models, Fabric topology, deployment, restart, operations, security notes, troubleshooting, and production checklist.

## Fresh Linux Deployment

Run from the repository root as a normal sudo-enabled Linux user:

```bash
bash scripts/fresh_start_linux.sh
```

Useful examples:

```bash
bash scripts/fresh_start_linux.sh --public-host 203.0.113.10
bash scripts/fresh_start_linux.sh --public-host https://certs.example.com
bash scripts/fresh_start_linux.sh --reset-data --yes
```

The fresh-start script installs prerequisites, bootstraps Fabric, deploys chaincode, creates wallets/profiles, generates `.env`, builds the app stack, applies the database schema, seeds demo data, and runs health checks.

## Restart Existing Deployment

After a VM reboot or manual stop:

```bash
bash scripts/restart_application.sh
```

Optional flags:

```bash
bash scripts/restart_application.sh --rebuild
bash scripts/restart_application.sh --migrate
```

## Main URLs

| Service | URL |
|---|---|
| Web UI | `http://<server-ip>/` |
| API | `http://<server-ip>/api` |
| API health | `http://<server-ip>/api/health` |
| Blockchain status | `http://<server-ip>/api/health/blockchain` |
| Grafana | `http://localhost:3001` |
| Prometheus | `http://localhost:9090` |

Only expose ports **80** and **443** publicly.

## Demo Credentials

| Email | Password | Role |
|---|---|---|
| `admin@platform.local` | `Admin123!` | `PLATFORM_ADMIN` |
| `issuer@msmeda.gov.eg` | `Demo123!` | `ISSUER_ADMIN` |
| `sme@example.com` | `Demo123!` | `SME_USER` |
| `verifier@auditor.com` | `Demo123!` | `VERIFIER_USER` |

Change demo passwords before exposing the platform publicly.
