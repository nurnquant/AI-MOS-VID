/**
 * PROJECTS-012 e2e: create a project, create a script inside it via the
 * active-project selector, verify project isolation (the script is
 * visible under its project and absent under another).
 */
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const run = randomUUID().slice(0, 6);

test("project isolation: script created in project A stays in project A", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("owner@riwaq.dev");
  await page.getByPlaceholder("password").fill("riwaq-dev-owner-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/assets");

  // Create two projects.
  await page.goto("/projects");
  await page.getByPlaceholder("project name").fill(`Alpha ${run}`);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("row").filter({ hasText: `Alpha ${run}` })).toBeVisible();
  await page.getByPlaceholder("project name").fill(`Beta ${run}`);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("row").filter({ hasText: `Beta ${run}` })).toBeVisible();

  // Select Alpha as the active project. The selector snapshots the
  // project list at page mount — reload so the new projects appear.
  await page.reload();
  await page.getByLabel("Active project").selectOption({ label: `Alpha ${run}` });
  await page.waitForLoadState("load");

  // Create a script — lands in Alpha.
  await page.goto("/scripts");
  await page.getByPlaceholder("title").fill(`Scoped ${run}`);
  await page.getByPlaceholder(/brief/).fill("project isolation test");
  await page.getByRole("button", { name: "Create script" }).click();
  await page.waitForURL("**/scripts/*");

  // Visible under Alpha.
  await page.goto("/scripts");
  await expect(page.getByRole("row").filter({ hasText: `Scoped ${run}` })).toBeVisible();

  // Switch to Beta — the script disappears from the list.
  await page.getByLabel("Active project").selectOption({ label: `Beta ${run}` });
  await page.waitForLoadState("load");
  await page.goto("/scripts");
  await expect(page.getByRole("row").filter({ hasText: `Scoped ${run}` })).toHaveCount(0);

  // Projects page reflects the counts; Alpha is no longer deletable.
  await page.goto("/projects");
  const alphaRow = page.getByRole("row").filter({ hasText: `Alpha ${run}` });
  await expect(alphaRow.getByRole("button", { name: "delete" })).toHaveCount(0);
  const betaRow = page.getByRole("row").filter({ hasText: `Beta ${run}` });
  await expect(betaRow.getByRole("button", { name: "delete" })).toBeVisible();
});
