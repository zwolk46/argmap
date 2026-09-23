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
 * IMPORTANT — drag step ordering: the drag-from-handle gesture has been
 * observed to trigger a React Flow ConnectionLine DOM-removal crash
 * (`removeChild` not a child of this node) which AppErrorBoundary catches
 * and re-mounts. Once that happens the page session is fragile. We
 * therefore run the drag attempts LAST so the rest of the audit lands its
 * screenshots first.
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
test.setTimeout(8 * 60_000);

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
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 5_000 });
  } catch (e) {
    console.error(`[shot] failed to take ${file}:`, (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Programmatic helpers for state assertions (NOT for gestures).
// ---------------------------------------------------------------------------
type ValidationDump = Array<{ severity: string; rule_id: string; message: string }>;
type AuditFrameSummary = {
  frame_id: string | undefined;
  frame_title: string | undefined;
  description: string | undefined;
  node_count: number;
  edge_count: number;
  node_types: string[];
  validation_count: number;
  validation_errors: number;
  validation: ValidationDump;
};

async function readFrameSummary(page: Page): Promise<AuditFrameSummary> {
  return page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: {
          getState(): {
            frame?: { id?: string; title?: string; description?: string };
            frame_version?: { nodes: Array<{ type: string }>; edges: Array<{ id: string }> };
            validation?: Array<{ severity: string; rule_id: string; message: string }>;
          };
        };
      };
    };
    const s = w.__argmap_test?.frame_store?.getState();
    return {
      frame_id: s?.frame?.id,
      frame_title: s?.frame?.title,
      description: s?.frame?.description,
      node_count: s?.frame_version?.nodes.length ?? 0,
      edge_count: s?.frame_version?.edges.length ?? 0,
      node_types: (s?.frame_version?.nodes ?? []).map((n) => n.type),
      validation_count: s?.validation?.length ?? 0,
      validation_errors: (s?.validation ?? []).filter((v) => v.severity === "error").length,
      validation: (s?.validation ?? []).map((v) => ({
        severity: v.severity,
        rule_id: v.rule_id,
        message: v.message,
      })),
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
// Drag helper.
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

  const src_visible = await source_handle.isVisible().catch(() => false);
  const tgt_visible = await target_node.isVisible().catch(() => false);
  if (!src_visible || !tgt_visible) {
    return {
      ok: false,
      before_edges: before.edge_count,
      after_edges: before.edge_count,
      note: `not visible — src=${src_visible} tgt=${tgt_visible}`,
    };
  }
  const src_box = await source_handle.boundingBox();
  const tgt_box = await target_node.boundingBox();
  if (!src_box || !tgt_box) {
    return {
      ok: false,
      before_edges: before.edge_count,
      after_edges: before.edge_count,
      note: `no bounding box`,
    };
  }

  const src_x = src_box.x + src_box.width / 2;
  const src_y = src_box.y + src_box.height / 2;
  const tgt_x = tgt_box.x + tgt_box.width / 2;
  const tgt_y = tgt_box.y + tgt_box.height / 2;

  await page.mouse.move(src_x, src_y);
  await page.mouse.down();
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const x = src_x + ((tgt_x - src_x) * i) / steps;
    const y = src_y + ((tgt_y - src_y) * i) / steps;
    await page.mouse.move(x, y, { steps: 1 });
  }
  await page.mouse.up();

  await page.waitForTimeout(400);
  const after = await readFrameSummary(page).catch(() => ({ ...before }) as AuditFrameSummary);
  return {
    ok: after.edge_count > before.edge_count,
    before_edges: before.edge_count,
    after_edges: after.edge_count,
    note: `gesture ${source_node_id}->${target_node_id}`,
  };
}

async function clickPalette(page: Page, aria_label: string): Promise<void> {
  await page
    .getByRole("button", { name: aria_label, exact: true })
    .click({ timeout: 5_000 });
  await page.waitForTimeout(80);
}

async function fillInspectorPrimary(page: Page, label: string, value: string): Promise<void> {
  void label;
  const textarea = page.locator("textarea.argmap-input").first();
  await textarea
    .waitFor({ state: "visible", timeout: 3_000 })
    .catch(() => {});
  await textarea.click({ clickCount: 3, timeout: 3_000 }).catch(() => {});
  await textarea.fill(value, { timeout: 3_000 }).catch(() => {});
  await page.keyboard.press("Tab");
}

test("Frame-building audit walkthrough", async ({ page }) => {
  test.info().annotations.push({ type: "audit", description: FRAME_TITLE });

  // ── Death detector. Records the first removeChild crash; lets later
  //    steps decide whether to skip (the page is dead but the harness
  //    is alive — we record but keep going where possible).
  let page_crashed: { stamp: number; message: string } | null = null;
  page.on("pageerror", (err) => {
    console.error("[pageerror]", err.message);
    if (!page_crashed && err.message.includes("removeChild")) {
      page_crashed = { stamp: Date.now(), message: err.message };
    }
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
  await page
    .getByRole("button", { name: /new frame/i })
    .first()
    .click();
  await expect(page.getByTestId("new-frame-wizard")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("wizard-mode-legal").click();
  await page.getByTestId("wizard-title-input").fill(FRAME_TITLE);
  await page.getByTestId("wizard-submit").click();
  await expect(page.getByText(FRAME_TITLE).first()).toBeVisible({ timeout: 15_000 });
  await page.waitForSelector('[data-testid="frame-canvas"]', { timeout: 10_000 });
  await shot(page, "01-frame-opened-empty");

  // ── 1. Palette breadth ─────────────────────────────────────────────────
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
    const node_id = await findNodeIdByType(page, spec.type);
    expect(node_id).not.toBeNull();
    if (node_id) {
      await expect(page.locator(`[data-node-id="${node_id}"]`).first()).toBeVisible();
    }
    await shot(page, `02-added-${spec.type.toLowerCase()}`);
  }

  // RootQuestion now disabled.
  const rq_btn = page.getByRole("button", { name: "Root Question", exact: true });
  await expect(rq_btn).toBeDisabled();
  await shot(page, "03-rootquestion-disabled");

  // Authority enabled (legal mode).
  await expect(page.getByRole("button", { name: "Authority", exact: true })).toBeEnabled();

  // Snapshot baseline validation (8 disconnected nodes → expect lots).
  const baseline = await readFrameSummary(page);
  console.log(
    "[FRAME-BUILDING-AUDIT] baseline validation rules:",
    JSON.stringify(baseline.validation, null, 2),
  );

  // Find ids once for everything below.
  const id_root = await findNodeIdByType(page, "RootQuestion");
  const id_sub = await findNodeIdByType(page, "SubQuestion");
  const id_term = await findNodeIdByType(page, "Term");
  const id_interp = await findNodeIdByType(page, "Interpretation");
  const id_authority = await findNodeIdByType(page, "Authority");
  const id_checkpoint = await findNodeIdByType(page, "Checkpoint");

  // ── 4. Inspector text editing (run BEFORE drags to avoid crash) ───────
  if (id_root) {
    await page.locator(`[data-node-id="${id_root}"]`).first().click({ timeout: 3_000 });
    await page.waitForTimeout(200);
    const expected_root_text = `What is the audit-target legal question? [${RUN_STAMP}]`;
    await fillInspectorPrimary(page, "Question", expected_root_text);
    await page.waitForTimeout(150);
    await shot(page, "04-rootquestion-text-filled");
  }
  if (id_sub) {
    await page.locator(`[data-node-id="${id_sub}"]`).first().click({ timeout: 3_000 });
    await page.waitForTimeout(200);
    await fillInspectorPrimary(page, "Statement", `Sub-question for audit [${RUN_STAMP}]`);
    await page.waitForTimeout(150);
    await shot(page, "05-subquestion-text-filled");
  }
  if (id_term) {
    await page.locator(`[data-node-id="${id_term}"]`).first().click({ timeout: 3_000 });
    await page.waitForTimeout(200);
    // Term editor uses input (name field), not textarea.
    const name_field = page
      .locator("input.argmap-input")
      .first();
    await name_field.click({ clickCount: 3, timeout: 3_000 }).catch(() => {});
    await name_field.fill(`Test Term [${RUN_STAMP}]`, { timeout: 3_000 }).catch(() => {});
    await page.keyboard.press("Tab");
    await shot(page, "06-term-text-filled");
  }
  if (id_authority) {
    await page.locator(`[data-node-id="${id_authority}"]`).first().click({ timeout: 3_000 });
    await page.waitForTimeout(200);
    const citation_field = page.locator("input.argmap-input").first();
    await citation_field.click({ clickCount: 3, timeout: 3_000 }).catch(() => {});
    await citation_field
      .fill(`Audit Authority v. Probe (2026) [${RUN_STAMP}]`, { timeout: 3_000 })
      .catch(() => {});
    await page.keyboard.press("Tab");
    await shot(page, "07-authority-text-filled");
  }

  // Flush pending autosave (5s idle debounce) BEFORE reload, otherwise
  // the patch never reaches Supabase and the reload shows the pre-edit
  // state. saveFrameMilestone() bypasses the debounce.
  await page.evaluate(async () => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: {
          getState(): { saveFrameMilestone(s?: string): Promise<void> };
        };
      };
    };
    await w.__argmap_test?.frame_store?.getState().saveFrameMilestone("audit-flush");
  });
  await page.waitForTimeout(500);

  // Reload to verify persistence.
  const before_reload = await readFrameSummary(page);
  await page.reload();
  await expect(page.getByText(FRAME_TITLE).first()).toBeVisible({ timeout: 15_000 });
  await page.waitForSelector('[data-testid="frame-canvas"]', { timeout: 10_000 });
  // Wait for the frame_store to finish loading the nodes.
  await page.waitForFunction(
    (expected) => {
      const w = window as unknown as {
        __argmap_test?: {
          frame_store?: {
            getState(): {
              is_loading: boolean;
              frame_version?: { nodes: Array<unknown> };
            };
          };
        };
      };
      const s = w.__argmap_test?.frame_store?.getState();
      return s && !s.is_loading && (s.frame_version?.nodes.length ?? 0) >= expected;
    },
    before_reload.node_count,
    { timeout: 10_000 },
  );
  const after_reload = await readFrameSummary(page);
  expect(after_reload.node_count).toBe(before_reload.node_count);
  await shot(page, "08-after-reload");

  // ── 5. Options-box editor on Checkpoint ───────────────────────────────
  if (id_checkpoint) {
    await page
      .locator(`[data-node-id="${id_checkpoint}"]`)
      .first()
      .click({ timeout: 3_000 });
    await page.waitForTimeout(250);
    await shot(page, "09-checkpoint-inspector");
    const inst_btn = page.getByRole("button", { name: "Edit this instance", exact: true });
    const default_btn = page.getByRole("button", { name: "Edit frame default", exact: true });
    if (await inst_btn.isVisible().catch(() => false)) {
      await inst_btn.click({ timeout: 3_000 });
      await page.waitForTimeout(150);
      await shot(page, "10-options-box-instance");
    }
    if (await default_btn.isVisible().catch(() => false)) {
      await default_btn.click({ timeout: 3_000 });
      await page.waitForTimeout(150);
      await shot(page, "11-options-box-frame-default");
    }
  }

  // ── 6. Validation drawer ───────────────────────────────────────────────
  const indicator = page.getByTestId("validation-indicator");
  await expect(indicator).toBeVisible();
  await shot(page, "12-validation-indicator");
  await indicator.click({ timeout: 3_000 });
  const drawer = page.locator('[aria-label="Frame issues"]');
  const drawer_opened = await drawer.isVisible({ timeout: 3_000 }).catch(() => false);
  if (drawer_opened) {
    await shot(page, "13-validation-drawer-open");
    // Click jump-to-node affordance on first row if available.
    const first_row_button = page
      .locator('[aria-label="Frame issues"] button')
      .nth(1); // skip header close button
    if (await first_row_button.isVisible().catch(() => false)) {
      await first_row_button.click({ timeout: 3_000 }).catch(() => {});
      await page.waitForTimeout(200);
      await shot(page, "14-validation-row-clicked");
    }
  } else {
    await shot(page, "13-validation-drawer-failed-to-open");
  }
  // Close drawer (click indicator again).
  await indicator.click({ timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(150);

  // ── 7. Auto-arrange ────────────────────────────────────────────────────
  await shot(page, "15-before-auto-arrange");
  const auto_btn = page.getByRole("button", { name: "Auto-arrange", exact: true });
  await expect(auto_btn).toBeVisible();
  await auto_btn.click({ timeout: 3_000 });
  const auto_dialog = page.getByRole("dialog", { name: /Auto-arrange nodes/i });
  await expect(auto_dialog).toBeVisible({ timeout: 3_000 });
  await shot(page, "16-auto-arrange-dialog");
  await auto_dialog.getByRole("button", { name: "Auto-arrange", exact: true }).click({
    timeout: 3_000,
  });
  await page.waitForTimeout(1500); // let ELK layout run
  await shot(page, "17-after-auto-arrange");

  // ── 9. Frame settings panel ───────────────────────────────────────────
  await page
    .getByRole("button", { name: "Frame settings", exact: true })
    .click({ timeout: 3_000 });
  const settings = page.locator('[aria-label="Frame settings"]').first();
  await expect(settings).toBeVisible({ timeout: 3_000 });
  await shot(page, "18-frame-settings-panel");

  const updated_title = `${FRAME_TITLE} (edited)`;
  const title_input = page.locator("#metadata-title");
  await title_input.click({ clickCount: 3, timeout: 3_000 });
  await title_input.fill(updated_title, { timeout: 3_000 });
  await title_input.press("Enter");
  await page.waitForTimeout(300);

  const description = page.locator("#metadata-description");
  await description.fill(`Audit-edited description ${RUN_STAMP}`, { timeout: 3_000 });
  await description.press("Tab");
  await page.waitForTimeout(300);
  await shot(page, "19-frame-settings-edited");

  await page.getByTestId("frame-settings-done").click({ timeout: 3_000 });
  await page.waitForTimeout(300);
  // Flush autosave so metadata edits survive the reload. Catch
  // exceptions and log them — we want to know if milestone save fails.
  const flush_result = await page.evaluate(async () => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: {
          getState(): {
            saveFrameMilestone(s?: string): Promise<void>;
            frame?: { title?: string };
          };
        };
      };
    };
    const state_before = w.__argmap_test?.frame_store?.getState();
    const title_before = state_before?.frame?.title;
    try {
      await state_before?.saveFrameMilestone("audit-flush-settings");
      return { ok: true, title_before, error: null };
    } catch (e) {
      return { ok: false, title_before, error: (e as Error).message };
    }
  });
  console.log(
    "[FRAME-BUILDING-AUDIT] settings flush result:",
    JSON.stringify(flush_result, null, 2),
  );
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForSelector('[data-testid="frame-canvas"]', { timeout: 10_000 });
  await page.waitForFunction(
    (expected_title) => {
      const w = window as unknown as {
        __argmap_test?: {
          frame_store?: {
            getState(): {
              is_loading: boolean;
              frame?: { title?: string };
            };
          };
        };
      };
      const s = w.__argmap_test?.frame_store?.getState();
      return s && !s.is_loading && s.frame?.title === expected_title;
    },
    updated_title,
    { timeout: 10_000 },
  );
  const settings_persisted = await readFrameSummary(page);
  expect(settings_persisted.frame_title).toBe(updated_title);
  expect(settings_persisted.description).toContain(`Audit-edited description ${RUN_STAMP}`);
  await shot(page, "20-after-settings-reload");

  // ── 8. Cascade-delete confirmation (still before drags) ───────────────
  const id_root_post_reload = await findNodeIdByType(page, "RootQuestion");
  if (id_root_post_reload) {
    await page
      .locator(`[data-node-id="${id_root_post_reload}"]`)
      .first()
      .click({ timeout: 3_000 });
    await page.waitForTimeout(200);
    await page.keyboard.press("Delete");
    const cascade_dialog = page.getByRole("dialog", { name: /Delete and cascade/i });
    let cascade_seen = false;
    try {
      await expect(cascade_dialog).toBeVisible({ timeout: 3_000 });
      cascade_seen = true;
      await shot(page, "21-cascade-delete-dialog");
      await cascade_dialog.getByRole("button", { name: "Cancel", exact: true }).click({
        timeout: 3_000,
      });
      await page.waitForTimeout(200);
    } catch {
      await shot(page, "21-cascade-delete-failed");
    }
    expect(cascade_seen, "cascade-delete confirmation should appear").toBe(true);
  }

  // ── 2 + 3. Drag-from-handle edge creation (RUN LAST). ─────────────────
  // Re-resolve ids — the page was reloaded earlier.
  const drag_ids = {
    root: await findNodeIdByType(page, "RootQuestion"),
    sub: await findNodeIdByType(page, "SubQuestion"),
    term: await findNodeIdByType(page, "Term"),
    interp: await findNodeIdByType(page, "Interpretation"),
    authority: await findNodeIdByType(page, "Authority"),
  };

  const drag_results: Array<{
    label: string;
    ok: boolean;
    before_edges: number;
    after_edges: number;
    note: string;
  }> = [];

  console.log("[FRAME-BUILDING-AUDIT] starting drag attempts");

  // (a) RootQuestion -> SubQuestion (single candidate: DECOMPOSES_INTO).
  if (drag_ids.root && drag_ids.sub && !page_crashed) {
    console.log("[FRAME-BUILDING-AUDIT] drag root->sub");
    const r = await dragHandleFromTo(page, drag_ids.root, drag_ids.sub);
    drag_results.push({ label: "RootQuestion->SubQuestion (DECOMPOSES_INTO)", ...r });
    if (!page_crashed) await shot(page, "22-drag-root-to-sub");
  }

  // (b) SubQuestion -> Term (single candidate: TURNS_ON).
  if (drag_ids.sub && drag_ids.term && !page_crashed) {
    console.log("[FRAME-BUILDING-AUDIT] drag sub->term");
    const r = await dragHandleFromTo(page, drag_ids.sub, drag_ids.term);
    drag_results.push({ label: "SubQuestion->Term (TURNS_ON)", ...r });
    if (!page_crashed) await shot(page, "23-drag-sub-to-term");
  }

  // (c) Term -> Interpretation (single candidate: INTERPRETED_AS).
  if (drag_ids.term && drag_ids.interp && !page_crashed) {
    console.log("[FRAME-BUILDING-AUDIT] drag term->interp");
    const r = await dragHandleFromTo(page, drag_ids.term, drag_ids.interp);
    drag_results.push({ label: "Term->Interpretation (INTERPRETED_AS)", ...r });
    if (!page_crashed) await shot(page, "24-drag-term-to-interp");
  }

  // (d) Authority -> Interpretation (multi-candidate -> popup).
  let popup_seen = false;
  if (drag_ids.authority && drag_ids.interp && !page_crashed) {
    console.log("[FRAME-BUILDING-AUDIT] drag authority->interp (popup expected)");
    const r = await dragHandleFromTo(page, drag_ids.authority, drag_ids.interp);
    drag_results.push({ label: "Authority->Interpretation (CITES|DISTINGUISHED_BY)", ...r });
    if (!page_crashed) {
      const popup = page.getByTestId("edge-creation-popup");
      try {
        await popup.waitFor({ state: "visible", timeout: 1500 });
        popup_seen = true;
        await shot(page, "25-edge-creation-popup");
        await popup.locator("button").first().click({ timeout: 3_000 });
        await page.waitForTimeout(250);
      } catch {
        // popup may not appear if drag silently failed.
      }
    }
  }

  // Save final state.
  if (!page_crashed) {
    await shot(page, "26-final");
  }
  const final_summary = await readFrameSummary(page).catch(() => null);
  console.log(
    "[FRAME-BUILDING-AUDIT] final:",
    JSON.stringify(
      {
        page_crashed,
        drag_results,
        popup_seen,
        final_node_count: final_summary?.node_count,
        final_edge_count: final_summary?.edge_count,
        final_validation_errors: final_summary?.validation_errors,
        final_validation_count: final_summary?.validation_count,
      },
      null,
      2,
    ),
  );

  // We expect at least 7 nodes after cascade-cancel (8 added, RootQuestion
  // selected but cancelled — so all 8 still present).
  if (final_summary) {
    expect(final_summary.node_count).toBeGreaterThanOrEqual(7);
  }
});
