/**
 * Visual smoke for the Argmap-2 handoff migration. Signs in with the dev
 * account, opens an audit-labeled frame in legal mode, and captures
 * screenshots at four checkpoints so the new chrome can be reviewed
 * without a live browser.
 *
 * Outputs land under tests/audit/migration/ — kept out of the bundle.
 *
 * Run: E2E_LIVE=1 npx playwright test migration-visual-smoke
 * Skipped by default in CI so it doesn't write to live Supabase
 * unintentionally.
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";

const OUT_DIR = path.join(process.cwd(), "tests", "audit", "migration");
function shotPath(name: string): string {
  return path.join(OUT_DIR, name);
}

test.skip(!LIVE, "E2E_LIVE=1 to run the live-Supabase visual smoke");

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test("argmap-2 migration: sign-in, home, wizard, frame-building render correctly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1) Sign-in screen.
  await page.goto("/");
  await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: shotPath("01-sign-in.png"), fullPage: true });

  // 2) Sign in.
  await page.getByTestId("sign-in-email").fill(EMAIL);
  await page.getByTestId("sign-in-password").fill(PASSWORD);
  await page.getByTestId("sign-in-submit").click();

  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  // Let any list-rendering settle before the screenshot.
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotPath("02-home.png"), fullPage: true });

  // 3) New-frame wizard.
  await page
    .getByRole("button", { name: /new frame/i })
    .first()
    .click();
  await expect(page.getByTestId("new-frame-wizard")).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: shotPath("03-new-frame-wizard.png"), fullPage: true });

  await page.getByTestId("wizard-mode-legal").click();
  const title = `Argmap-2 migration smoke ${Date.now()}`;
  await page.getByTestId("wizard-title-input").fill(title);
  await page.getByTestId("wizard-submit").click();

  // 4) Frame-building landing — confirm whole-node treatment renders.
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
  // The newly created frame seeds a RootQuestion + Conclusion + LogicalGate;
  // wait briefly for the canvas to draw them and stabilize.
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath("04-frame-building-landing.png"), fullPage: true });

  // 5) Open a pre-existing tutorial frame to capture the canvas-node
  // whole-node treatment on a populated canvas (the freshly-minted frame
  // is empty until the user drops the first RootQuestion in).
  await page.goto("/");
  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  const tutorialCard = page
    .getByTestId("frame-summary-card")
    .filter({ hasText: /Palsgraf/i })
    .first();
  if (await tutorialCard.isVisible().catch(() => false)) {
    await tutorialCard.click();
    // The canvas needs a beat to render React Flow nodes + edges.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shotPath("05-frame-building-populated.png"), fullPage: true });
  }

  // No render errors during the walk (would surface as React error boundary).
  const html = await page.content();
  expect(html).not.toContain("Something went wrong");
});
