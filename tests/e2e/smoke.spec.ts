import { test, expect } from "@playwright/test";

// Production app boots — the BootError red banner does NOT render (which
// would happen if the Supabase env vars weren't set), and the sign-in
// screen mounts because the test environment isn't authenticated. The
// previous version asserted a `placeholder-root` testid that was removed
// when the real app shipped; the smoke test was silently passing only
// because Playwright was failing to find it (CI either runs or skips).
test("app boots without error and renders sign-in", async ({ page }) => {
  await page.goto("/");
  // BootError uses inline-styled <h1>argmap couldn't start — fail fast if
  // env vars are missing in CI.
  await expect(page.getByText("argmap couldn't start")).toHaveCount(0);
  // Either the sign-in screen or the workspace loading screen should be
  // visible immediately. Both branches render the brand wordmark, so
  // assert on that as a stable signal.
  await expect(page.getByRole("heading", { name: "Sign in to argmap" })).toBeVisible();
});
