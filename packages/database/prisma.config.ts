import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "prisma/config";

// Load the monorepo root .env for CLI runs (migrate/reset/deploy); the
// local-only fallback matches .env.example.
const rootEnv = join(import.meta.dirname, "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
// Migrations need a DIRECT (non-pooled) connection. Production (Vercel
// Postgres/Neon) sets MIGRATE_DATABASE_URL to the non-pooling URL while
// DATABASE_URL stays pooled for the runtime client.
const databaseUrl =
  process.env.MIGRATE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://aivs:aivs_local@localhost:5433/aivs";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
