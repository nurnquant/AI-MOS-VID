# Troubleshooting

## `docker: command not found` / `Cannot connect to the Docker daemon`

```bash
brew install colima docker docker-compose
colima start
```

## `docker compose` not recognized as a plugin

Add to `~/.docker/config.json`:

```json
{ "cliPluginsExtraDirs": ["/usr/local/lib/docker/cli-plugins"] }
```

## Integration tests fail with `role "aivs" does not exist`

You are hitting a different PostgreSQL than the AIVS container — usually a
host-level Postgres on 5432. AIVS uses **5433**. Check `DATABASE_URL` in
`.env` ends with `:5433/aivs`, and `lsof -nP -iTCP:5433` shows the container.

## Redis tests pass but data appears in the wrong Redis

Same cause: host Redis on 6379. AIVS uses **6380**. Check `REDIS_URL`.

## `pnpm env:check` fails on env vars

```bash
cp .env.example .env
```

## Ports already in use

`lsof -nP -iTCP:<port> -sTCP:LISTEN` to find the owner. Change the AIVS port
via `POSTGRES_PORT` / `REDIS_PORT` / `MINIO_PORT` in `.env` and re-run
`pnpm infra:up` (compose reads the same variables).

## MinIO bucket missing

The integration test creates `aivs-assets` on first run, or create it in the
console at http://localhost:9001 (aivs_local / aivs_local_secret).

## `pnpm install` blocked: "Ignored build scripts"

pnpm 11 requires approval for postinstall scripts. Approved packages live in
`pnpm-workspace.yaml` under `allowBuilds`. Add new ones there deliberately —
do not blanket-approve.

## Playwright browser missing

```bash
pnpm exec playwright install chromium
```

## Worker hangs on startup

Redis unreachable. `pnpm infra:up`, then check `pnpm env:check`. The worker
requires `maxRetriesPerRequest: null` (already configured) — do not remove it.

## Node version mismatch

```bash
nvm install    # reads .nvmrc
```
