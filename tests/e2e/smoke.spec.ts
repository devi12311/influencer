import { expect, test } from "@playwright/test";

test("homepage renders the foundation headline", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /AI Influencer workspace foundation/i })).toBeVisible();
});
