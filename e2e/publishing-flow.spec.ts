/**
 * PUB-008 e2e: upload a video to ready, create a publication, submit,
 * final-approve, and watch the worker mock-publish it (external id shown).
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
  workDir = await mkdtemp(join(tmpdir(), "aivs-pub-e2e-"));
  fixturePath = join(workDir, `pub-${run}.mp4`);
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x180:rate=25:duration=1",
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

test("publish flow: ready video → review → approve → mock published", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("owner@riwaq.dev");
  await page.getByPlaceholder("password").fill("riwaq-dev-owner-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/assets");

  // Upload and wait for ready.
  await page.setInputFiles('input[type="file"]', fixturePath);
  await page.getByRole("button", { name: "Upload" }).click();
  const assetRow = page
    .getByRole("row")
    .filter({ hasText: `pub-${run}.mp4` })
    .first();
  await expect(assetRow.getByText("ready", { exact: true })).toBeVisible({ timeout: 60_000 });

  // Create publication.
  await page.goto("/publications");
  await page
    .getByRole("main")
    .locator("select")
    .first()
    .selectOption({ label: `pub-${run}.mp4` });
  await page.getByPlaceholder("caption").fill(`E2E publish ${run}`);
  await page.getByRole("button", { name: "Create" }).click();

  const row = page.getByRole("row").filter({ hasText: `E2E publish ${run}` });
  await expect(row.getByText("draft")).toBeVisible({ timeout: 10_000 });

  // Submit → in_review → final approve (owner = admin+).
  await row.getByRole("button", { name: "submit" }).click();
  await expect(row.getByText("in_review")).toBeVisible({ timeout: 10_000 });
  await row.getByRole("button", { name: "final ✓" }).click();

  // Worker mock-publishes; external id appears.
  await expect(row.getByText("published", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(row.getByText(/mock-youtube-/)).toBeVisible();
});
