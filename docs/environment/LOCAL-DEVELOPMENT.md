# Local Development Guide

## Prerequisites

| Tool                | Version                   | Install                                     |
| ------------------- | ------------------------- | ------------------------------------------- |
| Node.js             | 26.x (pinned in `.nvmrc`) | `nvm install`                               |
| pnpm                | 11.x                      | `npm install -g pnpm`                       |
| Colima + docker CLI | latest                    | `brew install colima docker docker-compose` |
| FFmpeg + ffprobe    | 8.x                       | `brew install ffmpeg`                       |
| Gitleaks            | latest                    | `brew install gitleaks`                     |

One-time docker compose plugin config (`~/.docker/config.json`):

```json
{ "cliPluginsExtraDirs": ["/usr/local/lib/docker/cli-plugins"] }
```

## Installation

```bash
git clone <repo-url> && cd AI-MOS
pnpm install --frozen-lockfile
```

## Environment Setup

```bash
cp .env.example .env   # local defaults work out of the box
pnpm env:check         # verifies toolchain, env vars, service ports
```

## Starting Infrastructure

```bash
colima start           # once per boot
pnpm infra:up          # Postgres, Redis, MinIO (health-checked)
pnpm infra:logs        # follow logs
pnpm infra:down        # stop containers (data preserved)
```

## Starting Applications

```bash
pnpm dev                              # all apps via turbo
pnpm --filter @aivs/studio-web dev    # web only → http://localhost:3000
pnpm --filter @aivs/worker dev        # worker only
pnpm --filter @aivs/worker smoke      # one-shot worker test job
```

## Running Tests

```bash
pnpm test              # unit tests (all packages)
pnpm test:integration  # Postgres/Redis/MinIO round-trips (infra must be up)
pnpm test:e2e          # Playwright (starts web app itself)
pnpm verify            # full non-destructive validation suite
```

## Media Smoke Test

```bash
pnpm media:smoke       # generates + inspects + deletes a 2s test video
```

## Resetting Local Services

Destructive — deletes all local DB/queue/object data:

```bash
pnpm infra:reset -- --yes-destroy-data
```

## Port Map

| Service            | Port        | Notes                                                  |
| ------------------ | ----------- | ------------------------------------------------------ |
| studio-web         | 3000        | Next.js dev server                                     |
| PostgreSQL (AIVS)  | **5433**    | 5432 is taken by a host-level Postgres on this machine |
| Redis (AIVS)       | **6380**    | 6379 is taken by a host-level Redis on this machine    |
| MinIO S3 API       | 9000        |                                                        |
| MinIO console      | 9001        | login: `aivs_local` / `aivs_local_secret`              |
| Mailpit (optional) | 1025 / 8025 | `docker compose --profile mail up -d`                  |

## Common Failures

See [TROUBLESHOOTING.md](../operations/TROUBLESHOOTING.md).

## Adding Future Provider Credentials Safely

1. Add the variable name (empty) to `.env.example` with a comment.
2. Put the real value ONLY in your local `.env` (gitignored).
3. Never hardcode keys; read via `process.env` at the service boundary.
4. Run `pnpm security:secrets` before pushing.
5. Production secrets go in the deployment platform's secret manager, never in git.
