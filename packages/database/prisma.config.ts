import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "prisma/config";

// Load the monorepo root .env for CLI runs (migrate/reset/deploy); the
// local-only fallback matches .env.example.
const rootEnv = join(import.meta.dirname, "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
