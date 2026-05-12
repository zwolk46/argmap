import { test, expect } from "@playwright/test";

test("placeholder page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("placeholder-root")).toBeVisible();
  await expect(page.getByRole("heading", { name: "argmap" })).toBeVisible();
});
