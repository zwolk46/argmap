/**
 * AUDIT — ONBOARDING + DETERMINISM/PERSISTENCE
 *
 * Sub-agent walkthrough invoked by the multi-agent audit. Drives the live
 * UI in two parts:
 *
 *   Part A — ONBOARDING
 *     A1. First-launch wizard (Legal / General + Flavor + Title/Description)
 *     A2. Coachmark sequence + persistence-of-dismissal
 *     A3. Glossary tooltip (hover, keyboard, Escape)
 *     A4. Help pane + Reset-coachmarks button
 *     A5. Tutorial tour (react-joyride)
 *
 *   Part B — DETERMINISM + PERSISTENCE
 *     B1. Reload mid-session — frame_version byte-equivalent across reload
 *     B2. Two tabs / BroadcastChannel propagation
 *     B3. Last-write-wins across two tabs
 *     B4. Mid-session save flush on tab close (pagehide + visibilitychange)
 *     B5. Milestone snapshot byte-equivalence
 *
 * All findings are written to the test log and saved as screenshots / JSON
 * dumps under tests/audit/onboarding/ and tests/audit/determinism/.
 *
 * Run: E2E_LIVE=1 npx playwright test \
 *        tests/e2e/audit-onboarding-determinism.spec.ts \
 *        --headed --workers=1
 *
 * Frame titles are prefixed "Agent Audit OB —" or "Agent Audit Det —" so
 * they're unambiguously identifiable on Home.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";

test.skip(!LIVE, "E2E_LIVE=1 to run the live-Supabase audit walkthrough");
test.setTimeout(20 * 60_000);

// ---------------------------------------------------------------------------
// Output dirs / helpers
// ---------------------------------------------------------------------------

const ONBOARDING_DIR = path.resolve(process.cwd(), "tests", "audit", "onboarding");
const DETERMINISM_DIR = path.resolve(process.cwd(), "tests", "audit", "determinism");
fs.mkdirSync(ONBOARDING_DIR, { recursive: true });
fs.mkdirSync(DETERMINISM_DIR, { recursive: true });

let ONBOARDING_COUNTER = 0;
async function shotOnboarding(page: Page, label: string): Promise<void> {
  ONBOARDING_COUNTER += 1;
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const file = path.join(
    ONBOARDING_DIR,
    `${String(ONBOARDING_COUNTER).padStart(2, "0")}-${safe}.png`,
  );
  await page.screenshot({ path: file, fullPage: true });
}

let DET_COUNTER = 0;
async function shotDet(page: Page, label: string): Promise<void> {
  DET_COUNTER += 1;
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const file = path.join(
    DETERMINISM_DIR,
    `${String(DET_COUNTER).padStart(2, "0")}-${safe}.png`,
  );
  await page.screenshot({ path: file, fullPage: true });
}

function saveJson(dir: string, name: string, value: unknown): string {
  const file = path.join(dir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(value, deepSortReplacer(), 2));
  return file;
}

// Deep-sort keys so JSON.stringify is order-stable (object property order
// in JS is insertion-order but we want a canonical comparison).
function deepSortReplacer(): (k: string, v: unknown) => unknown {
  return (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      return Object.keys(o)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = o[k];
          return acc;
        }, {});
    }
    return v;
  };
}

function canonical(v: unknown): string {
  return JSON.stringify(v, deepSortReplacer());
}

// ---------------------------------------------------------------------------
// Sign-in + helpers
// ---------------------------------------------------------------------------

async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("sign-in-email").fill(EMAIL);
  await page.getByTestId("sign-in-password").fill(PASSWORD);
  await page.getByTestId("sign-in-submit").click();
  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const w = window as unknown as { __argmap_test?: unknown };
          return Boolean(w.__argmap_test);
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
}

interface FrameSnapshot {
  frame: { id: string; current_version_id: string; title: string } | null;
  frame_version: {
    id: string;
    version_number: number;
    is_milestone: boolean;
    nodes: ReadonlyArray<Record<string, unknown>>;
    edges: ReadonlyArray<Record<string, unknown>>;
  } | null;
  validation_count: number;
}

async function readFrameSnapshot(page: Page): Promise<FrameSnapshot> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): unknown } };
    };
    const s = w.__argmap_test?.frame_store?.getState() as
      | {
          frame: {
            id: string;
            current_version_id: string;
            title: string;
          } | null;
          frame_version: {
            id: string;
            version_number: number;
            is_milestone: boolean;
            nodes: ReadonlyArray<Record<string, unknown>>;
            edges: ReadonlyArray<Record<string, unknown>>;
          } | null;
          validation: ReadonlyArray<{ severity: string }>;
        }
      | undefined;
    // Be tolerant during route transitions / sign-in: return an
    // "empty" snapshot rather than throwing so callers can poll.
    if (!s) {
      return {
        frame: null,
        frame_version: null,
        validation_count: 0,
      };
    }
    return {
      frame: s.frame
        ? {
            id: s.frame.id,
            current_version_id: s.frame.current_version_id,
            title: s.frame.title,
          }
        : null,
      frame_version: s.frame_version
        ? {
            id: s.frame_version.id,
            version_number: s.frame_version.version_number,
            is_milestone: s.frame_version.is_milestone,
            nodes: s.frame_version.nodes,
            edges: s.frame_version.edges,
          }
        : null,
      validation_count: s.validation.length,
    };
  });
}

// Strip volatile fields that legitimately change across reload but don't
// affect determinism semantics (the frame_version row id may differ if a
// post-load operation creates a new row).
function frameVersionCore(snap: FrameSnapshot): Record<string, unknown> {
  if (!snap.frame_version) return {};
  return {
    nodes: snap.frame_version.nodes,
    edges: snap.frame_version.edges,
  };
}

async function paletteAdd(page: Page, label: string): Promise<string> {
  const beforeIds = new Set(
    (await readFrameSnapshot(page)).frame_version?.nodes.map((n) => (n as { id: string }).id) ?? [],
  );
  await page.getByRole("button", { name: label, exact: true }).first().click();
  let freshId: string | null = null;
  await expect
    .poll(
      async () => {
        const after = await readFrameSnapshot(page);
        const fresh = after.frame_version?.nodes.find(
          (n) => !beforeIds.has((n as { id: string }).id),
        );
        if (fresh) {
          freshId = (fresh as { id: string }).id;
          return true;
        }
        return false;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
  if (!freshId) throw new Error(`paletteAdd(${label}) failed`);
  return freshId;
}

async function resetCoachmarks(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: {
        app_state_store?: {
          getState(): { resetCoachmarks?: () => void };
        };
      };
    };
    const store = w.__argmap_test?.app_state_store;
    const reset = store?.getState().resetCoachmarks;
    if (!reset) return false;
    reset();
    return true;
  });
}

async function readCoachmarkDismissals(
  page: Page,
): Promise<Record<string, boolean>> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: {
        app_state_store?: {
          getState(): { app_state?: { coachmark_dismissals?: Record<string, boolean> } };
        };
      };
    };
    return (
      w.__argmap_test?.app_state_store?.getState().app_state?.coachmark_dismissals ?? {}
    );
  });
}

// ---------------------------------------------------------------------------
// PART A — ONBOARDING
// ---------------------------------------------------------------------------

test("audit onboarding — wizard, coachmarks, help pane, tutorial", async ({
  page,
}) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  const findings: string[] = [];

  await test.step("A0 — sign in + reset coachmarks", async () => {
    await signIn(page);
    const reset_ok = await resetCoachmarks(page);
    if (!reset_ok) {
      findings.push(
        "A-FINDING (A): app_state_store.resetCoachmarks() not exposed via __argmap_test — coachmark reset unverifiable from test harness.",
      );
    } else {
      findings.push(
        "A-OK: app_state_store.resetCoachmarks() exists and was invoked from test harness.",
      );
    }
    await shotOnboarding(page, "home-after-signin");
  });

  // ---------------- A1 — Wizard ----------------
  const TS = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
  const OB_TITLE_LEGAL = `Agent Audit OB — Legal Wizard ${TS}`;
  const OB_TITLE_GENERAL = `Agent Audit OB — General Academic ${TS}`;

  await test.step("A1.1 — open wizard from Home (no auto-launch on returning user)", async () => {
    // The wizard does NOT auto-launch — Home only opens it on click. Document
    // this is the actual observed behavior (spec mentioned auto-launch as
    // possible, but the implementation gates on the New-frame button only).
    const wizard_already_open = await page
      .getByTestId("new-frame-wizard")
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (wizard_already_open) {
      findings.push("A-NOTE: wizard auto-launched on home for this user.");
    } else {
      findings.push(
        "A-NOTE: wizard does NOT auto-launch; opened via 'New frame' Home button (returning user / known account).",
      );
    }
    await page.getByRole("button", { name: /new frame/i }).first().click();
    await expect(page.getByTestId("new-frame-wizard")).toBeVisible();
    await shotOnboarding(page, "wizard-opened");
  });

  await test.step("A1.2 — wizard Cancel produces no frame", async () => {
    const before = await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test?: { app_state_store?: { getState(): { frames: unknown[] } } };
      };
      return w.__argmap_test?.app_state_store?.getState().frames.length ?? -1;
    });
    await page.getByTestId("wizard-cancel").click();
    await expect(page.getByTestId("new-frame-wizard")).toBeHidden({ timeout: 3_000 });
    const after = await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test?: { app_state_store?: { getState(): { frames: unknown[] } } };
      };
      return w.__argmap_test?.app_state_store?.getState().frames.length ?? -1;
    });
    if (before === after) {
      findings.push("A-OK: wizard Cancel did not create a frame.");
    } else {
      findings.push(
        `A-FINDING (A): wizard Cancel produced frame-list delta (${before} -> ${after}).`,
      );
    }
    await shotOnboarding(page, "wizard-cancel-no-frame");
  });

  await test.step("A1.3 — wizard Legal mode + title + submit", async () => {
    await page.getByRole("button", { name: /new frame/i }).first().click();
    await expect(page.getByTestId("new-frame-wizard")).toBeVisible();

    // Verify Legal / General testids exist.
    await expect(page.getByTestId("wizard-mode-legal")).toBeVisible();
    await expect(page.getByTestId("wizard-mode-general")).toBeVisible();
    await page.getByTestId("wizard-mode-legal").click();

    // Legal mode: no jurisdiction step in this implementation. Document.
    const has_jurisdiction = await page
      .getByText(/jurisdiction/i)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (!has_jurisdiction) {
      findings.push(
        "A-FINDING (B): wizard has no jurisdiction step for Legal mode (spec mentions it, but new-frame-wizard.tsx ships only Mode/Flavor/Details).",
      );
    }
    // Same for template pick.
    const has_template = await page
      .getByText(/template/i)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (!has_template) {
      findings.push(
        "A-FINDING (B): wizard has no template-pick step (deferred to v1.5 per new-frame-wizard.tsx comment).",
      );
    }

    await page.getByTestId("wizard-title-input").fill(OB_TITLE_LEGAL);
    await page
      .getByTestId("wizard-description-input")
      .fill("Audit-onboarding: verify legal-mode wizard end-to-end.");
    await shotOnboarding(page, "wizard-legal-filled");
    await page.getByTestId("wizard-submit").click();
    await expect(page.locator("body")).toContainText(OB_TITLE_LEGAL, { timeout: 15_000 });
    findings.push("A-OK: wizard Legal mode created a frame and routed to frame-building.");
    await shotOnboarding(page, "frame-building-after-legal-submit");
  });

  await test.step("A1.4 — wizard General + Academic flavor", async () => {
    await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test?: { app_state_store?: { getState(): { app_state: unknown } } };
      };
      return w;
    });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /new frame/i }).first().click();
    await expect(page.getByTestId("new-frame-wizard")).toBeVisible();

    await page.getByTestId("wizard-mode-general").click();
    // Flavor step should appear.
    await expect(page.getByTestId("wizard-flavor-personal")).toBeVisible();
    await expect(page.getByTestId("wizard-flavor-academic")).toBeVisible();
    await page.getByTestId("wizard-flavor-academic").click();

    await page.getByTestId("wizard-title-input").fill(OB_TITLE_GENERAL);
    await shotOnboarding(page, "wizard-general-flavor");

    // Verify Cancel button still works on this branch.
    await page.getByTestId("wizard-submit").click();
    await expect(page.locator("body")).toContainText(OB_TITLE_GENERAL, { timeout: 15_000 });
    findings.push("A-OK: wizard General + Academic flavor flow completed.");
    await shotOnboarding(page, "frame-building-after-general-submit");
  });

  // ---------------- A2 — Coachmarks ----------------
  await test.step("A2 — coachmark sequence + persistence", async () => {
    // After A1.4, we're on the General/Academic frame. Reset coachmarks then
    // look for any rendered coachmark element.
    await resetCoachmarks(page);
    await page.waitForTimeout(500);
    const dismissals_before = await readCoachmarkDismissals(page);
    findings.push(
      `A-NOTE: after reset, coachmark_dismissals = ${JSON.stringify(dismissals_before)} (expected empty).`,
    );

    const coachmark_visible = await page
      .getByTestId("coachmark")
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    if (coachmark_visible) {
      await shotOnboarding(page, "coachmark-rendered");
      // Dismiss it and verify it doesn't re-appear after reload.
      await page.getByTestId("coachmark-dismiss").first().click();
      await page.waitForTimeout(300);
      const dismissals_after = await readCoachmarkDismissals(page);
      findings.push(
        `A-OK: coachmark visible + dismissable. Post-dismiss dismissals: ${JSON.stringify(dismissals_after)}.`,
      );
      await page.reload();
      await page.waitForTimeout(1_000);
      const still_present = await page
        .getByTestId("coachmark")
        .first()
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      if (still_present) {
        findings.push(
          "A-FINDING (A): coachmark re-appeared after reload (dismissal not persisting).",
        );
      } else {
        findings.push("A-OK: coachmark dismissal persisted across reload.");
      }
    } else {
      // The codebase exports <Coachmark> and useCoachmark, but a grep across
      // src/ui shows no component actually mounts a Coachmark today.
      findings.push(
        "A-FINDING (B): no [data-testid=\"coachmark\"] rendered after reset+nav. " +
          "useCoachmark / <Coachmark> are exported but never mounted in any pane " +
          "(verified by grep across src/ui — only registry + hook exist). " +
          "The spec's coachmark anchors (options_box, Term linked-to, switch-to-argument, " +
          "premise-kind, interpretation-direction) are NOT wired in this build.",
      );
      await shotOnboarding(page, "no-coachmark-after-reset");
    }
  });

  // ---------------- A3 — Glossary tooltip ----------------
  await test.step("A3 — glossary tooltip hover + keyboard + Escape", async () => {
    // The GlossaryTooltip is the standard mechanism. Grep shows it's exported
    // and used in primitives; verify by hovering a known glossary anchor if
    // any are mounted in the current frame-building view.
    const has_glossary_anchor = await page
      .locator("[data-glossary-term], [aria-describedby*='glossary']")
      .first()
      .count();
    if (has_glossary_anchor === 0) {
      findings.push(
        "A-FINDING (B): no [data-glossary-term] / glossary-anchored elements found in current view; " +
          "GlossaryTooltip is shipped but may not be applied to inspector / node-card surfaces yet. " +
          "Hover-tooltip behavior unverifiable via UI in current build.",
      );
      await shotOnboarding(page, "glossary-no-anchor");
    } else {
      const anchor = page
        .locator("[data-glossary-term], [aria-describedby*='glossary']")
        .first();
      await anchor.hover();
      await page.waitForTimeout(300);
      await shotOnboarding(page, "glossary-tooltip-hover");
      await page.keyboard.press("Tab");
      await shotOnboarding(page, "glossary-tooltip-keyboard");
      await page.keyboard.press("Escape");
      findings.push("A-OK: glossary anchor found, hover + Tab + Escape exercised.");
    }
  });

  // ---------------- A4 — Help pane ----------------
  await test.step("A4 — help pane open + Reset coachmarks", async () => {
    const help_btn = page.getByRole("button", { name: /help and glossary/i }).first();
    const help_visible = await help_btn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!help_visible) {
      findings.push(
        "A-FINDING (A): no Help button (aria-label 'Help and glossary') found in top bar; " +
          "help-glossary-pane cannot be opened from UI on this surface.",
      );
      await shotOnboarding(page, "help-pane-button-missing");
    } else {
      await help_btn.click();
      await page.waitForTimeout(400);
      await shotOnboarding(page, "help-pane-open");
      const reset_btn = page.getByTestId("reset-coachmarks-button");
      const reset_visible = await reset_btn.isVisible({ timeout: 1_500 }).catch(() => false);
      if (!reset_visible) {
        findings.push(
          "A-FINDING (A): Help pane opened but reset-coachmarks-button not visible.",
        );
      } else {
        findings.push("A-OK: Help pane shows 'Onboarding' section with Reset coachmarks.");
        // Pre-set a fake dismissal so reset has something to clear.
        await page.evaluate(() => {
          const w = window as unknown as {
            __argmap_test?: {
              app_state_store?: {
                getState(): { dismissCoachmark: (id: string) => void };
              };
            };
          };
          w.__argmap_test?.app_state_store?.getState().dismissCoachmark("welcome_screen");
        });
        const before = await readCoachmarkDismissals(page);
        await reset_btn.click();
        // ConfirmDialog: click "Reset".
        await page.waitForTimeout(300);
        await page
          .getByRole("button", { name: /^reset$/i })
          .first()
          .click()
          .catch(() => {});
        await page.waitForTimeout(500);
        const after = await readCoachmarkDismissals(page);
        findings.push(
          `A-OK: Reset coachmarks clicked. Before=${JSON.stringify(before)}, After=${JSON.stringify(after)}.`,
        );
        await shotOnboarding(page, "help-pane-after-reset");
      }
      // Close drawer.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  });

  // ---------------- A5 — Tutorial tour ----------------
  await test.step("A5 — tutorial launch + drive a step", async () => {
    await page.goto("/");
    await expect(page.getByTestId("home-start-tutorial")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("home-start-tutorial").click();
    // Tutorial loads + navigates to argument-running with phase=short.
    await page.waitForTimeout(4_000);
    await shotOnboarding(page, "tutorial-launched");
    // react-joyride renders a tooltip; we look for any joyride DOM marker.
    const joyride_visible = await page
      .locator(".react-joyride__tooltip, [data-test-id='button-primary']")
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (joyride_visible) {
      findings.push("A-OK: react-joyride tutorial tooltip rendered after launching tutorial.");
      // Click Next a few times.
      for (let i = 0; i < 3; i += 1) {
        const next = page.locator("[data-test-id='button-primary'], button:has-text('Next')").first();
        const can_click = await next.isVisible({ timeout: 1_500 }).catch(() => false);
        if (!can_click) break;
        await next.click().catch(() => {});
        await page.waitForTimeout(600);
      }
      await shotOnboarding(page, "tutorial-after-several-steps");
      // Try Skip if visible (opt-out path).
      const skip = page.locator("button:has-text('Skip')").first();
      const can_skip = await skip.isVisible({ timeout: 1_000 }).catch(() => false);
      if (can_skip) {
        await skip.click().catch(() => {});
        findings.push("A-OK: tutorial Skip button is available (opt-out path).");
      }
    } else {
      findings.push(
        "A-FINDING (B): tutorial launched but no react-joyride tooltip surfaced within 5s. " +
          "May require Palsgraf tutorial role-map to be present, or argument-running mount lag.",
      );
    }
  });

  // ---------------- Write findings ----------------
  fs.writeFileSync(
    path.join(ONBOARDING_DIR, "findings.md"),
    "# Onboarding audit findings\n\n" + findings.map((f) => `- ${f}`).join("\n") + "\n",
  );
  console.log("[onboarding] findings:");
  for (const f of findings) console.log("  -", f);
});

// ---------------------------------------------------------------------------
// PART B — DETERMINISM + PERSISTENCE
// ---------------------------------------------------------------------------

async function createFrameViaWizard(page: Page, title: string): Promise<string> {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /new frame/i }).first().click();
  await expect(page.getByTestId("new-frame-wizard")).toBeVisible();
  await page.getByTestId("wizard-mode-general").click();
  await page.getByTestId("wizard-flavor-academic").click();
  await page.getByTestId("wizard-title-input").fill(title);
  await page.getByTestId("wizard-submit").click();
  await expect(page.locator("body")).toContainText(title, { timeout: 15_000 });
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const w = window as unknown as { __argmap_test?: unknown };
          return Boolean(w.__argmap_test);
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
  // Wait for frame to settle in store.
  await expect
    .poll(async () => (await readFrameSnapshot(page)).frame !== null, { timeout: 8_000 })
    .toBe(true);
  const snap = await readFrameSnapshot(page);
  return snap.frame!.id;
}

test("audit determinism — reload, two-tab, last-write-wins, pagehide, milestone", async ({
  browser,
}) => {
  const context: BrowserContext = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  const findings: string[] = [];
  const TS = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

  // ---------------- B1 — Reload mid-session ----------------
  let frame_id_reload: string | null = null;
  await test.step("B1 — reload preserves frame_version byte-equivalent", async () => {
    await signIn(page);
    const title = `Agent Audit Det — Reload Test ${TS}`;
    frame_id_reload = await createFrameViaWizard(page, title);
    // Add 5 nodes via palette.
    const labels: string[] = ["Root Question", "Sub-Question", "Term", "Checkpoint", "Conclusion"];
    for (const lbl of labels) await paletteAdd(page, lbl);
    await page.waitForTimeout(800); // let autosave debounce schedule.
    // Force flush via test API.
    await page.evaluate(async () => {
      // Trigger pagehide-like flush by hitting visibilityState=hidden listener
      // is not directly callable; but we can call autosave.flushAll via the
      // store harness if exposed. We don't expose autosave, so simply wait
      // long enough for the 5s idle debounce. As a backstop, dispatch a
      // pagehide event manually.
      const evt = new Event("pagehide");
      window.dispatchEvent(evt);
    });
    await page.waitForTimeout(1_200);
    const before = await readFrameSnapshot(page);
    saveJson(DETERMINISM_DIR, "B1-before-reload", before);
    await shotDet(page, "B1-before-reload");

    await page.reload();
    await expect
      .poll(async () => (await readFrameSnapshot(page)).frame !== null, { timeout: 15_000 })
      .toBe(true);
    await page.waitForTimeout(800);
    const after = await readFrameSnapshot(page);
    saveJson(DETERMINISM_DIR, "B1-after-reload", after);
    await shotDet(page, "B1-after-reload");

    const before_core = canonical(frameVersionCore(before));
    const after_core = canonical(frameVersionCore(after));
    if (before_core === after_core) {
      findings.push(
        `B1-OK: frame_version nodes+edges byte-equivalent across reload (${before.frame_version?.nodes.length} nodes).`,
      );
    } else {
      // Write a diff file with line-by-line.
      const diff_file = path.join(DETERMINISM_DIR, "B1-DRIFT-diff.txt");
      fs.writeFileSync(
        diff_file,
        `BEFORE (canonical):\n${before_core}\n\nAFTER (canonical):\n${after_core}\n`,
      );
      findings.push(
        `B1-FINDING (A): frame_version drift across reload. Diff file: ${diff_file}.`,
      );
    }
  });

  // ---------------- B2 — Two-tab BroadcastChannel ----------------
  await test.step("B2 — two-tab edit propagation", async () => {
    if (!frame_id_reload) {
      findings.push("B2-SKIP: no frame_id from B1.");
      return;
    }
    const page2 = await context.newPage();
    page2.on("pageerror", (e) => console.log("[pageerror page2]", e.message));
    await page2.goto(`/#/frame/${frame_id_reload}`);
    await expect
      .poll(async () => (await readFrameSnapshot(page2)).frame !== null, { timeout: 15_000 })
      .toBe(true);
    await page2.waitForTimeout(800);

    // Edit a node's statement in page (the root question, first node).
    const node_id = await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test?: { frame_store?: { getState(): unknown } };
      };
      const s = w.__argmap_test?.frame_store?.getState() as {
        frame_version: { nodes: Array<{ id: string }> };
      };
      return s.frame_version.nodes[0]?.id ?? null;
    });
    if (!node_id) {
      findings.push("B2-SKIP: no nodes available to edit.");
      await page2.close();
      return;
    }
    const new_statement = `B2 cross-tab edit ${Date.now()}`;
    await page.evaluate(
      ({ id, statement }) => {
        const w = window as unknown as {
          __argmap_test?: {
            frame_store?: { getState(): { applyPatch: (p: unknown) => void } };
          };
        };
        w.__argmap_test?.frame_store?.getState().applyPatch({
          kind: "node_edited",
          node_id: id,
          partial: { statement },
        });
      },
      { id: node_id, statement: new_statement },
    );
    // Force-flush autosave (no public surface; fire pagehide synthetically).
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.waitForTimeout(2_500);

    // Check page2 — frame_saved BroadcastChannel should trigger loadFrame.
    let propagated = false;
    for (let i = 0; i < 15; i += 1) {
      const snap2 = await readFrameSnapshot(page2);
      const found = snap2.frame_version?.nodes.find(
        (n) => (n as { id: string }).id === node_id,
      ) as { statement?: string } | undefined;
      if (found?.statement === new_statement) {
        propagated = true;
        break;
      }
      await page2.waitForTimeout(500);
    }
    await shotDet(page2, "B2-page2-after-edit");
    if (propagated) {
      findings.push("B2-OK: cross-tab edit propagated via BroadcastChannel within ~7.5s.");
    } else {
      findings.push(
        "B2-FINDING (B): cross-tab edit did NOT propagate to page2 within 7.5s. " +
          "BroadcastChannel + frame_saved subscription may require an explicit page2 focus, " +
          "or autosave flush timing exceeds the wait window.",
      );
    }
    // Drift indicator check (only meaningful inside an argument-running session).
    const drift = page2.getByTestId("frame-version-drift-indicator");
    const drift_visible = await drift.isVisible({ timeout: 1_000 }).catch(() => false);
    findings.push(
      `B2-NOTE: frame-version-drift-indicator visible on page2 = ${drift_visible} (expected false in frame-building view).`,
    );
    await page2.close();
  });

  // ---------------- B3 — Last-write-wins ----------------
  let frame_id_lww: string | null = null;
  await test.step("B3 — last-write-wins across two tabs", async () => {
    const title = `Agent Audit Det — LWW ${TS}`;
    frame_id_lww = await createFrameViaWizard(page, title);
    await paletteAdd(page, "Root Question");
    await paletteAdd(page, "Sub-Question");
    await page.waitForTimeout(800);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.waitForTimeout(1_500);

    const page2 = await context.newPage();
    await page2.goto(`/#/frame/${frame_id_lww}`);
    await expect
      .poll(async () => (await readFrameSnapshot(page2)).frame !== null, { timeout: 15_000 })
      .toBe(true);
    await page2.waitForTimeout(500);

    // Get the two node ids.
    const ids = await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test?: { frame_store?: { getState(): { frame_version: { nodes: Array<{ id: string; type: string }> } } } };
      };
      return (
        w.__argmap_test?.frame_store?.getState().frame_version.nodes.map((n) => ({
          id: n.id,
          type: n.type,
        })) ?? []
      );
    });
    if (ids.length < 2) {
      findings.push("B3-SKIP: need 2 nodes for LWW test, got " + ids.length);
      await page2.close();
      return;
    }
    const stmt_page = `B3-A edit on tab1 ${Date.now()}`;
    const stmt_page2 = `B3-B edit on tab2 ${Date.now()}`;
    await page.evaluate(
      ({ id, s }) => {
        const w = window as unknown as {
          __argmap_test?: {
            frame_store?: { getState(): { applyPatch: (p: unknown) => void } };
          };
        };
        w.__argmap_test?.frame_store?.getState().applyPatch({
          kind: "node_edited",
          node_id: id,
          partial: { statement: s },
        });
      },
      { id: ids[0].id, s: stmt_page },
    );
    await page.waitForTimeout(200);
    await page2.evaluate(
      ({ id, s }) => {
        const w = window as unknown as {
          __argmap_test?: {
            frame_store?: { getState(): { applyPatch: (p: unknown) => void } };
          };
        };
        w.__argmap_test?.frame_store?.getState().applyPatch({
          kind: "node_edited",
          node_id: id,
          partial: { statement: s },
        });
      },
      { id: ids[1].id, s: stmt_page2 },
    );
    await page.waitForTimeout(800);
    // Flush both.
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page2.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.waitForTimeout(3_000);

    await page2.close();
    await page.reload();
    await expect
      .poll(async () => (await readFrameSnapshot(page)).frame !== null, { timeout: 15_000 })
      .toBe(true);
    await page.waitForTimeout(800);

    const final = await readFrameSnapshot(page);
    saveJson(DETERMINISM_DIR, "B3-lww-final", final);
    const final_nodes = final.frame_version?.nodes ?? [];
    const a = final_nodes.find((n) => (n as { id: string }).id === ids[0].id) as
      | { statement?: string }
      | undefined;
    const b = final_nodes.find((n) => (n as { id: string }).id === ids[1].id) as
      | { statement?: string }
      | undefined;
    const a_ok = a?.statement === stmt_page;
    const b_ok = b?.statement === stmt_page2;
    if (a_ok && b_ok) {
      findings.push("B3-OK: both tab-A and tab-B edits preserved (no overwrite).");
    } else {
      findings.push(
        `B3-FINDING (A): LWW overwrite — tab-A preserved=${a_ok} ('${a?.statement}'), tab-B preserved=${b_ok} ('${b?.statement}'). ` +
          "Whole-row autosave on one tab can clobber the peer's edit if BroadcastChannel sync didn't land first.",
      );
    }
    await shotDet(page, "B3-after-reload");
  });

  // ---------------- B4 — Mid-session save flush on tab close ----------------
  await test.step("B4 — flush on tab close (pagehide handler)", async () => {
    const title = `Agent Audit Det — Pagehide Flush ${TS}`;
    const frame_id_b4 = await createFrameViaWizard(page, title);
    const node_id = await paletteAdd(page, "Root Question");
    // Edit immediately, do NOT wait for the 5s debounce. Then close the tab.
    const new_stmt = `B4 edit before close ${Date.now()}`;
    await page.evaluate(
      ({ id, s }) => {
        const w = window as unknown as {
          __argmap_test?: {
            frame_store?: { getState(): { applyPatch: (p: unknown) => void } };
          };
        };
        w.__argmap_test?.frame_store?.getState().applyPatch({
          kind: "node_edited",
          node_id: id,
          partial: { statement: s },
        });
      },
      { id: node_id, s: new_stmt },
    );
    // Don't wait for debounce — close immediately. pagehide / beforeunload
    // listeners in main.tsx should call autosave.flushAll(). NOTE:
    // Playwright's page.close() default does NOT run beforeunload; pass
    // runBeforeUnload to mimic a real user closing the tab. Also dispatch
    // pagehide / visibilitychange synthetically just before close to
    // exercise both listeners.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pagehide"));
      window.dispatchEvent(new Event("beforeunload"));
    });
    // Brief wait so the flush task can hit Supabase before tab tears down.
    await page.waitForTimeout(800);
    await page.close({ runBeforeUnload: true });
    // Use a Promise-based sleep — page.waitForTimeout is unusable post-close.
    await new Promise((r) => setTimeout(r, 2_500));

    const page3 = await context.newPage();
    await page3.goto(`/#/frame/${frame_id_b4}`);
    await expect
      .poll(async () => (await readFrameSnapshot(page3)).frame !== null, { timeout: 15_000 })
      .toBe(true);
    await page3.waitForTimeout(500);
    const snap3 = await readFrameSnapshot(page3);
    saveJson(DETERMINISM_DIR, "B4-after-reopen", snap3);
    const found = snap3.frame_version?.nodes.find(
      (n) => (n as { id: string }).id === node_id,
    ) as { statement?: string } | undefined;
    if (found?.statement === new_stmt) {
      findings.push(
        "B4-OK: pre-debounce edit persisted via pagehide flush; visible after reopen.",
      );
    } else {
      findings.push(
        `B4-FINDING (A): pre-debounce edit LOST on tab close. Expected '${new_stmt}', got '${found?.statement ?? "(no statement)"}'.`,
      );
    }
    await shotDet(page3, "B4-after-reopen");
    // Keep page3 as the working page for B5.
    await page3.bringToFront();

    // ---------------- B5 — Milestone snapshot byte-equivalence ----------------
    await test.step("B5 — save milestone + restore + byte-equivalent", async () => {
      const title_b5 = `Agent Audit Det — Milestone ${TS}`;
      const frame_id_b5 = await createFrameViaWizard(page3, title_b5);
      void frame_id_b5;
      await paletteAdd(page3, "Root Question");
      await paletteAdd(page3, "Sub-Question");
      await paletteAdd(page3, "Conclusion");
      await page3.waitForTimeout(500);

      // Save milestone via store API. There is no UI affordance for
      // milestone-saves in frame-building today (save-milestone-button only
      // appears in argument-running interview-pane empty state).
      const milestone_version_id = await page3.evaluate(async () => {
        const w = window as unknown as {
          __argmap_test?: {
            frame_store?: {
              getState(): {
                saveFrameMilestone: (s?: string) => Promise<void>;
                frame_version: { id: string };
              };
            };
          };
        };
        const fs = w.__argmap_test?.frame_store;
        if (!fs) throw new Error("frame_store unavailable");
        const before_id = fs.getState().frame_version.id;
        await fs.getState().saveFrameMilestone("B5 milestone");
        return before_id;
      });
      void milestone_version_id;
      await page3.waitForTimeout(1_500);

      const at_milestone = await readFrameSnapshot(page3);
      saveJson(DETERMINISM_DIR, "B5-at-milestone", at_milestone);
      const milestone_fv_id = at_milestone.frame_version?.id;

      // Apply an edit so we move away from the milestone version.
      const some_node_id = at_milestone.frame_version?.nodes[0]
        ? (at_milestone.frame_version.nodes[0] as { id: string }).id
        : null;
      if (some_node_id) {
        await page3.evaluate(
          ({ id }) => {
            const w = window as unknown as {
              __argmap_test?: {
                frame_store?: { getState(): { applyPatch: (p: unknown) => void } };
              };
            };
            w.__argmap_test?.frame_store?.getState().applyPatch({
              kind: "node_edited",
              node_id: id,
              partial: { statement: "B5 drift edit" },
            });
          },
          { id: some_node_id },
        );
        await page3.waitForTimeout(800);
      }

      // Restore to milestone.
      if (!milestone_fv_id) {
        findings.push("B5-SKIP: no milestone_fv_id captured.");
      } else {
        await page3.evaluate(async (id: string) => {
          const w = window as unknown as {
            __argmap_test?: {
              frame_store?: {
                getState(): { restoreVersion: (vid: string) => Promise<void> };
              };
            };
          };
          await w.__argmap_test?.frame_store?.getState().restoreVersion(id);
        }, milestone_fv_id);
        await page3.waitForTimeout(1_500);
        const after_restore = await readFrameSnapshot(page3);
        saveJson(DETERMINISM_DIR, "B5-after-restore", after_restore);
        const a_core = canonical(frameVersionCore(at_milestone));
        const b_core = canonical(frameVersionCore(after_restore));
        if (a_core === b_core) {
          findings.push(
            "B5-OK: restored frame_version nodes+edges byte-equivalent to milestone snapshot.",
          );
        } else {
          const diff_file = path.join(DETERMINISM_DIR, "B5-DRIFT-diff.txt");
          fs.writeFileSync(
            diff_file,
            `AT-MILESTONE:\n${a_core}\n\nAFTER-RESTORE:\n${b_core}\n`,
          );
          findings.push(
            `B5-FINDING (A): restored snapshot drifts from milestone. Diff: ${diff_file}.`,
          );
        }
        await shotDet(page3, "B5-after-restore");
      }
    });
  });

  // ---------------- Write findings ----------------
  fs.writeFileSync(
    path.join(DETERMINISM_DIR, "findings.md"),
    "# Determinism & persistence audit findings\n\n" +
      findings.map((f) => `- ${f}`).join("\n") +
      "\n",
  );
  console.log("[determinism] findings:");
  for (const f of findings) console.log("  -", f);

  await context.close();
});
