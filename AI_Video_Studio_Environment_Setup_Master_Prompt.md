# AI Video Studio — Environment Setup Master Prompt

**Document ID:** AIVS-ENV-001  
**Version:** 1.0  
**Status:** Ready for Claude Code / Claude Cowork Execution  
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio  
**Primary Objective:** Establish a secure, reproducible, production-ready local development environment before implementing any AI video production capabilities.

---

## 1. Claude Operating Role

You are acting as a **Principal Software Architect, DevOps Engineer, AI Media Systems Engineer, Security Engineer, and Senior QA Automation Engineer**.

Your task is to prepare the complete engineering environment for the **Riwaq Al Ilm Enterprise AI Video Production Studio**.

Do not begin feature implementation until the environment, repository, configuration, security controls, local services, quality gates, and documentation are fully established and validated.

Operate architecture-first and evidence-first.

---

## 2. Product Context

The project will become a governed AI-assisted media production system for creating and managing:

- Facebook video advertisements
- Instagram Reels
- TikTok videos
- YouTube Shorts
- Long-form YouTube videos
- Website hero videos
- WhatsApp promotional videos
- Reusable teacher, parent, child, and environment assets
- Scripts, storyboards, prompts, audio, captions, exports, and performance analytics

The long-term system may include specialized agents for:

- Creative strategy
- Script generation
- Storyboarding
- Character consistency
- Prompt engineering
- Video generation orchestration
- Quality assurance
- Post-production
- Publishing
- Performance analytics

This prompt covers **environment setup only**. Do not implement the full production system yet.

---

## 3. Non-Negotiable Rules

1. Use the existing repository if one is provided.
2. Do not create a new repository unless no project repository exists.
3. Do not modify the production branch directly.
4. Create or use a dedicated branch such as:

```bash
feature/aivs-environment-foundation
```

5. Audit before changing anything.
6. Preserve the existing architecture, tooling, package manager, conventions, and governance unless there is a documented reason to change them.
7. Never place API keys, credentials, tokens, private URLs, or secrets in source control.
8. Use `.env.example` for placeholders only.
9. Every setup decision must be documented.
10. Every installed tool must be validated with an executable check.
11. Do not claim success without command output or test evidence.
12. Stop at any destructive, irreversible, security-sensitive, or cost-incurring action and request explicit approval.
13. Prefer local mocks and adapters during foundation work.
14. Do not call paid AI-generation APIs during environment setup.
15. Do not publish, deploy, or connect real advertising accounts during this phase.

---

## 4. Required Execution Model

Execute this work in controlled gates.

### Gate 0 — Repository Discovery
### Gate 1 — Architecture and Toolchain Decision
### Gate 2 — Local Environment Provisioning
### Gate 3 — Project Scaffold and Configuration
### Gate 4 — Security and Secrets Foundation
### Gate 5 — Developer Experience and Quality Gates
### Gate 6 — Local Service Validation
### Gate 7 — Environment Verification Report

Do not proceed to the next gate until the current gate is complete and documented.

---

# GATE 0 — Repository Discovery and Audit

## 5. Discover the Existing Project

Inspect the current working directory and determine:

- Repository root
- Git status
- Current branch
- Remote repositories
- Monorepo or single-package structure
- Existing applications and packages
- Package manager
- Node.js version
- Python version
- Existing Docker configuration
- Existing CI/CD workflows
- Existing environment files
- Existing lint, test, type-check, formatting, and build commands
- Existing cloud deployment configuration
- Existing documentation and architecture decisions

Run suitable commands such as:

```bash
pwd
ls -la
find . -maxdepth 2 -type f | sort | head -300
git status
git branch --show-current
git remote -v
node --version
npm --version
pnpm --version || true
yarn --version || true
python3 --version
docker --version || true
docker compose version || true
```

Inspect relevant files if present:

```text
package.json
pnpm-workspace.yaml
turbo.json
nx.json
pyproject.toml
requirements.txt
Dockerfile
docker-compose.yml
compose.yaml
.github/workflows/*
.vercel/project.json
CLAUDE.md
README.md
docs/*
```

