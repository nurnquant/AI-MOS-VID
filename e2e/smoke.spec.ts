import { expect, test } from "@playwright/test";

test("home page renders the environment foundation shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AIVS Studio/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Environment Status", exact: true })).toBeVisible();
});

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("studio-web");
});
