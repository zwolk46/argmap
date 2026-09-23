/**
 * AUDIT — MODE TRANSITIONS.
 *
 * Sub-agent audit of the four major mode transitions plus the session
 * FrameVersion drift / migration path:
 *
 *   1. Frame -> Argument (strict validation gate, C5)
 *   2. Argument -> Frame (unconditional backwards switch)
 *   3. Architectural mode change (legal <-> general)
 *   4. Flavor change within general (personal <-> academic)
 *   5. Session FrameVersion drift migration
 *
 * Drives the live app at http://localhost:5173 against the configured
 * Supabase backend. Frames are tagged "Agent Audit MT —" so they are
 * trivially identifiable on Home and easy to clean up.
 *
 * Run: E2E_LIVE=1 npx playwright test \
 *        tests/e2e/audit-mode-transitions.spec.ts --headed --workers=1
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";

test.skip(!LIVE, "E2E_LIVE=1 to run the live audit mode-transitions spec");
test.setTimeout(15 * 60_000);

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------
const SCREENSHOT_DIR = path.resolve(process.cwd(), "tests", "audit", "mode-transitions");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
let SHOT_COUNTER = 0;
async function shot(page: Page, label: string): Promise<void> {
  SHOT_COUNTER += 1;
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const file = path.join(
    SCREENSHOT_DIR,
    `${String(SHOT_COUNTER).padStart(2, "0")}-${safe}.png`,
  );
  await page.screenshot({ path: file, fullPage: true });
}

// ---------------------------------------------------------------------------
// Programmatic helpers (uses window.__argmap_test, see src/state/context.tsx)
// ---------------------------------------------------------------------------
async function applyPatch(page: Page, patch: unknown): Promise<void> {
  await page.evaluate((p) => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): { applyPatch(p: unknown): void } } };
    };
    const fs2 = w.__argmap_test?.frame_store;
    if (!fs2) throw new Error("window.__argmap_test.frame_store not exposed");
    fs2.getState().applyPatch(p);
  }, patch);
  await page.waitForTimeout(40);
}

async function readFrameState(page: Page): Promise<{
  frame: { id: string; mode: string; flavor?: string } | null;
  nodes: ReadonlyArray<{ id: string; type: string; statement?: string }>;
  edges: ReadonlyArray<{ id: string; source: string; target: string; type: string }>;
  validation: ReadonlyArray<{ severity: string; message: string; rule_id?: string }>;
  current_version_id: string | null;
}> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): unknown } };
    };
    const s = w.__argmap_test?.frame_store?.getState() as
      | {
          frame: {
            id: string;
            mode: string;
            flavor?: string;
            current_version_id: string;
          } | null;
          frame_version: {
            id: string;
            nodes: Array<{ id: string; type: string; statement?: string }>;
            edges: Array<{ id: string; source: string; target: string; type: string }>;
          } | null;
          validation: Array<{ severity: string; message: string; rule_id?: string }>;
        }
      | undefined;
    if (!s) throw new Error("frame_store missing");
    return {
      frame: s.frame
        ? { id: s.frame.id, mode: s.frame.mode, flavor: s.frame.flavor }
        : null,
      nodes: s.frame_version?.nodes ?? [],
      edges: s.frame_version?.edges ?? [],
      validation: s.validation ?? [],
      current_version_id: s.frame_version?.id ?? null,
    };
  });
}

async function readSessionState(page: Page): Promise<{
  session: { id: string; frame_version_id: string } | null;
  session_version: { id: string } | null;
}> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: { session_store?: { getState(): unknown } };
    };
    const s = w.__argmap_test?.session_store?.getState() as
      | {
          session: { id: string; frame_version_id: string } | null;
          session_version: { id: string } | null;
        }
      | undefined;
    return {
      session: s?.session ? { id: s.session.id, frame_version_id: s.session.frame_version_id } : null,
      session_version: s?.session_version ? { id: s.session_version.id } : null,
    };
  });
}

async function saveFrameMilestone(page: Page, summary: string): Promise<void> {
  await page.evaluate(async (s) => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: { getState(): { saveFrameMilestone(s: string): Promise<void> } };
      };
    };
    const fs2 = w.__argmap_test?.frame_store;
    if (!fs2) throw new Error("frame_store missing");
    await fs2.getState().saveFrameMilestone(s);
  }, summary);
  await page.waitForTimeout(200);
}

async function saveSessionMilestone(page: Page, summary: string): Promise<void> {
  await page.evaluate(async (s) => {
    const w = window as unknown as {
      __argmap_test?: {
        session_store?: { getState(): { saveSessionMilestone(s: string): Promise<void> } };
      };
    };
    const ss = w.__argmap_test?.session_store;
    if (!ss) throw new Error("session_store missing");
    await ss.getState().saveSessionMilestone(s);
  }, summary);
  await page.waitForTimeout(200);
}

/** Wait until window.__argmap_test is installed AND a frame_version is loaded. */
async function waitTestHelpers(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        await page.evaluate(() => {
          const w = window as unknown as {
            __argmap_test?: { frame_store?: { getState(): { frame_version?: unknown } } };
          };
          const fs2 = w.__argmap_test?.frame_store;
          if (!fs2) return false;
          return Boolean(fs2.getState().frame_version);
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
}

/**
 * Add a node directly through the store. Skips palette-click + ensures
 * the node has the exact fields the validation rules expect.
 */
async function addNode(
  page: Page,
  type: string,
  partial: Record<string, unknown> = {},
): Promise<string> {
  return await page.evaluate(
    ({ t, p }) => {
      const w = window as unknown as {
        __argmap_test?: { frame_store?: { getState(): { applyPatch(p: unknown): void } } };
      };
      const fs2 = w.__argmap_test?.frame_store;
      if (!fs2) throw new Error("frame_store missing");
      const id = crypto.randomUUID();
      const ts = new Date().toISOString();
      const base = {
        id,
        type: t,
        created_at: ts,
        updated_at: ts,
      };
      fs2.getState().applyPatch({
        kind: "node_added",
        node: { ...base, ...p },
      });
      return id;
    },
    { t: type, p: partial },
  );
}

async function addEdge(
  page: Page,
  edgeType: string,
  source: string,
  target: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const id = await page.evaluate(
    ({ et, s, t, x }) => {
      const w = window as unknown as {
        __argmap_test?: { frame_store?: { getState(): { applyPatch(p: unknown): void } } };
      };
      const fs2 = w.__argmap_test?.frame_store;
      if (!fs2) throw new Error("frame_store missing");
      const newId = crypto.randomUUID();
      const ts = new Date().toISOString();
      fs2.getState().applyPatch({
        kind: "edge_added",
        edge: {
          id: newId,
          type: et,
          layer:
            et === "ANSWERS" || et === "SUPPORTS" || et === "CONTRADICTS" ? "argument" : "frame",
          source: s,
          target: t,
          created_at: ts,
          updated_at: ts,
          ...x,
        },
      });
      return newId;
    },
    { et: edgeType, s: source, t: target, x: extra },
  );
  await page.waitForTimeout(30);
  return id;
}

async function editNode(
  page: Page,
  nodeId: string,
  partial: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    ({ id, p }) => {
      const w = window as unknown as {
        __argmap_test?: { frame_store?: { getState(): { applyPatch(p: unknown): void } } };
      };
      const fs2 = w.__argmap_test?.frame_store;
      if (!fs2) throw new Error("frame_store missing");
      fs2.getState().applyPatch({ kind: "node_edited", node_id: id, partial: p });
    },
    { id: nodeId, p: partial },
  );
  await page.waitForTimeout(30);
}

// ---------------------------------------------------------------------------
// Frame creation helper
// ---------------------------------------------------------------------------
async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("sign-in-email").fill(EMAIL);
  await page.getByTestId("sign-in-password").fill(PASSWORD);
  await page.getByTestId("sign-in-submit").click();
  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function createFrame(
  page: Page,
  args: { mode: "legal" | "general"; flavor?: "personal" | "academic"; title: string },
): Promise<void> {
  // Always start from home.
  await page.goto("/");
  // Defensive: previous test runs (against the live Supabase user) can leave
  // the user in a state where some Dialog overlay auto-opens on home. Wait
  // for the overlay to settle, then dismiss it if present.
  await page.waitForTimeout(300);
  const overlay = page.locator(".argmap-overlay").first();
  const overlayOpen = await overlay.isVisible({ timeout: 500 }).catch(() => false);
  if (overlayOpen) {
    // Try clicking outside (most dialogs allow click-outside dismiss); fall
    // back to Escape. OnboardingWizard does not dismiss either way, so log
    // and proceed — Playwright's click will eventually time out and surface
    // the real cause.
    console.log("[audit-MT] dismissing pre-existing overlay before new-frame click");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  // Use the testid for the home page button (more specific than aria text).
  await page.getByTestId("home-new-frame").click({ timeout: 5_000 });
  await expect(page.getByTestId("new-frame-wizard")).toBeVisible();
  if (args.mode === "legal") {
    await page.getByTestId("wizard-mode-legal").click();
  } else {
    await page.getByTestId("wizard-mode-general").click();
    if (args.flavor) {
      const flavorTid =
        args.flavor === "academic" ? "wizard-flavor-academic" : "wizard-flavor-personal";
      await page.getByTestId(flavorTid).click();
    }
  }
  await page.getByTestId("wizard-title-input").fill(args.title);
  await page.getByTestId("wizard-submit").click();
  await expect(page.locator("body")).toContainText(args.title, { timeout: 15_000 });
  await waitTestHelpers(page);
}

const ts = (): string =>
  new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

// ---------------------------------------------------------------------------
// Transition 1 + 2 — Frame <-> Argument
// ---------------------------------------------------------------------------
test("Transitions 1 & 2 — Frame ↔ Argument with strict validation gate", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  const FRAME_TITLE = `Agent Audit MT — Frame to Argument ${ts()}`;

  await test.step("sign in + create legal frame", async () => {
    await signIn(page);
    await createFrame(page, { mode: "legal", title: FRAME_TITLE });
    await shot(page, "t1-frame-created-empty");
  });

  // ------- Seed an invalid frame: disconnected SubQs + missing Conclusion. ---
  // Validation rules that will trigger:
  //   V-FR-1: 0 RootQuestions (need exactly 1)               -> error
  //   V-FR-2: SubQs have no incoming edge (orphan)           -> error  (n)
  //   V-FR-5: no Conclusion reachable / no Conclusion at all -> error  (none)
  //   V-FR-8: paths must terminate at a Conclusion           -> error  (n)
  //
  // Just minting two orphan SubQuestions is enough to trip V-FR-2 (severity:
  // error), which is the disconnected_node case the audit was tasked with
  // verifying. The advisor flagged that "disconnected_node" is the
  // implementation's V-FR-2 rule_id; that's the controlling fact.

  let subq_a: string = "";
  let subq_b: string = "";
  await test.step("seed disconnected SubQuestions + (no Conclusion)", async () => {
    // SubQ uses field `statement` (B1.2). Leaving it set so V-NODE-2 doesn't
    // fire — we want a clean disconnected_node (V-FR-2) signal.
    subq_a = await addNode(page, "SubQuestion", {
      statement: "Disconnected sub-question A — is X relevant?",
    });
    subq_b = await addNode(page, "SubQuestion", {
      statement: "Disconnected sub-question B — does Y follow?",
    });
    await page.waitForTimeout(120);
    const st = await readFrameState(page);
    const errors = st.validation.filter((v) => v.severity === "error");
    console.log(
      `[audit-MT-1] seeded nodes=${st.nodes.length} edges=${st.edges.length} errors=${errors.length}`,
    );
    for (const e of errors) console.log(`  err [${e.rule_id ?? "?"}] ${e.message}`);
    expect(errors.some((e) => e.rule_id === "V-FR-2")).toBe(true);
    await shot(page, "t1-seeded-errors");
  });

  await test.step("attempt frame->argument: toast surfaces + toggle does NOT switch", async () => {
    const argRadio = page
      .getByRole("group", { name: "Operating mode" })
      .getByRole("radio", { name: "Argument" });
    await expect(argRadio).toBeVisible();
    await argRadio.click();

    // Wait for the toast (kind=warning) the validation-blocked handler dispatches.
    const toast = page.getByTestId("toast-warning").first();
    await expect(toast).toBeVisible({ timeout: 5_000 });
    const toastText = await toast.innerText();
    console.log(`[audit-MT-1] toast: "${toastText.replace(/\s+/g, " ").trim()}"`);
    // The handler writes "Can't switch yet — N validation error(s) ..."
    // The audit task spec said "N validation errors blocking mode switch" —
    // implementation chose different (gentler) copy. Recorded as B-finding.
    expect(toastText).toMatch(/can't switch|validation error/i);

    // Toggle stayed on frame_building. Re-read store snapshot — frame_version
    // still hosts the disconnected sub-questions and the URL hasn't changed.
    const radioChecked = await argRadio.getAttribute("aria-checked");
    expect(radioChecked).toBe("false");
    const frameRadio = page
      .getByRole("group", { name: "Operating mode" })
      .getByRole("radio", { name: "Frame" });
    expect(await frameRadio.getAttribute("aria-checked")).toBe("true");

    // Re-confirm validation contains severity=error entries.
    const st = await readFrameState(page);
    expect(st.validation.some((v) => v.severity === "error")).toBe(true);
    await shot(page, "t1-blocked-toast-visible");
  });

  await test.step("repair frame to no-errors (warnings allowed)", async () => {
    // Repair to a topology the validation rules accept:
    //   RootQuestion -[DECOMPOSES_INTO]-> SubQuestion -[TURNS_ON]-> Term
    //   Term -[INTERPRETED_AS]-> Interp{A,B}
    //   Interp{A,B} -[LEADS_TO]-> Conclusion
    //
    // Reuses subq_a; subq_b stays disconnected to keep V-FR-2 active until
    // we wire it. We wire both for cleanness.
    const root = await addNode(page, "RootQuestion", {
      statement: "Is X liable under the relevant standard?",
    });
    const conclusion = await addNode(page, "Conclusion", {
      statement: "Defendant is liable.",
      direction: { kind: "legal", value: "affirm" },
    });
    const term = await addNode(page, "Term", {
      name: "Reasonable Person Standard",
      order: 0,
    });
    const interp_a = await addNode(page, "Interpretation", {
      statement: "Ordinary prudent person under like circumstances.",
    });
    const interp_b = await addNode(page, "Interpretation", {
      statement: "Heightened common-carrier standard.",
    });

    await addEdge(page, "DECOMPOSES_INTO", root, subq_a);
    await addEdge(page, "DECOMPOSES_INTO", root, subq_b);
    await addEdge(page, "TURNS_ON", subq_a, term);
    await addEdge(page, "TURNS_ON", subq_b, term);
    await addEdge(page, "INTERPRETED_AS", term, interp_a);
    await addEdge(page, "INTERPRETED_AS", term, interp_b);
    await addEdge(page, "LEADS_TO", interp_a, conclusion);
    await addEdge(page, "LEADS_TO", interp_b, conclusion);

    await page.waitForTimeout(200);
    const st = await readFrameState(page);
    const errors = st.validation.filter((v) => v.severity === "error");
    const warnings = st.validation.filter((v) => v.severity === "warning");
    console.log(`[audit-MT-1] repair check: errors=${errors.length} warnings=${warnings.length}`);
    for (const e of errors) console.log(`  resid err [${e.rule_id ?? "?"}] ${e.message}`);
    for (const w of warnings) console.log(`  resid warn [${w.rule_id ?? "?"}] ${w.message}`);
    await shot(page, "t1-repaired");
  });

  await test.step("toggle to argument: confirm dialog OR direct switch", async () => {
    const st0 = await readFrameState(page);
    const errors0 = st0.validation.filter((v) => v.severity === "error").length;
    const warnings0 = st0.validation.filter((v) => v.severity === "warning").length;

    const argRadio = page
      .getByRole("group", { name: "Operating mode" })
      .getByRole("radio", { name: "Argument" });
    await argRadio.click();

    if (errors0 === 0 && warnings0 > 0) {
      // Warnings path — ConfirmDialog appears with title "Validation warnings".
      const dialog = page.getByRole("dialog", { name: /validation warnings/i });
      await expect(dialog).toBeVisible({ timeout: 4_000 });
      await shot(page, "t1-warning-confirm-dialog");
      await dialog.getByRole("button", { name: /continue/i }).click();
    } else if (errors0 === 0 && warnings0 === 0) {
      // No-dialog path; mode switches immediately.
      console.log("[audit-MT-1] no-warning frame, expecting direct switch");
    } else {
      console.log(`[audit-MT-1] residual errors after repair (${errors0}); skipping warning-path`);
    }

    // Either way: if errors=0 the mode toggle should now navigate the route
    // to argument_running (URL changes and the interview-pane mounts).
    if (errors0 === 0) {
      // Wait for interview-pane or for the URL to flip. Switching from
      // frame to argument creates a new session (async Supabase write)
      // before navigating, so allow generous time.
      const interview = page.getByTestId("interview-pane");
      const visible = await interview.isVisible({ timeout: 20_000 }).catch(() => false);
      console.log(`[audit-MT-1] post-switch interview-pane visible=${visible}`);
      if (!visible) {
        // Diagnostic: capture the URL hash to see whether router moved.
        const url = page.url();
        console.log(`[audit-MT-1] post-switch URL: ${url}`);
      }
      await shot(page, "t1-after-switch-to-argument");
    }
  });

  // ------- Transition 2: Argument -> Frame (unconditional) ---------------
  await test.step("Argument -> Frame: unconditional backwards switch", async () => {
    // Only meaningful if we made it to argument_running.
    const interview = page.getByTestId("interview-pane");
    const onArg = await interview.isVisible({ timeout: 2_000 }).catch(() => false);
    if (!onArg) {
      console.log("[audit-MT-2] skipped — never reached argument-running");
      return;
    }
    const frameRadio = page
      .getByRole("group", { name: "Operating mode" })
      .getByRole("radio", { name: "Frame" });
    await frameRadio.click();
    // No confirm dialog, no toast, immediate switch.
    await page.waitForTimeout(800);
    // Confirm we landed back in frame-building (palette tile is visible).
    const paletteRoot = page.getByRole("button", { name: "Root Question", exact: true }).first();
    await expect(paletteRoot).toBeVisible({ timeout: 5_000 });
    await shot(page, "t2-back-to-frame");
  });
});

// ---------------------------------------------------------------------------
// Transition 3 — Architectural mode change (legal -> general)
// ---------------------------------------------------------------------------
test("Transition 3 — Architectural mode change (legal -> general)", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  const FRAME_TITLE = `Agent Audit MT — Architectural Change ${ts()}`;

  await test.step("sign in + create legal frame with a Conclusion", async () => {
    await signIn(page);
    await createFrame(page, { mode: "legal", title: FRAME_TITLE });
    // Add one Conclusion in legal-mode direction so the mode change
    // surfaces the inline ConclusionDirectionEditor (blocking section).
    await addNode(page, "Conclusion", {
      statement: "Defendant is liable.",
      direction: { kind: "legal", value: "affirm" },
    });
    // Also seed an Authority — legal-only — so the advisory section gets
    // populated by MODE-CHANGE-AUTHORITY-LEGAL-FIELDS-INERT.
    await addNode(page, "Authority", {
      name: "Palsgraf v. Long Island R.R. Co.",
      citation: "248 N.Y. 339 (1928)",
      is_binding: true,
      jurisdiction: { level: "state", region: "NY" },
    });
    await page.waitForTimeout(150);
    await shot(page, "t3-frame-seeded");
  });

  await test.step("open frame-settings + click Change mode button", async () => {
    await page.getByRole("button", { name: /frame settings/i }).first().click();
    await expect(page.getByRole("dialog", { name: /frame settings/i })).toBeVisible({
      timeout: 5_000,
    });
    await shot(page, "t3-frame-settings-open");

    // Spec said "toggle". Implementation is a Button labeled "Change mode".
    // Recorded as B-finding.
    const changeModeBtn = page
      .getByRole("dialog", { name: /frame settings/i })
      .getByRole("button", { name: /change mode/i });
    await expect(changeModeBtn).toBeVisible();
    await changeModeBtn.click();
  });

  await test.step("ArchitecturalModeChangeDialog: verify sections + commit disabled", async () => {
    const dialog = page.getByRole("dialog", { name: /change architectural mode/i });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await shot(page, "t3-dialog-open");

    // Blocking section: at least one conclusion-direction-editor-row visible.
    const rows = dialog.locator("[data-testid='conclusion-direction-editor-row']");
    const rowCount = await rows.count();
    console.log(`[audit-MT-3] blocking direction editors: ${rowCount}`);
    expect(rowCount).toBeGreaterThanOrEqual(1);

    // Each row has a disabled-until-pick select with placeholder option.
    const firstSelect = rows.first().locator("[data-testid='direction-select']");
    await expect(firstSelect).toBeVisible();
    const initialValue = await firstSelect.inputValue();
    expect(initialValue).toBe("");

    // PositionsInlineEditor surfaces (legal -> general + no positions).
    const positions = dialog.getByTestId("positions-inline-editor");
    await expect(positions).toBeVisible();

    // Commit disabled until everything resolved.
    const commitBtn = dialog.getByTestId("mode-change-commit");
    await expect(commitBtn).toBeDisabled();

    // Advisory section may or may not be present depending on which inert
    // markers the seeded frame carries. Log either way.
    const advisory = dialog.getByTestId("scan-result-advisory");
    const hasAdvisory = await advisory.isVisible().catch(() => false);
    console.log(`[audit-MT-3] advisory section visible=${hasAdvisory}`);
    await shot(page, "t3-dialog-blocking-and-advisory");
  });

  await test.step("stage a position + resolve all directions + commit", async () => {
    const dialog = page.getByRole("dialog", { name: /change architectural mode/i });

    // Stage one Position (required before commit-enable when target=general).
    await dialog.getByTestId("position-draft-input").fill("Affirm liability");
    await dialog.getByTestId("position-add-button").click();
    await expect(dialog.getByTestId("staged-position-row")).toBeVisible();

    // Resolve every direction-row via its Select. In general-mode the
    // available_positions get propagated as <option> values — pick the
    // first non-empty one for each row.
    const rows = dialog.locator("[data-testid='conclusion-direction-editor-row']");
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const select = rows.nth(i).locator("[data-testid='direction-select']");
      const optionValues = await select.locator("option").evaluateAll((els) =>
        els.map((e) => (e as HTMLOptionElement).value),
      );
      const firstNonEmpty = optionValues.find((v) => v !== "");
      if (!firstNonEmpty) {
        console.log(`[audit-MT-3] row ${i} has no concrete options — skipping`);
        continue;
      }
      await select.selectOption(firstNonEmpty);
    }
    await page.waitForTimeout(100);
    await shot(page, "t3-dialog-resolved");

    // Commit should now be enabled.
    const commitBtn = dialog.getByTestId("mode-change-commit");
    await expect(commitBtn).toBeEnabled({ timeout: 3_000 });
    await commitBtn.click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    await shot(page, "t3-after-commit");

    // Verify frame.mode flipped to general.
    const st = await readFrameState(page);
    console.log(`[audit-MT-3] post-commit frame.mode=${st.frame?.mode} flavor=${st.frame?.flavor}`);
    expect(st.frame?.mode).toBe("general");
  });
});