## 6. Produce Repository Audit

Create:

```text
docs/environment/AIVS-ENV-001-repository-audit.md
```

The audit must include:

- Current repository structure
- Existing technologies
- Existing reusable components
- Constraints
- Risks
- Conflicts
- Missing prerequisites
- Recommended environment architecture
- Whether the project should be implemented inside the current repo or as a new workspace within it

Do not change the repository until this audit is complete.

---

# GATE 1 — Architecture and Toolchain Decision

## 7. Preferred Foundation Architecture

Use the existing stack when practical. If no relevant stack exists, use the following default foundation:

### Application and Orchestration

- **Node.js:** current active LTS
- **Package manager:** pnpm
- **Language:** TypeScript with strict mode
- **Web application:** Next.js
- **Monorepo orchestration:** Turborepo
- **API layer:** Next.js route handlers initially, with clean service boundaries
- **Validation:** Zod
- **Logging:** Pino or an equivalent structured logger

### Media Processing

- **FFmpeg:** primary media-processing engine
- **ffprobe:** metadata inspection
- **ImageMagick:** optional image utility
- **Python:** optional for future ML/media tasks, not required for initial API orchestration

### Data and Jobs

For the initial local foundation:

- **PostgreSQL:** metadata and operational state
- **Redis:** queue and cache foundation
- **Object storage:** MinIO for local S3-compatible asset storage
- **ORM:** Prisma unless the repository already uses another standard
- **Queue:** BullMQ or an equivalent Redis-backed queue

### Testing and Quality

- **Unit tests:** Vitest
- **API/integration tests:** Vitest or repository standard
- **End-to-end tests:** Playwright
- **Linting:** ESLint
- **Formatting:** Prettier
- **Type checking:** TypeScript
- **Git hooks:** Husky and lint-staged only if compatible with the repository

### Local Infrastructure

Use Docker Compose for:

- PostgreSQL
- Redis
- MinIO
- Optional Mailpit for future transactional email testing

Do not containerize the main developer application unless the repository already follows that pattern.

## 8. Architecture Decision Record

Create:

```text
docs/architecture/ADR-AIVS-001-environment-and-toolchain.md
```

Document:

- Context
- Decision
- Alternatives considered
- Consequences
- Security implications
- Cost implications
- Local-development implications
- Future migration path

If the repository already uses an ADR naming convention, follow it.

---

# GATE 2 — Local Environment Provisioning

## 9. Runtime Version Management

Establish explicit versions using the repository standard. Prefer one of:

```text
.nvmrc
.node-version
.tool-versions
```

Add Python version control only if Python is introduced.

Create a version verification script:

```text
scripts/check-environment.ts
```

It must verify:

- Node.js version
- pnpm availability and version
- Docker availability
- Docker Compose availability
- FFmpeg availability
- ffprobe availability
- Git availability
- Required environment variables
- Required local service ports

The script must fail clearly with actionable instructions.

## 10. FFmpeg Installation and Validation

Detect the operating system.

For macOS, recommend Homebrew:

```bash
brew install ffmpeg
```

For Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

Do not install system packages automatically without approval if elevated privileges are required.

Validate:

```bash
ffmpeg -version
ffprobe -version
```

Create a non-destructive smoke test that:

1. Generates a 2-second color test video.
2. Adds silent audio.
3. Inspects the output with ffprobe.
4. Deletes the temporary output afterward.

Place it in:

```text
scripts/media-smoke-test.sh
```

## 11. Local Infrastructure

Create or extend:

```text
compose.yaml
```

Required services:

### PostgreSQL

- Persistent volume
- Health check
- Non-production credentials from environment variables

### Redis

- Persistent or development-safe configuration
- Health check

### MinIO

- S3-compatible API
- Console port
- Persistent volume
- Health check
- Development credentials only

Use variable placeholders and sensible local defaults that are clearly non-production.

Add commands such as:

