# SME Certificate Trust Platform — QA Hardening & UX Reinvention Report

## Executive summary

The platform has been validated end-to-end using the official `scripts/start_all.sh` flow and upgraded across backend security, blockchain runtime behavior, Docker orchestration, automated QA, and the public verification experience. The running stack is operational behind Nginx with healthy API, web, Postgres, IPFS, Prometheus, Grafana, and Fabric connectivity.

## Bugs discovered and fixed

- **Docker/env reliability:** Compose interpolation could silently blank secrets unless root `.env` was sourced. Startup/restart/rebuild scripts now pass `--env-file` consistently and can generate safe dev defaults.
- **Database bootstrapping:** `prisma migrate deploy` found no migrations, leaving tables missing. Startup now also runs `prisma db push`.
- **Alpine native bcrypt crash:** seed crashed with a segmentation fault. API and seed now use `bcryptjs`.
- **API healthcheck mismatch:** runtime image had `wget`, while compose used `curl`. Healthchecks now use `wget` and health routes are version-neutral.
- **Unguarded protected APIs:** metrics, storage, wallet, organization admin, and logout routes now enforce JWT guards.
- **Authorization gaps:** user profile access, user listing, template creation/publishing, certificate issuance, and revocation now enforce role/ownership checks.
- **Frontend role routing:** `ISSUER_OPERATOR` can now access the issuer portal instead of being redirected home.
- **Fabric determinism:** removed `time.Now()`-relative validation from chaincode time checks.
- **Fabric local admin roles:** cryptogen admin identities now map to admin/issuer roles for the local Fabric network.
- **Fabric return schema issue:** `GetCertificateRecord` now returns explicit JSON string output compatible with Fabric contract metadata.
- **Fabric issuance path:** templates auto-publish on-chain before certificate issuance; successful issuance persists Fabric transaction IDs in Postgres.
- **IPFS client runtime failure:** replaced incompatible `ipfs-http-client` dynamic import usage with direct IPFS HTTP API calls.
- **Docker disk exhaustion:** added `.dockerignore` and pruned build cache; build context dropped from hundreds of MB to hundreds of KB.
- **Nginx proxy staleness:** Nginx recreated with updated upstream/security config and now serves `/api/health` correctly.

## UI/UX transformation delivered

- Replaced the traditional landing hero with a cinematic **Trust Command Center** featuring glass panels, animated topology, proof-chain storytelling, telemetry, and enterprise trust signals.
- Preserved the existing homepage as **Version A** and added a separate experimental **Version B** route at `/vision2030` for A/B testing.
- Implemented an immersive **Radial Orbital Timeline** inspired by the requested 21st.dev component, but redesigned specifically for the certificate blockchain lifecycle: upload, SHA-256 hashing, Fabric transaction creation, node validation, consensus, ledger recording, AI analysis, and trust confirmation.
- Added analytics/feature-flag-ready experiment metadata in `apps/web/src/experiments/vision2030.ts`.
- Rebalanced `/vision2030` so the orbital visualization uses a tighter viewport-aware grid, smaller orbital nodes, denser side-panel hierarchy, and less vertical dead space.
- Expanded `/vision2030` beyond a component demo into a full ecosystem page with national digital trust messaging, consortium/governance cards, real-time trust metrics, and verification transparency sections.
- Added a premium **Verification Intelligence Overlay** on the verification page to explain method, network, trust score, and evidence layers.
- Added unified portal design primitives: **PortalHero**, **TrustNetworkMiniMap**, `vision-card`, `portal-shell-bg`, and premium dark command sidebars.
- Upgraded issuer, holder, and verifier dashboards into Egypt Vision 2030 command-center experiences with live trust maps, AI-style insights, and premium card systems.
- Upgraded Blockchain Explorer hero/status layout with cinematic dark mesh styling and a live topology minimap.
- Preserved and integrated the advanced blockchain visualizer for uploaded-file verification.
- Added motion utilities, glassmorphism/neomorphic styling, reduced-motion support, trust grid, scanline, orbit, and edge propagation animations.
- Improved verification trust comprehension with progressive disclosure and report/evidence affordances.

## Automated and runtime validation evidence

- `yarn typecheck` — passed.
- `yarn build` — passed for API and web.
- `yarn workspace @sme-cert/web test` — passed SHA-256 unit test.
- `yarn workspace @sme-cert/api test:e2e` — passed API health e2e.
- `go test ./...` in chaincode — passed.
- `yarn workspace @sme-cert/web test:e2e` — passed after installing browser dependencies.
- `scripts/start_all.sh` official startup path — executed successfully.
- Runtime checks passed:
  - API health through Nginx: `200 OK`.
  - Blockchain health: connected, channel `certificates`, chaincode `certificate_contract`, block height observed.
  - Demo auth login and refresh: passed.
  - Protected metrics: authenticated success, unauthenticated `401`.
  - IPFS store/retrieve smoke: passed.
  - End-to-end issue/verify flow: template creation, certificate issuance, on-chain record query, API verification with Fabric tx id.
  - Concurrent verification stress smoke: rate limiting activated as expected (`200` + `429`).
  - SPA route smoke for `/`, `/verify`, `/blockchain`, `/issuer`, `/holder`, `/verifier`: `200 OK` with React root rendered.
  - A/B experiment route `/vision2030`: `200 OK`, React root rendered, deployed bundle contains lifecycle strings.
  - Blockchain page regression after Docker storage move fixed: Fabric containers restarted, API reconnect resilience added, `/api/health/blockchain` returns connected with channel/chaincode/block height, recent blocks endpoint returns live blocks.
  - Final E2E Fabric smoke: issue certificate → record on chain with Fabric tx id → verify valid → revoke → verify revoked.

## Security and production hardening implemented

- JWT guards added to protected routes.
- Role and ownership enforcement added to sensitive operations.
- Nginx CSP and Permissions-Policy headers added.
- Internal service ports bound to `127.0.0.1`; only Nginx remains externally published.
- API input validation improved for hashes, storage payloads, profile updates, registrations, and pagination.
- Rate limiting validated on verification endpoints.
- Docker build context hardened with `.dockerignore`.

## Remaining technical risks and recommendations

- **Disk capacity:** root filesystem remains high (~90%+ during validation). Increase VM disk size or move Docker data to a larger volume before production load.
- **Frontend bundle size:** Vite reports one large chunk. Consider route-level lazy loading for public/portal routes and moving QR/visualizer modules into dynamic imports.
- **Full regression suite:** current automated suite is improved but still lightweight. Add mocked service/unit tests for every NestJS service and Playwright journeys for issuer/holder/verifier portals.
- **Production Fabric identity model:** local cryptogen admin fallback is appropriate for this environment; production should use Fabric CA identities with explicit attributes.
- **Secrets rotation:** generated/demo secrets should be rotated and stored in a managed secret store for production.
- **TLS:** Nginx exposes 443 but production TLS certificates must be provisioned with `scripts/setup_https.sh` or equivalent.
