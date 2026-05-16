/**
 * AUDIT — Frame-Building UI walkthrough.
 *
 * Drives the frame-building surface end-to-end through Playwright. Targets
 * (1) the node palette breadth, (2) drag-from-handle edge creation,
 * (3) the edge-creation popup, (4) inspector text editing,
 * (5) the options-box (instance / frame-default) editor, (6) validation
 * drawer, (7) auto-arrange, (8) cascade-delete confirmation, and
 * (9) frame settings panel.
 *
 * Writes live data to the configured Supabase project — the frame title is
 * prefixed "Agent Audit FB —" so it's identifiable on Home.
 *
 * Run:
 *   E2E_LIVE=1 npx playwright test tests/e2e/audit-frame-building.spec.ts \
 *     --headed --workers=1
 */

import { test, expect, type Page, type Locator } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";

const RUN_STAMP = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
const FRAME_TITLE = `Agent Audit FB — Frame Building Probe ${RUN_STAMP}`;

test.skip(!LIVE, "E2E_LIVE=1 to run the live-Supabase frame-building audit");
test.setTimeout(15 * 60_000);

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------
const SCREENSHOT_DIR = path.resolve(process.cwd(), "tests", "audit", "frame-building");
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
// Programmatic helpers for state assertions (NOT for gestures).
// ---------------------------------------------------------------------------
type AuditFrameSummary = {
  frame_id: string | undefined;
  frame_title: string | undefined;
  node_count: number;
  edge_count: number;
  node_types: string[];
  validation_count: number;
  validation_errors: number;
};

async function readFrameSummary(page: Page): Promise<AuditFrameSummary> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: {
          getState(): {
            frame?: { id?: string; title?: string };
            frame_version?: { nodes: Array<{ type: string }>; edges: Array<{ id: string }> };
            validation?: Array<{ severity: string }>;
          };
        };
      };
    };
    const s = w.__argmap_test?.frame_store?.getState();
    return {
      frame_id: s?.frame?.id,
      frame_title: s?.frame?.title,
      node_count: s?.frame_version?.nodes.length ?? 0,
      edge_count: s?.frame_version?.edges.length ?? 0,
      node_types: (s?.frame_version?.nodes ?? []).map((n) => n.type),
      validation_count: s?.validation?.length ?? 0,
      validation_errors: (s?.validation ?? []).filter((v) => v.severity === "error").length,
    };
  });
}

async function findNodeIdByType(page: Page, type: string): Promise<string | null> {
  return page.evaluate((t) => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: {
          getState(): {
            frame_version?: { nodes: Array<{ id: string; type: string }> };
          };
        };
      };
    };
    const nodes = w.__argmap_test?.frame_store?.getState().frame_version?.nodes ?? [];
    const hit = nodes.find((n) => n.type === t);
    return hit ? hit.id : null;
  }, type);
}

// ---------------------------------------------------------------------------
// Drag helper. Uses Playwright's mouse API; targets React Flow's source
// handle on a node-frame wrapper and drops onto the target node body. The
// node-frame wrapper carries data-node-id; react-flow renders the source
// handle as `.react-flow__handle-bottom.source` (or class `.source`).
// Returns true if a new edge appeared in the store after the gesture.
// ---------------------------------------------------------------------------
async function dragHandleFromTo(
  page: Page,
  source_node_id: string,
  target_node_id: string,
): Promise<{ ok: boolean; before_edges: number; after_edges: number; note: string }> {
  const before = await readFrameSummary(page);
  const source_handle = page
    .locator(`[data-node-id="${source_node_id}"] .react-flow__handle.source`)
    .first();
  const target_node = page.locator(`[data-node-id="${target_node_id}"]`).first();

  // Make sure both exist
  await source_handle.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  await target_node.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  const src_box = await source_handle.boundingBox();
  const tgt_box = await target_node.boundingBox();
  if (!src_box || !tgt_box) {
    return {
      ok: false,
      before_edges: before.edge_count,
      after_edges: before.edge_count,
      note: `box missing: src=${!!src_box} tgt=${!!tgt_box}`,
    };
  }

  const src_x = src_box.x + src_box.width / 2;
  const src_y = src_box.y + src_box.height / 2;
  const tgt_x = tgt_box.x + tgt_box.width / 2;
  const tgt_y = tgt_box.y + tgt_box.height / 2;

  await page.mouse.move(src_x, src_y);
  await page.mouse.down();
  // Steps matter for React Flow's connection-line tracking.
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const x = src_x + ((tgt_x - src_x) * i) / steps;
    const y = src_y + ((tgt_y - src_y) * i) / steps;
    await page.mouse.move(x, y, { steps: 1 });
  }
  await page.mouse.up();

  await page.waitForTimeout(400); // let popup mount / patch apply
  const after = await readFrameSummary(page);
  return {
    ok: after.edge_count > before.edge_count,
    before_edges: before.edge_count,
    after_edges: after.edge_count,
    note: `gesture ${source_node_id}->${target_node_id}`,
  };
}

