# AIVS-ENV-001 — Repository Audit

**Date:** 2026-07-14
**Auditor:** Claude Code (Gate 0 — Repository Discovery and Audit)
**Working directory:** `/Users/oldmac/Claude/Projects/AI-MOS`

---

## 1. Repository Structure

The working directory is **not a git repository** and contains no project code:

```text
AI-MOS/
└── AI_Video_Studio_Environment_Setup_Master_Prompt.md
```

- No `package.json`, lockfiles, workspace config, Dockerfiles, CI workflows, environment files, or documentation exist.
- No remote repository is configured.
- There is no production branch to protect; the repository must be created from scratch.

## 2. Existing Technologies (Host Toolchain)

| Tool                    | Status               | Version                        |
| ----------------------- | -------------------- | ------------------------------ |
| Node.js                 | ✅ Installed         | v26.0.0 (current, **not LTS**) |
| npm                     | ✅ Installed         | 11.12.1                        |
| pnpm                    | ✅ Installed         | 11.8.0                         |
| yarn                    | ❌ Not installed     | — (not needed)                 |
| Python 3                | ✅ Installed         | 3.13.3                         |
| git                     | ✅ Installed         | 2.39.5 (Apple Git-154)         |
| Homebrew                | ✅ Installed         | 6.0.2                          |
| Docker / Docker Compose | ❌ **Not installed** | —                              |
| FFmpeg / ffprobe        | ❌ **Not installed** | —                              |

Platform: macOS (Darwin 24.6.0).

## 3. Existing Reusable Components

None in this directory. Note: a separate project exists at
`~/Claude/Projects/AIEES/portal-src` (Next.js portal, per session working
directories). It is a different product; no code reuse is assumed for AIVS
unless the user directs otherwise.

## 4. Constraints

- Master prompt mandates: pnpm, TypeScript strict, Next.js, Turborepo, Prisma,
  BullMQ, Vitest, Playwright, Docker Compose (PostgreSQL, Redis, MinIO).
- No paid AI-provider calls during environment setup.
- No production deployment or publishing integrations in this phase.
- Child-media privacy/security must be documented as first-class baseline.

## 5. Risks

| #   | Risk                                                                 | Severity | Notes                                                                                     |
| --- | -------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| R1  | Docker not installed — blocks PostgreSQL/Redis/MinIO (Gates 2, 6)    | **High** | Requires user-approved install (Docker Desktop or Colima + docker CLI)                    |
| R2  | FFmpeg/ffprobe not installed — blocks media smoke tests (Gates 2, 6) | **High** | `brew install ffmpeg` available; needs user approval                                      |
| R3  | Node v26.0.0 is a Current release, not Active LTS                    | Medium   | Prompt specifies "current active LTS". Pin via `.nvmrc`; either accept v26 or install LTS |
| R4  | No git repository — no history, no remote, no backup                 | Medium   | Must `git init` and create `feature/aivs-environment-foundation`                          |
| R5  | git 2.39.5 is old (2022) but functional                              | Low      | No blocking impact                                                                        |

## 6. Conflicts

None — greenfield directory. No existing architecture, tooling, or governance
to preserve or conflict with.

## 7. Missing Prerequisites

1. **Docker + Docker Compose** (required: local PostgreSQL, Redis, MinIO)
2. **FFmpeg + ffprobe** (required: media-core smoke tests)
3. **Git repository initialization** (required before any scaffold work)
4. Optional: Node.js Active LTS if strict LTS compliance is required

## 8. Recommended Environment Architecture

Adopt the master-prompt default foundation in full (no existing stack to
preserve):

- pnpm + Turborepo monorepo, TypeScript strict
- `apps/studio-web` (Next.js) + `apps/worker` (BullMQ consumer)
- `packages/` for config, database (Prisma), media-core, providers (mock only),
  queue, observability, security, testing, types
- `compose.yaml` for PostgreSQL, Redis, MinIO (+ optional Mailpit)
- Vitest, Playwright, ESLint, Prettier, Husky + lint-staged
- Gitleaks secret scanning
- GitHub Actions CI (no deployment)

## 9. Repo Placement Decision

**Recommendation: initialize a new repository in this directory
(`AI-MOS/`).** No project repository exists (master-prompt rule 2 permits
creation in this case). The AIEES portal repo is a separate product and
should not host this system.

## 10. Gate 0 Verdict

Audit complete. **Blocked from Gate 2 onward** until Docker and FFmpeg
installs are approved. Gate 1 (ADR) can proceed immediately after repo
initialization is approved.
