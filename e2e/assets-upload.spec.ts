/**
 * Upload-and-see-status flow (AIVS-FOUNDATION-002 gate 6): uploads a real
 * fixture video through the UI and watches it travel the pipeline to
 * `ready`. Spawns the worker so validation and media jobs actually run.
 */
import { execFile, type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { LOCAL_ENV } from "./local-env";

const execFileAsync = promisify(execFile);

let workDir: string;
let fixturePath: string;
let worker: ChildProcess;

test.beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), "aivs-e2e-"));
  fixturePath = join(workDir, "e2e-fixture.mp4");
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=25:duration=2",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t",
    "2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
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

test("uploading a video shows it progressing to ready on the assets page", async ({ page }) => {
  // AUTH-003: asset APIs require a session — sign in as the seeded dev owner.
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("owner@riwaq.dev");
  await page.getByPlaceholder("password").fill("riwaq-dev-owner-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/assets");
  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();

  await page.setInputFiles('input[type="file"]', fixturePath);
  await page.getByRole("button", { name: "Upload" }).click();

  const row = page.getByRole("row").filter({ hasText: "e2e-fixture.mp4" }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  // The page polls every 2s; the worker validates, promotes, and thumbnails.
  await expect(row.getByText("ready", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(row.getByText(/original/)).toBeVisible({ timeout: 30_000 });
});