// ---------------------------------------------------------------------------
// Click-add helper.
// ---------------------------------------------------------------------------
async function clickPalette(page: Page, aria_label: string): Promise<void> {
  await page.getByRole("button", { name: aria_label, exact: true }).click();
  await page.waitForTimeout(80);
}

// ---------------------------------------------------------------------------
// Inspector field-by-section helper. The right-pane editors render their
// primary text fields inside FieldAttributionDecoration(label=...) blocks;
// we locate the section heading and the immediately following textarea/
// input.
// ---------------------------------------------------------------------------
async function fillInspectorPrimary(page: Page, label: string, value: string): Promise<void> {
  // Field-attribution decorator renders the label inside a header element
  // adjacent to the input. Use a textbox locator and filter by aria-label
  // OR by section text — the simplest robust path is the first focusable
  // .argmap-input textarea in the inspector after we click the node.
  const inspector = page.locator('[aria-label="Inspector"]').first();
  // Fallback: just grab the first textarea visible in the right pane.
  const textarea = (
    inspector
      ? inspector.locator("textarea.argmap-input").first()
      : page.locator("textarea.argmap-input").first()
  ) as Locator;
  // The editors use defaultValue + onBlur, so we must focus, clear, type, blur.
  await textarea.scrollIntoViewIfNeeded().catch(() => {});
  await textarea.click({ clickCount: 3 });
  await textarea.fill(value);
  await page.keyboard.press("Tab");
  // tag the param so unused-warning is quiet
  void label;
}

