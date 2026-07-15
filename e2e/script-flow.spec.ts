/**
 * CONTENT-005 e2e: create a script generated from a brief, edit a scene,
 * submit, approve — through the real UI. No worker needed (no queue jobs).
 */
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const run = randomUUID().slice(0, 6);

test("script lifecycle: generate → edit → submit → approve", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("owner@riwaq.dev");
  await page.getByPlaceholder("password").fill("riwaq-dev-owner-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/assets");

  // Create with mock generation.
  await page.goto("/scripts");
  await page.getByPlaceholder("title").fill(`Honesty ${run}`);
  await page.getByPlaceholder(/brief/).fill("the importance of honesty");
  await page.getByRole("button", { name: "Create script" }).click();
  await page.waitForURL("**/scripts/*");

  // Generated scenes are present and editable.
  const narrations = page.locator("textarea");
  await expect(narrations.first()).toBeVisible();
  const sceneCount = await page.getByRole("row").count();
  expect(sceneCount).toBeGreaterThan(2);

  await narrations.first().fill(`Welcome to our lesson (${run})!`);
  await narrations.first().blur();

  // Submit → in_review (edit controls disappear).
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("in_review")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add scene" })).toHaveCount(0);

  // Approve (owner is admin+).
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("approved", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);

  // Edited narration survived the lifecycle.
  await expect(narrations.first()).toHaveValue(`Welcome to our lesson (${run})!`);

  // List shows approved badge.
  await page.goto("/scripts");
  const row = page.getByRole("row").filter({ hasText: `Honesty ${run}` });
  await expect(row.getByText("approved")).toBeVisible();
});

test("arabic scripts render RTL narration", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("owner@riwaq.dev");
  await page.getByPlaceholder("password").fill("riwaq-dev-owner-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/assets");

  await page.goto("/scripts");
  await page.getByPlaceholder("title").fill(`بر الوالدين ${run}`);
  await page.getByPlaceholder(/brief/).fill("بر الوالدين");
  await page.getByRole("main").locator("select").selectOption("ar");
  await page.getByRole("button", { name: "Create script" }).click();
  await page.waitForURL("**/scripts/*");

  const narration = page.locator("textarea").first();
  await expect(narration).toBeVisible();
  await expect(narration).toHaveAttribute("dir", "rtl");
  await expect(narration).toHaveValue(/[؀-ۿ]/);
});
