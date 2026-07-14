# ADR-AIVS-001 — Environment and Toolchain

**Status:** Accepted
**Date:** 2026-07-14
**Deciders:** User (approved via interactive prompts) + Claude Code
**Related:** `docs/environment/AIVS-ENV-001-repository-audit.md`

## Context

The Riwaq Al Ilm Enterprise AI Video Production Studio starts from an empty
directory (see repository audit). No existing stack, tooling, or governance
constrains the choice, so the master-prompt default foundation applies. The
host is macOS (Darwin 24.6.0) with Homebrew, Node v26, pnpm 11.8, Python 3.13.
Docker and FFmpeg were absent and required installation.

## Decision

### Repository

- New git repository at `/Users/oldmac/Claude/Projects/AI-MOS`, default branch
  `main`, work performed on `feature/aivs-environment-foundation`.

### Application and orchestration

- **Node.js v26.0.0**, pinned in `.nvmrc`. Deviation: prompt asks for active
  LTS; user approved keeping the already-installed v26 (Current release) to
  avoid a second runtime install. Revisit if any dependency rejects >LTS.
- **pnpm 11** as the only package manager (workspace mode).
- **TypeScript, strict mode** across all packages.
- **Next.js** for `apps/studio-web`; API via route handlers with service
  boundaries kept in packages.
- **Turborepo** for task orchestration and caching.
- **Zod** for validation; **Pino** for structured logging.

### Media processing

- **FFmpeg 8.1.2 / ffprobe 8.1.2** (Homebrew) as the media engine.
- Python reserved for future ML tasks; not part of the initial toolchain.

### Data and jobs

- **PostgreSQL** (Docker) for metadata/operational state, via **Prisma**.
- **Redis** (Docker) for queue/cache, via **BullMQ**.
- **MinIO** (Docker) for local S3-compatible object storage.

### Container runtime

- **Colima + docker CLI + docker-compose** (Homebrew). Chosen over Docker
  Desktop: lighter, no GUI, no commercial-license ambiguity. `colima start`
  boots the VM; compose services defined in `compose.yaml`.

### Testing and quality

- **Vitest** (unit + integration), **Playwright** (e2e), **ESLint**,
  **Prettier**, TypeScript type-checks, **Husky + lint-staged** hooks,
  **Gitleaks** secret scanning, GitHub Actions CI (no deployment).

## Alternatives Considered

| Area | Alternative | Why rejected |
|---|---|---|
| Container runtime | Docker Desktop | Heavier install, licensing caveats; user chose Colima |
| Container runtime | Podman | Compose compatibility friction with BullMQ/MinIO examples |
| Node version | Install v24 LTS | Extra runtime to manage; v26 already present and compatible; user approved |
| ORM | Drizzle | Prompt default is Prisma; no existing standard to preserve |
| Queue | Cloud queue (SQS etc.) | Phase requires local-only, zero-cost foundation |
| Monorepo | Nx | Turborepo is the prompt default; simpler for this scale |

## Consequences

- All services run locally; zero cloud cost during foundation phase.
- Colima must be running before `pnpm infra:up`; env-check script verifies it.
- Node v26 pin means contributors need Node ≥26; documented in LOCAL-DEVELOPMENT.
- Prisma migrations become the schema source of truth from Gate 3 onward.

## Security Implications

- No secrets in repo; `.env.example` placeholders only; Gitleaks in CI and
  as `pnpm security:secrets`.
- MinIO/Postgres/Redis credentials are clearly-non-production local defaults.
- Child-media handling gets a dedicated security baseline document
  (`docs/security/AIVS-media-security-baseline.md`) before any media features.

## Cost Implications

- $0 recurring. All paid providers (Veo, Kling, Runway, ElevenLabs, Meta,
  YouTube, TikTok) are stubbed behind provider contracts with mocks.

## Local-Development Implications

- One-command infra (`pnpm infra:up`), one-command validation (`pnpm verify`).
- Media smoke test is self-cleaning and offline.

## Future Migration Path

- Providers: swap mocks for real adapters behind unchanged contracts.
- Storage: MinIO → S3/GCS by changing endpoint env vars only.
- Queue: BullMQ → managed Redis or alternative broker behind `packages/queue`.
- Deployment: CI already builds; add deploy workflows in a later module.
