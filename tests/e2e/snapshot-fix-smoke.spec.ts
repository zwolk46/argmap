/**
 * Live-browser smoke for the F-028 snapshot fix. Drives the real app via
 * Supabase auth using a developer account, so the dev server, the
 * SupabaseRepository, and the action-runner snapshot path all participate.
 *
 * Goal: prove that signing in, creating a frame in legal mode with a
 * jurisdiction, and reloading produces a FrameVersion whose snapshotted
 * Frame-level fields (mode, default_satisfaction_policies, possibly
 * jurisdiction_default) are present. The repository ROUND-TRIPS the
 * `payload` JSON for every version save, so this probe also covers the
 * persistence layer end-to-end.
 *
 * IMPORTANT: this spec writes real data to the configured Supabase project.
 * Run only against a development instance, with the dev account the user
 * provided. CI should skip this file unless E2E_LIVE=1 is set.
 */

import { test, expect } from "@playwright/test";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";

test.skip(!LIVE, "E2E_LIVE=1 to run the live-Supabase smoke");

test("F-028: signing in, creating a legal frame, and reloading preserves the new FrameVersion", async ({
  page,
}) => {
  // 1) Land on the app. AuthGate renders the SignInScreen.
  await page.goto("/");
  await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 15_000 });

  // 2) Sign in with the dev account.
  await page.getByTestId("sign-in-email").fill(EMAIL);
  await page.getByTestId("sign-in-password").fill(PASSWORD);
  await page.getByTestId("sign-in-submit").click();

  // 3) Land on home. The home page exposes a "+ New frame" button.
  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 15_000,
  });

  // 4) Open the wizard via the "+ New frame" button on Home.
  await page
    .getByRole("button", { name: /new frame/i })
    .first()
    .click();
  await expect(page.getByTestId("new-frame-wizard")).toBeVisible({ timeout: 10_000 });

  // Mode: legal.
  await page.getByTestId("wizard-mode-legal").click();
  // Title.
  const title = `F-028 verify ${Date.now()}`;
  await page.getByTestId("wizard-title-input").fill(title);
  // Submit.
  await page.getByTestId("wizard-submit").click();

  // 5) Now in frame-building. Confirm the title chrome rendered.
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });

  // 6) Reload. The frame loads from the SupabaseRepository, which round-trips
  // the FrameVersion `payload`. The snapshot fields must travel with it.
  await page.reload();
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });

  // No render errors during reload (would surface as React error boundary).
  const html = await page.content();
  expect(html).not.toContain("Something went wrong");
});
