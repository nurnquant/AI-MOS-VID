#!/usr/bin/env node
// Destructive: removes local containers AND volumes.
// Requires explicit confirmation flag: pnpm infra:reset -- --yes-destroy-data
import { execSync } from "node:child_process";

if (!process.argv.includes("--yes-destroy-data")) {
  console.error("REFUSED: this deletes all local PostgreSQL/Redis/MinIO data.");
  console.error("Run: pnpm infra:reset -- --yes-destroy-data");
  process.exit(1);
}

execSync("docker compose down --volumes", { stdio: "inherit" });
console.log("Local infrastructure reset complete (volumes removed).");
