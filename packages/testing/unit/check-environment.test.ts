import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const script = resolve(repoRoot, "scripts/check-environment.ts");

function runCheck(env: NodeJS.ProcessEnv): { code: number; out: string } {
  try {
    const out = execFileSync("node", [script], {
      env: { ...process.env, ...env },
      encoding: "utf8",
    });
    return { code: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("check-environment script (unit)", () => {
  it("fails with actionable instructions when required env vars are missing", () => {
    const { code, out } = runCheck({
      DATABASE_URL: "",
      REDIS_URL: "",
      S3_ENDPOINT: "",
      S3_BUCKET: "",
    });
    expect(code).toBe(1);
    expect(out).toContain("env DATABASE_URL");
    expect(out).toContain("fix:");
  });

  it("reports tool versions for installed tools", () => {
    const { out } = runCheck({
      DATABASE_URL: "postgresql://aivs:aivs_local@localhost:5432/aivs",
      REDIS_URL: "redis://localhost:6379",
      S3_ENDPOINT: "http://localhost:9000",
      S3_BUCKET: "aivs-assets",
    });
    expect(out).toContain("pnpm");
    expect(out).toContain("FFmpeg");
  });
});
