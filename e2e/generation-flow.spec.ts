/**
 * GEN-006 e2e: approve a script in the UI, start a generation, and watch
 * the worker deliver the final video (open-video button appears).
 */
import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { LOCAL_ENV } from "./local-env";

const run = randomUUID().slice(0, 6);
let worker: ChildProcess;

test.beforeAll(() => {
  worker = spawn("node", ["src/index.ts"], {
    cwd: join(import.meta.dirname, "../apps/worker"),
    env: { ...process.env, ...LOCAL_ENV },
    stdio: "ignore",
  });
});

test.afterAll(() => {
  worker?.kill("SIGTERM");
});

test("approved script generates a final video end-to-end", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("owner@riwaq.dev");
  await page.getByPlaceholder("password").fill("riwaq-dev-owner-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/assets");

  // Create a generated script.
  await page.goto("/scripts");
  await page.getByPlaceholder("title").fill(`Gen ${run}`);
  await page.getByPlaceholder(/brief/).fill(`generation e2e ${run}`);
  await page.getByRole("button", { name: "Create script" }).click();
  await page.waitForURL("**/scripts/*");
  const scriptId = page.url().split("/").pop()!;

  // Shorten scenes to 2s via the API for a fast run.
  const detail = (await (await page.request.get(`/api/scripts/${scriptId}`)).json()) as {
    script: { scenes: { id: string }[] };
  };
  for (const scene of detail.script.scenes) {
    const patch = await page.request.patch(`/api/scripts/${scriptId}/scenes/${scene.id}`, {
      data: { durationTargetSeconds: 2 },
    });
    expect(patch.ok()).toBe(true);
  }

  // Approve.
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("approved", { exact: true })).toBeVisible();

  // Start generation and wait for the worker to deliver the final video.
  await page.getByRole("combobox").last().selectOption("tiktok");
  await page.getByRole("button", { name: "Start generation" }).click();
  await expect(page.getByRole("button", { name: "open video" })).toBeVisible({
    timeout: 180_000,
  });
  await expect(page.getByText("succeeded")).toBeVisible();
});