```bash
pnpm infra:up
pnpm infra:down
pnpm infra:logs
pnpm infra:reset
```

The reset command must require an explicit confirmation or separate destructive flag.

---

# GATE 3 — Project Scaffold and Configuration

## 12. Recommended Repository Structure

Adapt this structure to the existing repository instead of forcing it blindly:

```text
apps/
  studio-web/
  worker/

packages/
  config/
  database/
  media-core/
  providers/
  queue/
  observability/
  security/
  testing/
  types/

infra/
  docker/
  minio/

scripts/

docs/
  architecture/
  environment/
  operations/

assets/
  brand/
  references/
  samples/
```

## 13. Application Scaffold

Create only the minimum foundation required to validate the environment:

### `apps/studio-web`

A minimal authenticated-ready application shell containing:

- Health page
- Environment status page
- Local services status endpoint
- Placeholder navigation for future modules

Do not implement business features.

### `apps/worker`

A minimal worker process that:

- Connects to Redis
- Starts successfully
- Processes one local test job
- Emits structured logs
- Shuts down gracefully

### `packages/media-core`

Provide interfaces and one local implementation for:

- Media metadata inspection
- Video normalization placeholder
- Thumbnail generation placeholder
- FFmpeg process execution wrapper

Implement only enough for smoke testing.

### `packages/providers`

Create provider contracts only for future integrations:

- Video generation provider
- Voice provider
- Music provider
- Storage provider
- Publishing provider

Add a `MockVideoGenerationProvider` for local tests.

Do not add live Veo, Kling, Runway, ElevenLabs, Meta, YouTube, or TikTok API calls yet.

---

# GATE 4 — Security and Secrets Foundation

## 14. Environment Variables

Create:

```text
.env.example
```

Include documented placeholders for:

```bash
# Application
NODE_ENV=development
APP_URL=http://localhost:3000
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://aivs:aivs_local@localhost:5432/aivs

# Redis
REDIS_URL=redis://localhost:6379

# Object Storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=aivs-assets
S3_ACCESS_KEY_ID=aivs_local
S3_SECRET_ACCESS_KEY=aivs_local_secret
S3_FORCE_PATH_STYLE=true

# Future providers — leave empty locally
GOOGLE_CLOUD_PROJECT=
GOOGLE_APPLICATION_CREDENTIALS=
VEO_API_KEY=
KLING_API_KEY=
RUNWAY_API_KEY=
ELEVENLABS_API_KEY=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
```

Do not create a real `.env` containing secrets unless the user explicitly supplies or approves them.

## 15. Secret Protection

Verify `.gitignore` covers:

```text
.env
.env.*
!.env.example
*.pem
*.key
credentials*.json
secrets/
```

Add secret scanning if compatible:

- Gitleaks, or
- TruffleHog, or
- Existing repository scanner

Add a command:

```bash
pnpm security:secrets
```

## 16. File Upload Security Foundation

Document future controls now:

- Allowed media types
- Maximum file sizes
- Filename sanitization
- Content-type verification
- Malware scanning boundary
- Object storage isolation
- Signed URL strategy
- Tenant isolation requirements
- Retention and deletion rules
- Child-safety and privacy controls for media containing minors

Create:

```text
docs/security/AIVS-media-security-baseline.md
```

The system will handle images and videos involving children. Treat child privacy, parental consent, access control, retention, and publishing approval as first-class controls.

---

# GATE 5 — Developer Experience and Quality Gates

## 17. Root Commands

