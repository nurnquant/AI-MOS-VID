/**
 * CONSENT-004 e2e: reviewer records consent, uploads minor-flagged media
 * with it (reaches ready), then revokes — the linked asset is hard-deleted
 * and disappears. Spawns the worker for validation + enforcement.
 */
import { execFile, type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { LOCAL_ENV } from "./local-env";

const execFileAsync = promisify(execFile);
const run = randomUUID().slice(0, 6);

let workDir: string;
let fixturePath: string;
let worker: ChildProcess;

test.beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "aivs-consent-e2e-"));
  fixturePath = join(workDir, `minor-${run}.mp4`);
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=320x180:rate=25:duration=1",
    "-t",
    "1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    fixturePath,
  ]);
  worker = spawn("node", ["src/index.ts"], {
    cwd: join(import.meta.dirname, "../apps/worker"),
    env: { ...process.env, ...LOCAL_ENV },
    stdio: "ignore",
  });
});

test.afterAll(async () => {
  worker?.kill("SIGTERM");
  await rm(workDir, { recursive: true, force: true });
});

test("consent lifecycle: record → upload minor media → ready → revoke → deleted", async ({
  page,
}) => {
  // Dev owner has the owner role (≥ child_media_reviewer).
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("owner@riwaq.dev");
  await page.getByPlaceholder("password").fill("riwaq-dev-owner-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/assets");

  // Record a consent.
  await page.goto("/consents");
  await page.getByPlaceholder("subject (minimal identifier)").fill(`e2e-subject-${run}`);
  await page.getByPlaceholder("guardian name").fill("E2E Guardian");
  const nextYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(nextYear);
  await page.getByRole("button", { name: "Record consent" }).click();
  const consentRow = page.getByRole("row").filter({ hasText: `e2e-subject-${run}` });
  await expect(consentRow.getByText("active")).toBeVisible();

  // Upload minor-flagged media with that consent.
  await page.goto("/assets");
  await page.setInputFiles('input[type="file"]', fixturePath);
  await page.getByText("features a minor").click();
  await page
    .getByRole("main")
    .locator("select")
    .selectOption({ label: `consent: e2e-subject-${run}` });
  await page.getByRole("button", { name: "Upload" }).click();

  const assetRow = page
    .getByRole("row")
    .filter({ hasText: `minor-${run}.mp4` })
    .first();
  await expect(assetRow).toBeVisible({ timeout: 15_000 });
  await expect(assetRow.getByText("ready", { exact: true })).toBeVisible({ timeout: 60_000 });

  // Revoke — irreversible deletion of the linked asset.
  await page.goto("/consents");
  page.once("dialog", (dialog) => void dialog.accept("guardian requested deletion"));
  await page
    .getByRole("row")
    .filter({ hasText: `e2e-subject-${run}` })
    .getByRole("button", { name: "revoke" })
    .click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: `e2e-subject-${run}` })
      .getByText("revoked"),
  ).toBeVisible({ timeout: 15_000 });

  // Asset hard-deleted by the enforcement worker.
  await page.goto("/assets");
  await expect(page.getByRole("row").filter({ hasText: `minor-${run}.mp4` })).toHaveCount(0, {
    timeout: 30_000,
  });
});
