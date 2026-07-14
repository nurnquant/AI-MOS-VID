# AIVS — Riwaq Al Ilm Enterprise AI Video Production Studio

Governed AI-assisted media production system (foundation phase).

**Current phase:** `AIVS-ENV-001` — environment setup. No production features yet.

## Quick start

```bash
nvm install && pnpm install --frozen-lockfile
cp .env.example .env
colima start && pnpm infra:up
pnpm verify
pnpm dev   # web app at http://localhost:3000
```

## Layout

```text
apps/studio-web    Next.js shell (health, status pages/endpoints)
apps/worker        BullMQ worker foundation
packages/types     Shared types
packages/media-core FFmpeg wrapper + media inspection
packages/providers Provider contracts + mocks (no live APIs)
packages/testing   Unit + integration tests (Postgres/Redis/MinIO)
scripts/           env-check, media smoke test, infra reset
docs/              architecture, environment, operations, security
```

## Docs

- [Local development](docs/environment/LOCAL-DEVELOPMENT.md)
- [Local infrastructure](docs/operations/LOCAL-INFRASTRUCTURE.md)
- [Troubleshooting](docs/operations/TROUBLESHOOTING.md)
- [Architecture decision — toolchain](docs/architecture/ADR-AIVS-001-environment-and-toolchain.md)
- [Repository audit](docs/environment/AIVS-ENV-001-repository-audit.md)
- [Media security baseline (child safety)](docs/security/AIVS-media-security-baseline.md)
