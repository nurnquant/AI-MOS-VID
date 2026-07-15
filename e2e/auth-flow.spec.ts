/**
 * AUTH-003 e2e: anonymous requests are rejected, registration with a
 * workspace works, and signing out cuts access off again.
 */
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const run = randomUUID().slice(0, 8);

test("anonymous asset API requests get 401", async ({ request }) => {
  const list = await request.get("/api/assets");
  expect(list.status()).toBe(401);
  const upload = await request.post("/api/assets/upload", { multipart: { x: "y" } });
  expect(upload.status()).toBe(401);
});

test("register → workspace → assets page; sign-out locks the app again", async ({ page }) => {
  await page.goto("/register");
  await page.getByPlaceholder("name", { exact: true }).fill("E2E Founder");
  await page.getByPlaceholder("email").fill(`founder-${run}@e2e.riwaq.dev`);
  await page.getByPlaceholder("password (min 10 chars)").fill(`e2e-pass-${run}-01`);
  await page.getByPlaceholder(/workspace name/).fill(`E2E Workspace ${run}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/assets");

  await expect(page.getByRole("heading", { name: "Assets" })).toBeVisible();
  await expect(page.getByText(`founder-${run}@e2e.riwaq.dev`)).toBeVisible();
  // Fresh workspace — empty asset list, not an auth error.
  await expect(page.getByText("No assets yet — upload one above.")).toBeVisible();

  // Members page shows the founder as owner.
  await page.goto("/members");
  await expect(page.getByRole("cell", { name: `founder-${run}@e2e.riwaq.dev` })).toBeVisible();
  await expect(page.getByRole("cell", { name: "owner", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
  const list = await page.request.get("/api/assets");
  expect(list.status()).toBe(401);
});