Provide consistent root commands, adapted to the repository:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm verify
pnpm env:check
pnpm media:smoke
pnpm infra:up
pnpm infra:down
pnpm security:secrets
```

`pnpm verify` must run the complete non-destructive validation suite.

## 18. Continuous Integration

Create or update CI to run:

1. Dependency installation with lockfile enforcement
2. Environment/toolchain checks where practical
3. Formatting check
4. Lint
5. Type check
6. Unit tests
7. Integration tests using service containers or Docker
8. Build
9. Secret scan
10. Dependency audit

Do not add deployment in this phase.

## 19. Testing Baseline

Add at least:

- Environment-check unit tests
- Database connection integration test
- Redis queue integration test
- MinIO upload/download/delete integration test
- FFmpeg metadata test
- Worker job smoke test
- Web health endpoint test
- One Playwright smoke test

Avoid fake success. Tests must execute against local or CI services.

---

# GATE 6 — Local Service Validation

## 20. Required Validation Sequence

Run and capture results for:

```bash
pnpm install --frozen-lockfile
pnpm infra:up
pnpm env:check
pnpm media:smoke
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

Verify:

- Web app starts
- Worker starts
- PostgreSQL is reachable
- Redis is reachable
- MinIO is reachable
- Test bucket is created or validated
- Worker completes one test job
- FFmpeg produces and inspects a sample asset
- Application health endpoint returns success
- No secrets are committed
- Git working tree contains only intentional changes

## 21. Operational Documentation

Create:

```text
docs/environment/LOCAL-DEVELOPMENT.md
docs/operations/LOCAL-INFRASTRUCTURE.md
docs/operations/TROUBLESHOOTING.md
```

The local-development guide must include:

- Prerequisites
- Installation
- Environment setup
- Starting infrastructure
- Starting applications
- Running tests
- Running media smoke tests
- Resetting local services
- Common failures
- Port map
- How to add future provider credentials safely

---

# GATE 7 — Environment Verification Report

## 22. Final Deliverable

Create:

```text
docs/environment/AIVS-ENV-001-verification-report.md
```

The report must contain:

### Executive Summary

State whether the environment is:

- PASS
- PASS WITH CONDITIONS
- FAIL

### Changes Made

List all created and modified files.

### Toolchain

Record exact versions of:

- Node.js
- pnpm
- TypeScript
- Docker
- Docker Compose
- FFmpeg
- PostgreSQL image
- Redis image
- MinIO image

### Validation Evidence

Include command names and summarized results for:

- Install
- Lint
- Type check
- Tests
- Build
- Infrastructure health
- FFmpeg smoke test
- Security scan

### Open Risks

List unresolved risks, including:

- Paid provider access not configured
- Publishing credentials not configured
- Production storage not configured
- Authentication and tenant model not yet implemented
- Child-media consent workflows not yet implemented
- Production deployment not yet configured

### Readiness Decision

State whether the project is ready to begin:

```text
AIVS-FOUNDATION-002 — Core Media Asset and Workflow Foundation
```

Do not start that module without user approval.

---

## 23. Definition of Done

AIVS-ENV-001 is complete only when all of the following are true:

- Repository audit is complete
- Architecture decision is documented
- Dedicated feature branch is used
- Runtime versions are pinned
- FFmpeg and ffprobe are validated
- PostgreSQL, Redis, and MinIO run locally
- Minimal web and worker applications start successfully
- Provider interfaces exist with mock implementations only
- `.env.example` is complete
- Secrets are excluded and scanned
- Security baseline for child media is documented
- Lint, formatting, type checking, tests, and build pass
- CI foundation is in place
- Local-development documentation is complete
- Verification report is complete
- No paid provider calls were made
- No production deployment occurred
- No production branch was modified directly

---

## 24. Claude Response Protocol

At the start, respond with:

1. Repository detected
2. Current branch
3. Existing stack
4. Major risks
5. Planned gate sequence

During execution:

- Report blockers immediately
- Report material architectural conflicts before changing them
- Keep changes small and reviewable
- Commit by gate if commits are authorized
- Never invent command results

At the end, provide:

1. Final PASS / PASS WITH CONDITIONS / FAIL status
2. Summary of environment created
3. Validation results
4. Open risks
5. Exact next recommended module
6. List of files created or modified
7. Git diff summary

---

# Execution Instruction

Begin with **Gate 0 — Repository Discovery and Audit**.

Do not install packages, create files, modify configuration, or scaffold applications until the repository audit is complete and the proposed environment architecture is documented.
