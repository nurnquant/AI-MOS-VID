# Local Infrastructure

All local services run in Docker (Colima VM) via `compose.yaml` at the repo root.

## Services

| Service          | Image                   | Host Port   | Volume          | Health check     |
| ---------------- | ----------------------- | ----------- | --------------- | ---------------- |
| PostgreSQL       | postgres:17-alpine      | 5433 → 5432 | `postgres-data` | `pg_isready`     |
| Redis            | redis:7-alpine (AOF on) | 6380 → 6379 | `redis-data`    | `redis-cli ping` |
| MinIO            | minio/minio             | 9000, 9001  | `minio-data`    | `mc ready local` |
| Mailpit (opt-in) | axllent/mailpit         | 1025, 8025  | —               | profile `mail`   |

Credentials are non-production local defaults defined in `compose.yaml` /
`.env.example` (`aivs` / `aivs_local`, MinIO `aivs_local` / `aivs_local_secret`).

## Commands

```bash
pnpm infra:up      # docker compose up -d --wait
pnpm infra:down    # docker compose down (volumes preserved)
pnpm infra:logs    # docker compose logs -f
pnpm infra:reset -- --yes-destroy-data   # down + delete volumes (guarded)
```

## Colima runtime

```bash
colima start    # boot VM (required after reboot)
colima status
colima stop
```

## Non-standard ports

This machine runs its own PostgreSQL on 127.0.0.1:5432 and Redis on
127.0.0.1:6379 (host-level services, not part of AIVS). AIVS containers
therefore publish on **5433** and **6380**. All defaults across scripts,
tests, and apps use these ports; override via `POSTGRES_PORT` / `REDIS_PORT`
env vars if your machine differs.