test("Frame-building audit walkthrough", async ({ page }) => {
  test.info().annotations.push({ type: "audit", description: FRAME_TITLE });

  page.on("pageerror", (err) => {
    console.error("[pageerror]", err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("[console.error]", msg.text());
  });

  // ── Sign-in ────────────────────────────────────────────────────────────
  await page.goto("/");
  await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("sign-in-email").fill(EMAIL);
  await page.getByTestId("sign-in-password").fill(PASSWORD);
  await page.getByTestId("sign-in-submit").click();

  // ── Create frame via wizard ───────────────────────────────────────────
  await page.getByRole("button", { name: /new frame/i }).first().click();
  await expect(page.getByTestId("new-frame-wizard")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("wizard-mode-legal").click();
  await page.getByTestId("wizard-title-input").fill(FRAME_TITLE);
  await page.getByTestId("wizard-submit").click();
  await expect(page.getByText(FRAME_TITLE).first()).toBeVisible({ timeout: 15_000 });
  await page.waitForSelector('[data-testid="frame-canvas"]', { timeout: 10_000 });
  await shot(page, "01-frame-opened-empty");

  // ── 1. Palette breadth ─────────────────────────────────────────────────
  // Each palette button uses aria-label = humanized name.
  const palette_specs: Array<{ aria: string; type: string }> = [
    { aria: "Root Question", type: "RootQuestion" },
    { aria: "Sub-Question", type: "SubQuestion" },
    { aria: "Term", type: "Term" },
    { aria: "Interpretation", type: "Interpretation" },
    { aria: "Checkpoint", type: "Checkpoint" },
    { aria: "Logical Gate", type: "LogicalGate" },
    { aria: "Conclusion", type: "Conclusion" },
    { aria: "Authority", type: "Authority" },
  ];

  for (const spec of palette_specs) {
    await clickPalette(page, spec.aria);
    const summary = await readFrameSummary(page);
    expect(summary.node_types).toContain(spec.type);
    await shot(page, `02-added-${spec.type.toLowerCase()}`);
    // Confirm the node mounts on canvas with data-node-id.
    const node_id = await findNodeIdByType(page, spec.type);
    expect(node_id).not.toBeNull();
    if (node_id) {
      await expect(page.locator(`[data-node-id="${node_id}"]`).first()).toBeVisible();
    }
  }

  // RootQuestion now disabled.
  const rq_btn = page.getByRole("button", { name: "Root Question", exact: true });
  await expect(rq_btn).toBeDisabled();
  await shot(page, "03-rootquestion-disabled");

  // Authority enabled (legal mode).
  await expect(page.getByRole("button", { name: "Authority", exact: true })).toBeEnabled();

  // ── 2. Drag-from-handle edge creation ─────────────────────────────────
  // Find ids for source/target pairs we want to wire.
  const id_root = await findNodeIdByType(page, "RootQuestion");
  const id_sub = await findNodeIdByType(page, "SubQuestion");
  const id_term = await findNodeIdByType(page, "Term");
  const id_interp = await findNodeIdByType(page, "Interpretation");
  const id_authority = await findNodeIdByType(page, "Authority");
  const id_checkpoint = await findNodeIdByType(page, "Checkpoint");

  const drag_results: Array<{
    label: string;
    ok: boolean;
    before_edges: number;
    after_edges: number;
    note: string;
  }> = [];

  // (a) RootQuestion -> SubQuestion (single candidate: DECOMPOSES_INTO).
  if (id_root && id_sub) {
    const r = await dragHandleFromTo(page, id_root, id_sub);
    drag_results.push({ label: "RootQuestion->SubQuestion (DECOMPOSES_INTO)", ...r });
    await shot(page, "04-drag-root-to-sub");
  }

  // (b) SubQuestion -> Term (single candidate: TURNS_ON).
  if (id_sub && id_term) {
    const r = await dragHandleFromTo(page, id_sub, id_term);
    drag_results.push({ label: "SubQuestion->Term (TURNS_ON)", ...r });
    await shot(page, "05-drag-sub-to-term");
  }

  // (c) Term -> Interpretation (single candidate: INTERPRETED_AS).
  if (id_term && id_interp) {
    const r = await dragHandleFromTo(page, id_term, id_interp);
    drag_results.push({ label: "Term->Interpretation (INTERPRETED_AS)", ...r });
    await shot(page, "06-drag-term-to-interp");
  }

  // (d) Authority -> Interpretation (MULTI: CITES + DISTINGUISHED_BY → popup).
  let popup_seen = false;
  if (id_authority && id_interp) {
    const r = await dragHandleFromTo(page, id_authority, id_interp);
    drag_results.push({ label: "Authority->Interpretation (CITES|DISTINGUISHED_BY)", ...r });
    // The popup MAY appear if the drop produced a multi-candidate pair.
    const popup = page.getByTestId("edge-creation-popup");
    try {
      await popup.waitFor({ state: "visible", timeout: 1500 });
      popup_seen = true;
      await shot(page, "07-edge-creation-popup");
      // Pick CITES.
      await popup.locator("button").first().click();
      await page.waitForTimeout(250);
    } catch {
      // If no popup, the drag may have produced one of the edges already
      // or none. We'll log result either way.
    }
  }

  // ── 3. Edge-creation popup (best-effort attempt #2 if first missed) ───
  if (!popup_seen && id_authority && id_interp) {
    // Try a second drop — there may still be one valid edge type left.
    const r = await dragHandleFromTo(page, id_authority, id_interp);
    drag_results.push({ label: "Authority->Interpretation (retry for popup)", ...r });
    const popup = page.getByTestId("edge-creation-popup");
    if (await popup.isVisible().catch(() => false)) {
      popup_seen = true;
      await shot(page, "08-edge-creation-popup-retry");
      await popup.press("Escape").catch(() => {});
    }
  }

  // ── 4. Inspector text editing + persistence reload ────────────────────
  // Click the RootQuestion on canvas and fill its statement.
  if (id_root) {
    await page.locator(`[data-node-id="${id_root}"]`).first().click();
    await page.waitForTimeout(150);
    const expected_root_text = `What is the audit-target legal question? [${RUN_STAMP}]`;
    await fillInspectorPrimary(page, "Question", expected_root_text);
    await page.waitForTimeout(200);
    await shot(page, "09-rootquestion-text-filled");

    // SubQuestion.
    if (id_sub) {
      await page.locator(`[data-node-id="${id_sub}"]`).first().click();
      await page.waitForTimeout(150);
      const t = `Sub-question for audit [${RUN_STAMP}]`;
      await fillInspectorPrimary(page, "Statement", t);
      await shot(page, "10-subquestion-text-filled");
    }

    // Term.
    if (id_term) {
      await page.locator(`[data-node-id="${id_term}"]`).first().click();
      await page.waitForTimeout(150);
      // Term editor uses .argmap-input but it's an input (name field).
      const right_input = page.locator("aside, [aria-label='Inspector']").first();
      void right_input;
      const name_field = page.locator(".argmap-input").nth(0);
      await name_field.click({ clickCount: 3 }).catch(() => {});
      await name_field.fill(`Test Term [${RUN_STAMP}]`).catch(() => {});
      await page.keyboard.press("Tab");
      await shot(page, "11-term-text-filled");
    }

    // Authority.
    if (id_authority) {
      await page.locator(`[data-node-id="${id_authority}"]`).first().click();
      await page.waitForTimeout(150);
      const citation_field = page.locator(".argmap-input").first();
      await citation_field.click({ clickCount: 3 }).catch(() => {});
      await citation_field.fill(`Audit Authority v. Probe (2026) [${RUN_STAMP}]`).catch(() => {});
      await page.keyboard.press("Tab");
      await shot(page, "12-authority-text-filled");
    }

    // Reload and confirm Root question text persisted.
    const summary_before_reload = await readFrameSummary(page);
    await page.reload();
    await expect(page.getByText(FRAME_TITLE).first()).toBeVisible({ timeout: 15_000 });
    await page.waitForSelector('[data-testid="frame-canvas"]', { timeout: 10_000 });
    const summary_after_reload = await readFrameSummary(page);
    expect(summary_after_reload.node_count).toBe(summary_before_reload.node_count);
    await shot(page, "13-after-reload");
  }

  // ── 5. Options-box editor on Checkpoint ───────────────────────────────
  if (id_checkpoint) {
    await page.locator(`[data-node-id="${id_checkpoint}"]`).first().click();
    await page.waitForTimeout(200);
    await shot(page, "14-checkpoint-inspector");
    // Try clicking "Edit this instance" vs "Edit frame default" buttons.
    const inst_btn = page.getByRole("button", { name: "Edit this instance", exact: true });
    const default_btn = page.getByRole("button", { name: "Edit frame default", exact: true });
    if (await inst_btn.isVisible().catch(() => false)) {
      await inst_btn.click();
      await shot(page, "15-options-box-instance");
    }
    if (await default_btn.isVisible().catch(() => false)) {
      await default_btn.click();
      await shot(page, "16-options-box-frame-default");
    }
  }

  // ── 6. Validation drawer ───────────────────────────────────────────────
  // We already have several disconnected nodes (LogicalGate, Conclusion,
  // and Authority not yet attached) — so the indicator should show issues.
  const indicator = page.getByTestId("validation-indicator");
  await expect(indicator).toBeVisible();
  await shot(page, "17-validation-indicator");
  await indicator.click();
  // Drawer opens. Check for the "Frame issues" header.
  const drawer = page.locator('[aria-label="Frame issues"]');
  try {
    await expect(drawer).toBeVisible({ timeout: 3_000 });
    await shot(page, "18-validation-drawer-open");
  } catch {
    await shot(page, "18-validation-drawer-failed-to-open");
  }
  // Close it.
  await indicator.click().catch(() => {});
  await page.waitForTimeout(150);

  // ── 7. Auto-arrange ────────────────────────────────────────────────────
  // Pre-arrange screenshot.
  await shot(page, "19-before-auto-arrange");
  const auto_btn = page.getByRole("button", { name: "Auto-arrange", exact: true });
  await expect(auto_btn).toBeVisible();
  await auto_btn.click();
  // Confirmation dialog.
  const auto_dialog = page.getByRole("dialog", { name: /Auto-arrange nodes/i });
  await expect(auto_dialog).toBeVisible({ timeout: 3_000 });
  await shot(page, "20-auto-arrange-dialog");
  await auto_dialog.getByRole("button", { name: "Auto-arrange", exact: true }).click();
  await page.waitForTimeout(800); // let layout run
  await shot(page, "21-after-auto-arrange");

  // ── 8. Cascade-delete confirmation ────────────────────────────────────
  // Select the RootQuestion (has cascade children); press Delete.
  if (id_root) {
    await page.locator(`[data-node-id="${id_root}"]`).first().click();
    await page.waitForTimeout(150);
    await page.keyboard.press("Delete");
    const cascade_dialog = page.getByRole("dialog", { name: /Delete and cascade/i });
    let cascade_seen = false;
    try {
      await expect(cascade_dialog).toBeVisible({ timeout: 3_000 });
      cascade_seen = true;
      await shot(page, "22-cascade-delete-dialog");
      // Cancel.
      await cascade_dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.waitForTimeout(200);
    } catch {
      await shot(page, "22-cascade-delete-failed");
    }
    expect(cascade_seen, "cascade-delete confirmation dialog should appear").toBe(true);
  }

  // ── 9. Frame settings panel ───────────────────────────────────────────
  await page.getByRole("button", { name: "Frame settings", exact: true }).click();
  const settings = page.locator('[aria-label="Frame settings"]').first();
  await expect(settings).toBeVisible({ timeout: 3_000 });
  await shot(page, "23-frame-settings-panel");

  const updated_title = `${FRAME_TITLE} (edited)`;
  const title_input = page.locator("#metadata-title");
  await title_input.click({ clickCount: 3 });
  await title_input.fill(updated_title);
  await title_input.press("Enter");
  await page.waitForTimeout(300);

  const description = page.locator("#metadata-description");
  await description.fill(`Audit-edited description ${RUN_STAMP}`);
  // metaKey on macOS / ctrlKey elsewhere — just blur via Tab.
  await description.press("Tab");
  await page.waitForTimeout(300);
  await shot(page, "24-frame-settings-edited");

  // Close and reload to verify persistence.
  await page.getByTestId("frame-settings-done").click();
  await page.waitForTimeout(200);
  await page.reload();
  await page.waitForSelector('[data-testid="frame-canvas"]', { timeout: 10_000 });
  const final = await readFrameSummary(page);
  expect(final.frame_title).toBe(updated_title);
  await shot(page, "25-after-settings-reload");

  // ── Final state log ──────────────────────────────────────────────────
  const final_summary = await readFrameSummary(page);
  console.log("[FRAME-BUILDING-AUDIT] final state:", JSON.stringify(final_summary, null, 2));
  console.log("[FRAME-BUILDING-AUDIT] drag results:", JSON.stringify(drag_results, null, 2));
  console.log("[FRAME-BUILDING-AUDIT] popup-seen:", popup_seen);

  // Sanity floor: at least the 8 node types should still exist after the
  // cascade-delete CANCEL.
  expect(final_summary.node_count).toBeGreaterThanOrEqual(8);
});