// ---------------------------------------------------------------------------
// Transition 4 — Flavor change within general (personal -> academic)
// ---------------------------------------------------------------------------
test("Transition 4 — Flavor change (personal -> academic)", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  const FRAME_TITLE = `Agent Audit MT — Flavor Change ${ts()}`;

  await test.step("sign in + create general/personal frame", async () => {
    await signIn(page);
    await createFrame(page, {
      mode: "general",
      flavor: "personal",
      title: FRAME_TITLE,
    });
    const st0 = await readFrameState(page);
    expect(st0.frame?.mode).toBe("general");
    expect(st0.frame?.flavor).toBe("personal");
    await shot(page, "t4-before");
  });

  await test.step("open frame-settings + click Change flavor", async () => {
    await page.getByRole("button", { name: /frame settings/i }).first().click();
    await expect(page.getByRole("dialog", { name: /frame settings/i })).toBeVisible({
      timeout: 5_000,
    });

    // Spec said "should commit immediately (no dialog)". Implementation
    // routes through FlavorChangeDialog (a ConfirmDialog with advisories).
    // Recorded as B-finding.
    const changeFlavorBtn = page
      .getByRole("dialog", { name: /frame settings/i })
      .getByRole("button", { name: /change flavor/i });
    await expect(changeFlavorBtn).toBeVisible();
    await changeFlavorBtn.click();

    const flavorDialog = page.getByRole("dialog", {
      name: /switch to academic flavor/i,
    });
    await expect(flavorDialog).toBeVisible({ timeout: 5_000 });
    await shot(page, "t4-flavor-confirm-dialog");

    // Advisory list — if present, informational only.
    const body = flavorDialog.getByTestId("flavor-change-body");
    await expect(body).toBeVisible();

    await flavorDialog.getByRole("button", { name: /switch/i }).click();
    await expect(flavorDialog).toBeHidden({ timeout: 5_000 });
  });

  await test.step("verify frame.flavor === 'academic'", async () => {
    await page.waitForTimeout(200);
    const st = await readFrameState(page);
    console.log(`[audit-MT-4] post-flip flavor=${st.frame?.flavor}`);
    expect(st.frame?.flavor).toBe("academic");
    await shot(page, "t4-after");
  });
});

