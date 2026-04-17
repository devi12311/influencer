import { expect, test } from "@playwright/test";

test("signup and login flow reaches the protected shell", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `creator_${suffix}`;
  const email = `creator_${suffix}@example.com`;
  const password = "StrongerPass123";

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${username}`, "i") })).toBeVisible();

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Username").fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${username}`, "i") })).toBeVisible();

  await page.goto("/settings/connections");
  await expect(page.getByRole("heading", { name: /Connections/i })).toBeVisible();
  await expect(page.getByText(/No social accounts are connected yet/i)).toBeVisible();
});
