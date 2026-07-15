---
name: verify
description: Verify AIVS changes end-to-end - quality gate, integration suite against live infra, and Playwright e2e. Use before committing any nontrivial change and before completing a module gate.
---

# Verify AIVS changes

Order matters — cheapest first:

1. `pnpm verify` — env check, prettier, eslint, typecheck, all unit tests,
   ffmpeg media smoke, Next build. Must exit 0.
2. `pnpm --filter @aivs/testing test:integration` — full pipelines against
   live Postgres/Redis/MinIO (start infra first: `pnpm infra:up`). Covers
   asset ingestion→promotion, auth/tenancy/RBAC, consent lifecycle +
   hard-delete enforcement.
3. `npx playwright test` — e2e through the real UI; specs spawn the worker.

Gotchas:

- Prisma type errors after schema edits → regenerate:
  `cd packages/database && npx prisma generate`.
- Runtime `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` in worker → non-erasable TS
  (parameter properties, extensionless relative import) that typecheck
  can't catch; fix the syntax, don't add flags.
- Integration tests create their own tenants and drain queues in teardown;
  if a worker run later spams "record not found", flush local Redis:
  `docker exec aivs-redis-1 redis-cli FLUSHALL`.
- Never leave `pnpm verify` red at a module gate; module DoD also requires
  gitleaks (`pnpm security:secrets`) and reproducible migrations
  (`pnpm db:reset && pnpm db:migrate && pnpm db:seed`; reset needs the
  Prisma AI-consent env var when run by an agent).
