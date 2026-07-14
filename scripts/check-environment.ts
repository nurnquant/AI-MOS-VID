#!/usr/bin/env node
/**
 * AIVS environment verification.
 * Verifies runtimes, CLI tools, required env vars, and local service ports.
 * Exits non-zero with actionable instructions on any failure.
 */
import { execSync } from "node:child_process";
import { createConnection } from "node:net";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Check = { name: string; ok: boolean; detail: string; fix?: string };
const checks: Check[] = [];

function cmd(command: string): string | null {
  try {
    return execSync(command, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function checkTool(name: string, command: string, fix: string) {
  const out = cmd(command);
  checks.push({
    name,
    ok: out !== null,
    detail: out?.split("\n")[0] ?? "not found",
    fix,
  });
}

function checkPort(name: string, port: number, fix: string): Promise<void> {
  return new Promise((done) => {
    const socket = createConnection({ host: "127.0.0.1", port, timeout: 1500 });
    const finish = (ok: boolean) => {
      socket.destroy();
      checks.push({
        name,
        ok,
        detail: ok ? `port ${port} open` : `port ${port} unreachable`,
        fix,
      });
      done();
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

async function main() {
  // Node version vs .nvmrc
  const pinned = readFileSync(resolve(import.meta.dirname, "../.nvmrc"), "utf8").trim();
  const nodeMajor = process.versions.node.split(".")[0];
  checks.push({
    name: "Node.js",
    ok: nodeMajor === pinned.split(".")[0],
    detail: `running ${process.versions.node}, pinned ${pinned}`,
    fix: `Install Node ${pinned} (nvm install ${pinned})`,
  });

  checkTool("pnpm", "pnpm --version", "npm install -g pnpm");
  checkTool("git", "git --version", "xcode-select --install or brew install git");
  checkTool("Docker", "docker --version", "brew install colima docker && colima start");
  checkTool(
    "Docker Compose",
    "docker compose version",
    "brew install docker-compose (see ADR-AIVS-001)",
  );
  checkTool("Docker daemon", "docker info --format '{{.ServerVersion}}'", "colima start");
  checkTool("FFmpeg", "ffmpeg -version", "brew install ffmpeg");
  checkTool("ffprobe", "ffprobe -version", "brew install ffmpeg");

  // Required env vars (from .env or shell). Only presence is checked.
  const requiredEnv = ["DATABASE_URL", "REDIS_URL", "S3_ENDPOINT", "S3_BUCKET"];
  for (const key of requiredEnv) {
    checks.push({
      name: `env ${key}`,
      ok: Boolean(process.env[key]),
      detail: process.env[key] ? "set" : "missing",
      fix: `Copy .env.example to .env and fill ${key}`,
    });
  }

  // Local service ports
  await checkPort("PostgreSQL", Number(process.env.POSTGRES_PORT ?? 5433), "pnpm infra:up");
  await checkPort("Redis", Number(process.env.REDIS_PORT ?? 6380), "pnpm infra:up");
  await checkPort("MinIO", Number(process.env.MINIO_PORT ?? 9000), "pnpm infra:up");

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "✅" : "❌";
    console.log(`${mark} ${c.name.padEnd(18)} ${c.detail}`);
    if (!c.ok) {
      failed++;
      if (c.fix) console.log(`   ↳ fix: ${c.fix}`);
    }
  }

  if (failed > 0) {
    console.error(`\nFAIL: ${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nPASS: environment ready.");
}

main();