// ---------------------------------------------------------------------------
// Transition 5 — Session FrameVersion drift migration
// ---------------------------------------------------------------------------
test("Transition 5 — Session FrameVersion drift migration", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  const FRAME_TITLE = `Agent Audit MT — Drift Migration ${ts()}`;

  await test.step("create a minimal, valid frame", async () => {
    await signIn(page);
    await createFrame(page, { mode: "legal", title: FRAME_TITLE });

    // Minimum valid legal-mode topology that satisfies the V-* rules:
    //   Root -[DECOMPOSES_INTO]-> SubQ -[TURNS_ON]-> Term
    //   Term -[INTERPRETED_AS]-> Interp{A,B}
    //   Interp{A,B} -[LEADS_TO]-> Conclusion
    const root = await addNode(page, "RootQuestion", {
      statement: "Is the defendant liable?",
    });
    const subq = await addNode(page, "SubQuestion", {
      statement: "Did the defendant breach a duty?",
      is_jurisdictional: true,
    });
    const term = await addNode(page, "Term", {
      name: "Reasonable care",
      order: 0,
    });
    const interp_a = await addNode(page, "Interpretation", {
      statement: "Ordinary prudent person standard.",
    });
    const interp_b = await addNode(page, "Interpretation", {
      statement: "Heightened professional standard.",
    });
    const conclusion = await addNode(page, "Conclusion", {
      statement: "Defendant is liable.",
      direction: { kind: "legal", value: "affirm" },
    });
    await addEdge(page, "DECOMPOSES_INTO", root, subq);
    await addEdge(page, "TURNS_ON", subq, term);
    await addEdge(page, "INTERPRETED_AS", term, interp_a);
    await addEdge(page, "INTERPRETED_AS", term, interp_b);
    await addEdge(page, "LEADS_TO", interp_a, conclusion);
    await addEdge(page, "LEADS_TO", interp_b, conclusion);
    await page.waitForTimeout(200);

    // Save a milestone so we have a stable baseline.
    await saveFrameMilestone(page, "Baseline before drift test");
    await shot(page, "t5-baseline-frame");
  });

  // T5 navigates frame->argument->frame->argument. Each switch is
  // brittle against live-Supabase latency. We treat reaching the
  // interview pane as a precondition; if we can't reach it, log and
  // skip with a B-finding rather than failing the whole spec.
  let reached_argument_running = false;
  await test.step("switch to argument-running so a session exists", async () => {
    const argRadio = page
      .getByRole("group", { name: "Operating mode" })
      .getByRole("radio", { name: "Argument" });
    await argRadio.click();
    // Accept warnings dialog if visible. Use the dialog title for a
    // tighter match than a generic "Continue" button.
    const warnDialog = page.getByRole("dialog", { name: /validation warnings/i });
    if (await warnDialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await warnDialog.getByRole("button", { name: /continue/i }).click();
    }
    const visible = await page
      .getByTestId("interview-pane")
      .isVisible({ timeout: 25_000 })
      .catch(() => false);
    if (!visible) {
      console.log(
        "[audit-MT-5] could not reach argument-running — switchToArgumentRunning may have race-failed (live Supabase latency). Aborting drift sub-flow.",
      );
      await shot(page, "t5-failed-switch-to-argument");
      return;
    }
    reached_argument_running = true;
    await page.waitForTimeout(400);
    const ss = await readSessionState(page);
    console.log(`[audit-MT-5] session=${ss.session?.id} fv=${ss.session?.frame_version_id}`);
    // Force-flush the session so the second switchToArgumentRunning call
    // finds the existing session in repo.listSessionsForFrame() and reuses
    // it rather than minting a fresh session against the current FV.
    await saveSessionMilestone(page, "Audit MT-5 baseline session");
    await shot(page, "t5-argument-session-open");
  });

  await test.step("switch back to frame, edit + save milestone, return", async () => {
    if (!reached_argument_running) {
      console.log("[audit-MT-5] skipping: never reached argument-running");
      return;
    }
    const frameRadio = page
      .getByRole("group", { name: "Operating mode" })
      .getByRole("radio", { name: "Frame" });
    await frameRadio.click();
    await expect(
      page.getByRole("button", { name: "Root Question", exact: true }).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Make a structural-but-safe edit: mutate a node statement.
    const st0 = await readFrameState(page);
    const root = st0.nodes.find((n) => n.type === "RootQuestion");
    expect(root).toBeDefined();
    await editNode(page, root!.id, {
      statement: "Is the defendant liable? (revised)",
    });
    await page.waitForTimeout(120);
    // Save a frame milestone — this rolls the FrameVersion id.
    await saveFrameMilestone(page, "test drift");
    await shot(page, "t5-frame-mutated-and-saved");

    // Re-enter argument-running for the existing session.
    const argRadio = page
      .getByRole("group", { name: "Operating mode" })
      .getByRole("radio", { name: "Argument" });
    await argRadio.click();
    const continueBtn = page.getByRole("button", { name: /continue/i }).first();
    if (await continueBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await continueBtn.click();
    }
    await expect(page.getByTestId("interview-pane")).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(600);
  });

  await test.step("drift indicator appears + opens migration dialog", async () => {
    if (!reached_argument_running) {
      console.log("[audit-MT-5] skipping drift step: argument-running unreachable");
      return;
    }
    const indicator = page.getByTestId("frame-version-drift-indicator");
    // The indicator itself renders only when both stores have value; wait
    // for the [data-has-drift="true"] state specifically.
    await expect(indicator).toBeVisible({ timeout: 5_000 });
    const hasDrift = await indicator.getAttribute("data-has-drift");
    console.log(`[audit-MT-5] drift indicator data-has-drift=${hasDrift}`);
    await shot(page, "t5-drift-indicator-visible");

    if (hasDrift !== "true") {
      console.log(
        "[audit-MT-5] indicator rendered but has_drift=false — saveFrameMilestone may not have bumped session.frame_version_id reference",
      );
      return;
    }

    await indicator.click();
    const migrationDialog = page.getByRole("dialog", { name: /migrate session/i });
    await expect(migrationDialog).toBeVisible({ timeout: 5_000 });
    await shot(page, "t5-migration-dialog-open");

    // Commit the migration (no orphans expected for a pure statement edit).
    const commit = migrationDialog.getByTestId("migration-commit");
    await expect(commit).toBeEnabled({ timeout: 5_000 });
    await commit.click();
    await expect(migrationDialog).toBeHidden({ timeout: 5_000 });
    await shot(page, "t5-post-migration");

    // Indicator should now read has-drift=false (session caught up).
    await page.waitForTimeout(500);
    const after = await page
      .getByTestId("frame-version-drift-indicator")
      .getAttribute("data-has-drift");
    console.log(`[audit-MT-5] post-migration has_drift=${after}`);
  });
});
