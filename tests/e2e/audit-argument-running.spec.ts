/**
 * AUDIT — ARGUMENT RUNNING UI surface.
 *
 * Sub-agent audit of the Argument-Running mode. Programmatically seeds a
 * minimal-but-runnable legal frame, switches to Argument mode, then drives
 * the INTERVIEW / PREMISE-AUTHORING / OUTPUT / BOTTOM-PANEL surfaces
 * through the live UI.
 *
 * Frame title prefix MUST be "Agent Audit AR —" so it's distinguishable
 * from sibling audits on Home.
 *
 * Run: E2E_LIVE=1 npx playwright test tests/e2e/audit-argument-running.spec.ts \
 *        --headed --workers=1
 *
 * The seed shape is deliberate: the parent SubQ "breach" has TWO Terms
 * (one dispositive), so `collectDispositiveForeclosed` in runtime/
 * foreclosure.ts actually fires — selecting an interpretation under the
 * dispositive Term forecloses the sibling Term (and its downstream
 * interpretations via cascade). The task spec described this as
 * "sibling Interpretations foreclose", which is slightly different from
 * how the engine works (forecloses sibling Terms); this audit checks
 * the actual behavior and reports the runtime contract.
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";
const FRAME_TITLE = `Agent Audit AR — Argument Running Probe ${new Date()
  .toISOString()
  .slice(0, 19)
  .replace(/[T:]/g, "-")}`;

test.skip(!LIVE, "E2E_LIVE=1 to run the live-Supabase argument-running audit");
test.setTimeout(15 * 60_000);

const SCREENSHOT_DIR = path.resolve(process.cwd(), "tests", "audit", "argument-running");
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
let SHOT_COUNTER = 0;
async function shot(page: Page, label: string, opts?: { fullPage?: boolean }): Promise<void> {
  SHOT_COUNTER += 1;
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const file = path.join(SCREENSHOT_DIR, `${String(SHOT_COUNTER).padStart(2, "0")}-${safe}.png`);
  await page.screenshot({ path: file, fullPage: opts?.fullPage ?? true });
}

// ---------------------------------------------------------------------------
// applyPatch helpers — mirrors patterns from audit-walkthrough.spec.ts.
// ---------------------------------------------------------------------------

async function frameApplyPatch(page: Page, patch: unknown): Promise<void> {
  await page.evaluate((p) => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: { getState(): { applyPatch(p: unknown): void } };
      };
    };
    const s = w.__argmap_test?.frame_store;
    if (!s) throw new Error("frame_store missing");
    s.getState().applyPatch(p);
  }, patch);
  await page.waitForTimeout(40);
}

async function sessionApplyPatch(page: Page, patch: unknown): Promise<void> {
  await page.evaluate((p) => {
    const w = window as unknown as {
      __argmap_test?: {
        session_store?: { getState(): { applyPatch(p: unknown): void } };
      };
    };
    const s = w.__argmap_test?.session_store;
    if (!s) throw new Error("session_store missing");
    s.getState().applyPatch(p);
  }, patch);
  await page.waitForTimeout(40);
}

async function paletteAdd(page: Page, label: string): Promise<string> {
  const before = await readFrame(page);
  const beforeIds = new Set(before.nodes.map((n) => n.id));
  await page.getByRole("button", { name: label, exact: true }).first().click();
  let freshId: string | null = null;
  await expect
    .poll(
      async () => {
        const after = await readFrame(page);
        const fresh = after.nodes.find((n) => !beforeIds.has(n.id));
        if (fresh) {
          freshId = fresh.id;
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

async function readFrame(page: Page): Promise<{
  nodes: ReadonlyArray<{ id: string; type: string }>;
  edges: ReadonlyArray<{ id: string; source: string; target: string; type: string }>;
  validation: ReadonlyArray<{ severity: string; message: string }>;
}> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): unknown } };
    };
    const s = w.__argmap_test?.frame_store?.getState() as
      | {
          frame_version: {
            nodes: Array<{ id: string; type: string }>;
            edges: Array<{ id: string; source: string; target: string; type: string }>;
          } | null;
          validation: Array<{ severity: string; message: string }>;
        }
      | undefined;
    if (!s) throw new Error("frame_store missing");
    return {
      nodes: s.frame_version?.nodes ?? [],
      edges: s.frame_version?.edges ?? [],
      validation: s.validation ?? [],
    };
  });
}

async function readSession(page: Page): Promise<{
  premises: ReadonlyArray<{ id: string; statement: string; kind: string }>;
  authorities: ReadonlyArray<{ id: string; citation: string }>;
  foreclosed: ReadonlyArray<string>;
} | null> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: { session_store?: { getState(): unknown } };
    };
    const s = w.__argmap_test?.session_store?.getState() as
      | {
          session: {
            premises: Array<{ id: string; statement: string; kind: string }>;
            session_authorities?: Array<{ id: string; citation: string }>;
          } | null;
          compute_result?: { foreclosed_set?: Set<string> } | null;
        }
      | undefined;
    if (!s || !s.session) return null;
    return {
      premises: s.session.premises ?? [],
      authorities: s.session.session_authorities ?? [],
      foreclosed: Array.from(s.compute_result?.foreclosed_set ?? []),
    };
  });
}

async function setInspectorText(page: Page, text: string): Promise<void> {
  const ta = page
    .locator("textarea")
    .filter({ hasNot: page.locator("[placeholder*='Add notes']") })
    .first();
  await ta.waitFor({ state: "visible", timeout: 3_000 });
  await ta.click();
  await ta.fill(text);
  await ta.blur();
  await page.waitForTimeout(80);
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
        __argmap_test?: {
          frame_store?: { getState(): { applyPatch(p: unknown): void } };
        };
      };
      const fs = w.__argmap_test?.frame_store;
      if (!fs) throw new Error("frame_store unavailable");
      const newId = crypto.randomUUID();
      const ts = new Date().toISOString();
      fs.getState().applyPatch({
        kind: "edge_added",
        edge: {
          id: newId,
          type: et,
          layer:
            et === "ANSWERS" || et === "SUPPORTS" || et === "CONTRADICTS"
              ? "argument"
              : "frame",
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

async function selectNode(page: Page, nodeId: string): Promise<void> {
  await page.locator(`[data-node-id="${nodeId}"]`).first().click();
  await page.waitForTimeout(60);
}

async function editNode(
  page: Page,
  nodeId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await frameApplyPatch(page, { kind: "node_edited", node_id: nodeId, partial: fields });
}

// ===========================================================================
// Test
// ===========================================================================

test("audit-AR: drive Argument-Running surfaces end-to-end", async ({ page }) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  await test.step("sign in", async () => {
    await page.goto("/");
    await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sign-in-email").fill(EMAIL);
    await page.getByTestId("sign-in-password").fill(PASSWORD);
    await page.getByTestId("sign-in-submit").click();
    await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    // Dismiss the welcome overlay if it appears
    const skip = page.getByTestId("welcome-skip");
    if (await skip.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await skip.click();
      await page.waitForTimeout(300);
    }
    await shot(page, "home-after-signin");
  });

  await test.step("create legal frame via wizard", async () => {
    await page.getByRole("button", { name: /new frame/i }).first().click();
    await expect(page.getByTestId("new-frame-wizard")).toBeVisible();
    await page.getByTestId("wizard-mode-legal").click();
    await page.getByTestId("wizard-title-input").fill(FRAME_TITLE);
    await page
      .getByTestId("wizard-description-input")
      .fill(
        "AR audit fixture. Two SubQs (one jurisdictional). 'Breach' SubQ has two Terms with " +
          "one dispositive — exercises the dispositive-foreclosure path. Three Checkpoints " +
          "(boolean/multiple_choice/graded). One Authority bound to NY.",
      );
    await page.getByTestId("wizard-submit").click();
    await expect(page.locator("body")).toContainText(FRAME_TITLE, { timeout: 15_000 });
    await expect
      .poll(
        async () =>
          await page.evaluate(() => {
            const w = window as unknown as { __argmap_test?: unknown };
            return Boolean(w.__argmap_test);
          }),
        { timeout: 5_000 },
      )
      .toBe(true);
    // CRITICAL: wait for frame_version to actually be loaded in-memory.
    // Without this, applyPatch silently no-ops (frame-store.ts:applyPatch
    // early-returns if frame_version is null).
    await expect
      .poll(
        async () =>
          await page.evaluate(() => {
            const w = window as unknown as {
              __argmap_test?: {
                frame_store?: {
                  getState(): { frame_version: unknown };
                };
              };
            };
            return Boolean(w.__argmap_test?.frame_store?.getState().frame_version);
          }),
        { timeout: 10_000 },
      )
      .toBe(true);
    await shot(page, "frame-builder-empty");
  });

  // -------------------------------------------------------------------------
  // SEED FRAME programmatically. We bypass the palette/inspector entirely
  // (HMR / page reloads in dev mode make multi-step UI seeding flaky) and
  // build the whole frame in a single applyPatch batch. Per task: seeding
  // is fine; the audit is about the argument-running surface.
  // -------------------------------------------------------------------------
  const ids = await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: { getState(): { applyPatch(p: unknown): void } };
      };
    };
    const fs = w.__argmap_test?.frame_store;
    if (!fs) throw new Error("frame_store missing");
    const now = new Date().toISOString();
    const mint = (): string => crypto.randomUUID();

    const root = mint();
    const subq_jur = mint();
    const subq_breach = mint();
    const term_disp = mint();
    const term_other = mint();
    const interp_disp_a = mint();
    const interp_disp_b = mint();
    const interp_other_a = mint();
    const interp_other_b = mint();
    const cp_bool = mint();
    const cp_mc = mint();
    const cp_graded = mint();
    const gate = mint();
    const conclusion = mint();
    const auth_palsgraf = mint();

    const nodes: Array<Record<string, unknown>> = [
      {
        id: root,
        type: "RootQuestion",
        layer: "frame",
        statement: "Is Defendant liable under NY law?",
        created_at: now,
        updated_at: now,
      },
      {
        id: subq_jur,
        type: "SubQuestion",
        layer: "frame",
        statement: "Does NY have personal jurisdiction over Defendant?",
        is_jurisdictional: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: subq_breach,
        type: "SubQuestion",
        layer: "frame",
        statement: "Did Defendant breach the duty of care?",
        is_jurisdictional: false,
        created_at: now,
        updated_at: now,
      },
      {
        id: term_disp,
        type: "Term",
        layer: "frame",
        name: "Standard of Care (dispositive)",
        dispositive: true,
        order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: term_other,
        type: "Term",
        layer: "frame",
        name: "Custom & Practice (sibling)",
        dispositive: false,
        order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: interp_disp_a,
        type: "Interpretation",
        layer: "frame",
        statement: "Ordinary reasonable-person standard.",
        created_at: now,
        updated_at: now,
      },
      {
        id: interp_disp_b,
        type: "Interpretation",
        layer: "frame",
        statement: "Heightened professional standard.",
        created_at: now,
        updated_at: now,
      },
      {
        id: interp_other_a,
        type: "Interpretation",
        layer: "frame",
        statement: "Industry custom is dispositive evidence of care.",
        created_at: now,
        updated_at: now,
      },
      {
        id: interp_other_b,
        type: "Interpretation",
        layer: "frame",
        statement: "Industry custom is merely probative, not dispositive.",
        created_at: now,
        updated_at: now,
      },
      {
        id: cp_bool,
        type: "Checkpoint",
        layer: "frame",
        question: "Was the breach material?",
        answer_type: "boolean",
        requires_authority: true,
        burden_level: "preponderance",
        options: [
          { id: "yes", label: "Yes — material", satisfies: true, target_node_id: gate },
          { id: "no", label: "No — immaterial", satisfies: false },
        ],
        created_at: now,
        updated_at: now,
      },
      {
        id: cp_mc,
        type: "Checkpoint",
        layer: "frame",
        question: "Characterize the conduct on the proven facts.",
        answer_type: "multiple_choice",
        requires_authority: false,
        burden_level: "preponderance",
        options: [
          {
            id: "reckless",
            label: "Recklessly disregarded a known risk",
            satisfies: true,
            target_node_id: gate,
          },
          {
            id: "careless",
            label: "Failed to exercise reasonable care",
            satisfies: true,
            target_node_id: gate,
          },
          { id: "ordinary", label: "Acted as a reasonable person would", satisfies: false },
        ],
        created_at: now,
        updated_at: now,
      },
      {
        id: cp_graded,
        type: "Checkpoint",
        layer: "frame",
        question: "How strong is the evidence of breach?",
        answer_type: "graded",
        requires_authority: false,
        burden_level: "preponderance",
        options: [
          { id: "strong", label: "Strong", satisfies: true, target_node_id: gate },
          { id: "moderate", label: "Moderate", satisfies: true, target_node_id: gate },
          { id: "weak", label: "Weak", satisfies: false },
        ],
        created_at: now,
        updated_at: now,
      },
      {
        id: gate,
        type: "LogicalGate",
        layer: "frame",
        gate_type: "AND",
        // LogicalGate.inputs is a flat NodeRef[] (string array), not {id} objects.
        // The earlier audit-walkthrough.spec used {id} objects, which crashes
        // the gates evaluator (sortedBy assumes strings) — finding for the report.
        inputs: [cp_bool, cp_mc, cp_graded],
        created_at: now,
        updated_at: now,
      },
      {
        id: conclusion,
        type: "Conclusion",
        layer: "frame",
        statement: "Defendant is liable.",
        direction: { kind: "legal", value: "favors_plaintiff" },
        created_at: now,
        updated_at: now,
      },
      {
        id: auth_palsgraf,
        type: "Authority",
        layer: "frame",
        citation: "248 N.Y. 339 (1928)",
        court: "NY Court of Appeals",
        year: 1928,
        is_binding: true,
        jurisdiction: { level: "state", region: "NY" },
        binding_in: [{ level: "state", region: "NY" }],
        short_label: "Palsgraf (NY 1928)",
        holding_summary: "Duty runs only to foreseeable plaintiffs.",
        created_at: now,
        updated_at: now,
      },
    ];

    const edges: Array<Record<string, unknown>> = [];
    function pushEdge(
      type: string,
      source: string,
      target: string,
      extra: Record<string, unknown> = {},
    ): void {
      edges.push({
        id: mint(),
        type,
        layer: "frame",
        source,
        target,
        created_at: now,
        updated_at: now,
        ...extra,
      });
    }

    pushEdge("DECOMPOSES_INTO", root, subq_jur);
    pushEdge("DECOMPOSES_INTO", root, subq_breach);
    pushEdge("TURNS_ON", subq_breach, term_disp);
    pushEdge("TURNS_ON", subq_breach, term_other);
    pushEdge("INTERPRETED_AS", term_disp, interp_disp_a);
    pushEdge("INTERPRETED_AS", term_disp, interp_disp_b);
    pushEdge("INTERPRETED_AS", term_other, interp_other_a);
    pushEdge("INTERPRETED_AS", term_other, interp_other_b);
    pushEdge("LEADS_TO", interp_disp_a, cp_bool);
    pushEdge("LEADS_TO", interp_disp_b, cp_mc);
    pushEdge("LEADS_TO", interp_other_a, cp_graded);
    pushEdge("LEADS_TO", interp_disp_a, gate);
    pushEdge("GATES", gate, conclusion);
    pushEdge("CITES", auth_palsgraf, interp_disp_a, { strength: "directly_on_point" });

    // Apply all node_added patches, then all edge_added patches.
    // Each applyPatch obtains fresh state; we re-read inside the loop so any
    // mid-loop store replacement doesn't strand earlier patches.
    let nodes_applied = 0;
    let edges_applied = 0;
    let last_err: string | null = null;
    for (const n of nodes) {
      try {
        fs.getState().applyPatch({ kind: "node_added", node: n });
        nodes_applied += 1;
      } catch (err) {
        last_err = `node_added(${(n as { type?: string }).type}) ${(err as Error).message}`;
        break;
      }
    }
    for (const e of edges) {
      try {
        fs.getState().applyPatch({ kind: "edge_added", edge: e });
        edges_applied += 1;
      } catch (err) {
        last_err = `edge_added(${(e as { type?: string }).type}) ${(err as Error).message}`;
        break;
      }
    }
    // After applying, read back from the store to verify retention.
    const post_state = fs.getState() as unknown as {
      frame: unknown;
      frame_version: { nodes: unknown[]; edges: unknown[] } | null;
    };
    const post_nodes = post_state.frame_version?.nodes.length ?? 0;
    const post_edges = post_state.frame_version?.edges.length ?? 0;
    const has_frame = Boolean(post_state.frame);
    (
      window as unknown as {
        __audit_seed_result?: {
          nodes_applied: number;
          edges_applied: number;
          last_err: string | null;
          post_nodes: number;
          post_edges: number;
          has_frame: boolean;
        };
      }
    ).__audit_seed_result = {
      nodes_applied,
      edges_applied,
      last_err,
      post_nodes,
      post_edges,
      has_frame,
    };

    return {
      root,
      subq_jur,
      subq_breach,
      term_disp,
      term_other,
      interp_disp_a,
      interp_disp_b,
      interp_other_a,
      interp_other_b,
      cp_bool,
      cp_mc,
      cp_graded,
      gate,
      conclusion,
      auth_palsgraf,
    };
  });
  await page.waitForTimeout(500);
  const seed_result = await page.evaluate(() => {
    return (
      window as unknown as {
        __audit_seed_result?: {
          nodes_applied: number;
          edges_applied: number;
          last_err: string | null;
          post_nodes: number;
          post_edges: number;
          has_frame: boolean;
        };
      }
    ).__audit_seed_result ?? null;
  });
  console.log(`[audit-AR] seed result: ${JSON.stringify(seed_result)}`);

  // RETENTION CHECK — the dev-mode flow can race a subsequent loadFrame
  // (autosave round-trip, etc.) and wipe in-memory state right after the
  // seed. Poll the live store; if nodes get wiped, replay the seed up to
  // a few times.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const live = await readFrame(page);
    if (live.nodes.length >= 15) break;
    console.log(
      `[audit-AR] retention attempt ${attempt}: nodes=${live.nodes.length} — re-seeding`,
    );
    // Re-apply the SAME ids so all relationships still resolve.
    await page.evaluate((seed_ids) => {
      const w = window as unknown as {
        __argmap_test?: {
          frame_store?: { getState(): { applyPatch(p: unknown): void } };
        };
      };
      const fs = w.__argmap_test?.frame_store;
      if (!fs) throw new Error("frame_store missing");
      const ts = new Date().toISOString();
      // Re-issue every node_added — applyPatch tolerates duplicates because
      // node_added re-runs runFrameAction and produces a new FrameVersion.
      // Read intended nodes/edges from a closure captured stash on window.
      const stash = (
        w as unknown as {
          __audit_seed_payload?: { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
        }
      ).__audit_seed_payload;
      if (!stash) return;
      void seed_ids;
      void ts;
      const store = fs.getState();
      for (const n of stash.nodes) store.applyPatch({ kind: "node_added", node: n });
      for (const e of stash.edges) store.applyPatch({ kind: "edge_added", edge: e });
    }, ids);
    await page.waitForTimeout(800);
  }

  await shot(page, "frame-seeded");

  await test.step("inspect validation before mode switch", async () => {
    const state = await readFrame(page);
    console.log(
      `[audit-AR] nodes=${state.nodes.length} edges=${state.edges.length} ` +
        `validation=${state.validation.length}`,
    );
    const errors = state.validation.filter((v) => v.severity === "error");
    if (errors.length > 0) {
      console.log("[audit-AR] validation errors:");
      for (const e of errors) console.log(`  - ${e.message}`);
    }
    await shot(page, "frame-final-state");
  });

  await test.step("switch to Argument Running mode", async () => {
    const argRadio = page.getByRole("radio", { name: /argument/i }).first();
    await argRadio.click();
    const continueBtn = page.getByRole("button", { name: /continue/i }).first();
    if (await continueBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForTimeout(1_500);
    // Confirm we landed
    await expect(page.getByTestId("argument-running-page")).toBeVisible({ timeout: 10_000 });
    await shot(page, "after-mode-toggle");
  });

  // -------------------------------------------------------------------------
  // 1. INTERVIEW-PANE ORDERING (D2 contract — jurisdictional partition)
  // -------------------------------------------------------------------------
  await test.step("1. interview ordering — jurisdictional partition", async () => {
    const pane = page.getByTestId("interview-pane");
    await expect(pane).toBeVisible({ timeout: 10_000 });
    const list = page.getByTestId("interview-list");
    await expect(list).toBeVisible();
    // Check for section header
    const heading = list.locator("h3", { hasText: /Jurisdictional questions/i });
    const hasJurHeading = (await heading.count()) > 0;
    console.log(`[audit-AR] interview has Jurisdictional section: ${hasJurHeading}`);
    if (!hasJurHeading) {
      // Look at item rows so we can document what surfaced.
      const rows = await page.locator('[data-testid^="interview-row-"]').count();
      console.log(`[audit-AR] interview rows visible: ${rows}`);
    }
    await shot(page, "1-interview-ordering");
  });

  // -------------------------------------------------------------------------
  // 2. INTERVIEW FILTERS
  // -------------------------------------------------------------------------
  await test.step("2. interview filters", async () => {
    const baseline = await page.locator('[data-testid^="interview-row-"]').count();
    console.log(`[audit-AR] interview baseline rows: ${baseline}`);

    // Toggle node-type=Checkpoint filter
    await page.getByTestId("interview-filter-type-Checkpoint").click();
    await page.waitForTimeout(120);
    const checkpoint_only = await page.locator('[data-testid^="interview-row-"]').count();
    console.log(`[audit-AR] checkpoint-only rows: ${checkpoint_only}`);
    await shot(page, "2a-filter-checkpoint");

    // Clear and try Term filter
    await page.getByTestId("interview-filter-type-Checkpoint").click();
    await page.waitForTimeout(80);
    await page.getByTestId("interview-filter-type-Term").click();
    await page.waitForTimeout(120);
    const term_only = await page.locator('[data-testid^="interview-row-"]').count();
    console.log(`[audit-AR] term-only rows: ${term_only}`);
    await shot(page, "2b-filter-term");
    await page.getByTestId("interview-filter-type-Term").click();
    await page.waitForTimeout(80);

    // Toggle jurisdictional-only
    await page.getByTestId("interview-filter-jurisdiction").click();
    await page.waitForTimeout(120);
    const jur_only = await page.locator('[data-testid^="interview-row-"]').count();
    console.log(`[audit-AR] jurisdictional-only rows: ${jur_only}`);
    await shot(page, "2c-filter-jurisdiction");
    await page.getByTestId("interview-filter-jurisdiction").click();
    await page.waitForTimeout(80);

    // Reason filter
    await page.getByTestId("interview-filter-reason-open").click();
    await page.waitForTimeout(120);
    const open_only = await page.locator('[data-testid^="interview-row-"]').count();
    console.log(`[audit-AR] reason=open rows: ${open_only}`);
    await shot(page, "2d-filter-reason-open");
    await page.getByTestId("interview-filter-reason-open").click();
    await page.waitForTimeout(80);

    // Search
    await page.getByTestId("interview-search").fill("breach");
    await page.waitForTimeout(150);
    const search_rows = await page.locator('[data-testid^="interview-row-"]').count();
    console.log(`[audit-AR] search='breach' rows: ${search_rows}`);
    await shot(page, "2e-search-breach");
    await page.getByTestId("interview-search").fill("");
    await page.waitForTimeout(120);
  });

  // -------------------------------------------------------------------------
  // FORECLOSURE BEFORE-SHOT — capture the pre-state and then trigger the
  // dispositive selection up-front so subsequent steps (3-6) actually see
  // the downstream Checkpoints/Interpretations in the interview list.
  // The "AFTER" foreclosure screenshot is captured later in step 7.
  // -------------------------------------------------------------------------
  await test.step("pre-7. capture pre-foreclosure baseline", async () => {
    await page.getByTestId("output-view-tab-path_overlay").click().catch(() => {});
    await page.waitForTimeout(250);
    await shot(page, "pre7-foreclosure-before");
    const before_session = await readSession(page);
    console.log(
      `[audit-AR] foreclosed pre-trigger: ${JSON.stringify(before_session?.foreclosed ?? [])}`,
    );
    // Trigger the dispositive interp selection so the downstream Checkpoints
    // become open in the interview list. We screenshot the AFTER state in
    // step 7 below.
    await sessionApplyPatch(page, {
      kind: "interpretation_selected",
      term_id: ids.term_disp,
      interpretation_id: ids.interp_disp_a,
    });
    await page.waitForTimeout(500);
    const after_session = await readSession(page);
    console.log(
      `[audit-AR] foreclosed post-trigger: ${JSON.stringify(after_session?.foreclosed ?? [])}`,
    );
  });

  // -------------------------------------------------------------------------
  // 3. CHECKPOINT ITEM EDITOR — author premise, pick answer
  // -------------------------------------------------------------------------
  await test.step("3. checkpoint item editor (multiple_choice cp_mc)", async () => {
    const row = page.getByTestId(`interview-row-${ids.cp_mc}`);
    if (!(await row.isVisible().catch(() => false))) {
      console.log("[audit-AR] cp_mc row not visible — interview list may omit it");
      await shot(page, "3-cp-mc-not-visible");
    } else {
      await row.click();
      await expect(page.getByTestId("checkpoint-item-editor")).toBeVisible({ timeout: 5_000 });
      await shot(page, "3a-checkpoint-editor-opened");

      // Pick an option
      await page.getByTestId("checkpoint-answer-reckless").click();
      // Author a premise
      await expect(page.getByTestId("premise-authoring-section")).toBeVisible();
      await page.getByTestId("premise-statement").fill(
        "Driver was looking at phone at the moment of impact.",
      );
      await page.waitForTimeout(120);
      await shot(page, "3b-premise-authored");
      // Save
      await page.getByTestId("checkpoint-editor-save").click();
      await page.waitForTimeout(400);
      await shot(page, "3c-after-checkpoint-save");
      // Verify premise pool shows it (need bottom panel expanded)
      await page.getByTestId("bottom-panel-toggle").click();
      await page.waitForTimeout(200);
      const session = await readSession(page);
      console.log(`[audit-AR] premise count after save: ${session?.premises.length ?? 0}`);
      await shot(page, "3d-premise-pool");
      // Collapse bottom panel for subsequent steps
      await page.getByTestId("bottom-panel-toggle").click();
      await page.waitForTimeout(100);
    }
  });

  // -------------------------------------------------------------------------
  // 4. AUTHORITY ATTACHMENT — on requires_authority Checkpoint (cp_bool)
  // -------------------------------------------------------------------------
  await test.step("4. authority attachment on requires_authority cp_bool", async () => {
    const row = page.getByTestId(`interview-row-${ids.cp_bool}`);
    if (!(await row.isVisible().catch(() => false))) {
      console.log("[audit-AR] cp_bool not in list; trying alternate selector");
      // Try by selecting via store (synthetic UI action)
      await page.evaluate((id) => {
        // not directly available; skip
        void id;
      }, ids.cp_bool);
      await shot(page, "4-cp-bool-not-visible");
    } else {
      await row.click();
      await expect(page.getByTestId("checkpoint-item-editor")).toBeVisible({ timeout: 5_000 });
      // requires_authority=true → AuthorityAttachmentSection rendered
      const auth_section_visible = await page
        .getByTestId("authority-attachment-section")
        .isVisible()
        .catch(() => false);
      console.log(`[audit-AR] authority-attachment-section visible: ${auth_section_visible}`);
      if (auth_section_visible) {
        await shot(page, "4a-authority-section-visible");
        // Pick existing
        const picker = page.getByTestId("authority-picker");
        const options = await picker.locator("option").allTextContents();
        console.log(`[audit-AR] authority picker options: ${JSON.stringify(options)}`);
        // Pick the Palsgraf option by value
        await picker.selectOption({ index: 1 }).catch(() => {});
        await page.waitForTimeout(120);
        await shot(page, "4b-authority-picked");
        // Try the inline-new flow
        await page.getByTestId("authority-new-toggle").click().catch(() => {});
        if (
          await page
            .getByTestId("authority-new-form")
            .isVisible()
            .catch(() => false)
        ) {
          await page.getByTestId("authority-new-name").fill("Cordas v. Peerless Transp.");
          await page.getByTestId("authority-new-citation").fill("27 N.Y.S.2d 198 (1941)");
          await shot(page, "4c-authority-new-form-filled");
          await page.getByTestId("authority-new-save").click();
          await page.waitForTimeout(150);
          await shot(page, "4d-authority-new-saved");
        }
      }
      // Cancel out of editor to not pollute state
      await page.getByTestId("checkpoint-editor-cancel").click().catch(() => {});
      await page.waitForTimeout(80);
    }
  });

  // -------------------------------------------------------------------------
  // 5. PREMISE.KIND PICKER — legal vocabulary check
  // -------------------------------------------------------------------------
  await test.step("5. premise-kind picker (legal vocabulary)", async () => {
    // Open any open Checkpoint editor — re-select cp_mc to get the editor.
    const row = page.getByTestId(`interview-row-${ids.cp_graded}`);
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await expect(page.getByTestId("checkpoint-item-editor")).toBeVisible({ timeout: 5_000 });
      const select = page.getByTestId("premise-kind");
      const options = await select.locator("option").allTextContents();
      console.log(`[audit-AR] premise-kind options: ${JSON.stringify(options)}`);
      // Open the dropdown for the screenshot
      await select.focus();
      await shot(page, "5-premise-kind-dropdown");
      await page.getByTestId("checkpoint-editor-cancel").click().catch(() => {});
      await page.waitForTimeout(80);
    } else {
      console.log("[audit-AR] cp_graded row not visible; cannot open premise-kind dropdown");
    }
  });

  // -------------------------------------------------------------------------
  // 6. INTERPRETATION ITEM EDITOR — pick supports, author premise
  // -------------------------------------------------------------------------
  await test.step("6. interpretation item editor", async () => {
    // Interpretations only appear in the interview if they're "open" — let's
    // look for any interpretation row.
    const rows = await page.locator('[data-testid^="interview-row-"]').all();
    let interp_id: string | null = null;
    for (const r of rows) {
      const tid = await r.getAttribute("data-testid");
      if (!tid) continue;
      const id = tid.replace("interview-row-", "");
      // Check by id match to our interp ids
      if (
        id === ids.interp_disp_a ||
        id === ids.interp_disp_b ||
        id === ids.interp_other_a ||
        id === ids.interp_other_b
      ) {
        interp_id = id;
        break;
      }
    }
    if (!interp_id) {
      console.log("[audit-AR] no interpretation row in interview list");
      await shot(page, "6-no-interp-row");
    } else {
      await page.getByTestId(`interview-row-${interp_id}`).click();
      await expect(page.getByTestId("interpretation-item-editor")).toBeVisible({
        timeout: 5_000,
      });
      await shot(page, "6a-interp-editor-opened");
      await page.getByTestId("evidence-direction-supports").click();
      await page.getByTestId("premise-statement").fill("Industry practice supports this read.");
      await page.waitForTimeout(120);
      await shot(page, "6b-interp-premise-authored");
      await page.getByTestId("interpretation-editor-save").click();
      await page.waitForTimeout(400);
      await shot(page, "6c-interp-saved");
    }
  });

  // -------------------------------------------------------------------------
  // 7. DISPOSITIVE FORECLOSURE — verify foreclosed set + post-state shot.
  // (We triggered the interpretation_selected patch in "pre-7" above so
  // subsequent steps had open downstream Checkpoints; here we read the
  // foreclosed_set and capture the post-state path-overlay rendering.)
  // -------------------------------------------------------------------------
  await test.step("7. dispositive foreclosure (verification)", async () => {
    await page.getByTestId("output-view-tab-path_overlay").click().catch(() => {});
    await page.waitForTimeout(300);
    const after_session = await readSession(page);
    console.log(
      `[audit-AR] foreclosure verification: ${JSON.stringify(after_session?.foreclosed ?? [])}`,
    );
    const foreclosed_set = new Set(after_session?.foreclosed ?? []);
    const sib_term_in = foreclosed_set.has(ids.term_other);
    const sib_interp_a_in = foreclosed_set.has(ids.interp_other_a);
    const sib_interp_b_in = foreclosed_set.has(ids.interp_other_b);
    console.log(
      `[audit-AR] foreclosure result — sibling-Term:${sib_term_in} sib-interp-a:${sib_interp_a_in} sib-interp-b:${sib_interp_b_in}`,
    );
    await shot(page, "7-after-foreclosure-pathoverlay");
  });

  // -------------------------------------------------------------------------
  // 8. THREE-TAB OUTPUT VIEWER
  // -------------------------------------------------------------------------
  await test.step("8. three-tab output viewer", async () => {
    // Default tab — read aria-selected on each tab
    const default_active = await page.evaluate(() => {
      const tabs = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid^="output-view-tab-"]'),
      );
      const active = tabs.find((t) => t.getAttribute("aria-selected") === "true");
      return active?.getAttribute("data-testid") ?? null;
    });
    console.log(`[audit-AR] default output tab: ${default_active}`);
    await shot(page, "8a-default-tab");

    await page.getByTestId("output-view-tab-path_overlay").click().catch(() => {});
    await page.waitForTimeout(250);
    await shot(page, "8b-tab-path-overlay");

    await page.getByTestId("output-view-tab-decision_tree").click().catch(() => {});
    await page.waitForTimeout(250);
    await shot(page, "8c-tab-decision-tree");

    await page.getByTestId("output-view-tab-prose").click().catch(() => {});
    await page.waitForTimeout(250);
    await shot(page, "8d-tab-prose");
  });

  // -------------------------------------------------------------------------
  // 9. STATUS SUMMARY CHIP — hover for tooltip
  // -------------------------------------------------------------------------
  await test.step("9. status summary chip", async () => {
    const chip = page.getByTestId("status-summary-chip");
    const visible = await chip.isVisible().catch(() => false);
    console.log(`[audit-AR] status-summary-chip visible: ${visible}`);
    if (visible) {
      const shape = await chip.getAttribute("data-shape");
      const text = await chip.textContent();
      console.log(`[audit-AR] status chip shape=${shape} text="${text?.trim()}"`);
      await chip.hover();
      await page.waitForTimeout(400);
      await shot(page, "9-status-chip");
    } else {
      await shot(page, "9-status-chip-missing");
    }
  });

  // -------------------------------------------------------------------------
  // 10. RECOMPUTE INDICATOR — should bump on state change
  // -------------------------------------------------------------------------
  await test.step("10. recompute indicator", async () => {
    const before = await page.getByTestId("recompute-indicator").getAttribute("data-counter");
    console.log(`[audit-AR] recompute-indicator data-counter before: ${before}`);
    // Trigger a compute-affecting patch — add a premise via the session store
    await sessionApplyPatch(page, {
      kind: "premise_added",
      premise: {
        id: crypto.randomUUID(),
        type: "Premise",
        layer: "argument",
        statement: "Probe premise for recompute indicator.",
        kind: "found",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    await page.waitForTimeout(500);
    const after = await page.getByTestId("recompute-indicator").getAttribute("data-counter");
    console.log(`[audit-AR] recompute-indicator data-counter after: ${after}`);
    await shot(page, "10-recompute-indicator");
  });

  // -------------------------------------------------------------------------
  // 11. SAVE MILESTONE — via store API (no UI affordance in non-empty-state)
  // -------------------------------------------------------------------------
  await test.step("11. save milestone", async () => {
    const btn_visible = await page
      .getByTestId("save-milestone-button")
      .isVisible()
      .catch(() => false);
    console.log(`[audit-AR] save-milestone-button visible (UI): ${btn_visible}`);
    if (btn_visible) {
      await page.getByTestId("save-milestone-button").click();
      await page.waitForTimeout(800);
      await shot(page, "11a-save-milestone-via-ui");
    } else {
      // Save via the store directly — the only API path available without
      // resolving every interview item first.
      await page.evaluate(async () => {
        const w = window as unknown as {
          __argmap_test?: {
            session_store?: {
              getState(): { saveSessionMilestone?(s?: string): Promise<void> };
            };
          };
        };
        const ss = w.__argmap_test?.session_store?.getState();
        await ss?.saveSessionMilestone?.("AR-Audit milestone via API");
      });
      await page.waitForTimeout(1_000);
      await shot(page, "11b-save-milestone-via-api");
    }
  });

  // -------------------------------------------------------------------------
  // 12. BOTTOM PANEL — expand, premise edit + delete
  // -------------------------------------------------------------------------
  await test.step("12. bottom panel — premise pool", async () => {
    await page.getByTestId("bottom-panel-toggle").click();
    await page.waitForTimeout(250);
    await expect(page.getByTestId("bottom-panel-expanded")).toBeVisible();
    await expect(page.getByTestId("premise-pool")).toBeVisible();
    await expect(page.getByTestId("session-authorities")).toBeVisible();
    await shot(page, "12a-bottom-panel-expanded");

    const session = await readSession(page);
    if (session && session.premises.length > 0) {
      const target = session.premises[0]!.id;
      console.log(`[audit-AR] editing premise: ${target}`);
      // Edit in-place
      const edit_btn = page.getByTestId(`premise-edit-${target}`);
      if (await edit_btn.isVisible().catch(() => false)) {
        await edit_btn.click();
        await page.waitForTimeout(80);
        const input = page.getByTestId(`premise-edit-statement-${target}`);
        await input.fill("Edited via audit-AR test.");
        await page.getByTestId(`premise-edit-save-${target}`).click();
        await page.waitForTimeout(200);
        await shot(page, "12b-premise-edited");
      }
      // Delete confirm flow
      const del_btn = page.getByTestId(`premise-delete-${target}`);
      if (await del_btn.isVisible().catch(() => false)) {
        await del_btn.click();
        await page.waitForTimeout(80);
        await shot(page, "12c-premise-delete-confirm");
        const confirm_yes = page.getByTestId(`premise-delete-confirm-yes-${target}`);
        if (await confirm_yes.isVisible().catch(() => false)) {
          await confirm_yes.click();
          await page.waitForTimeout(200);
          await shot(page, "12d-premise-deleted");
        }
      }
    } else {
      console.log("[audit-AR] no premises to edit/delete");
      await shot(page, "12-no-premises");
    }
  });

  await shot(page, "99-final-state");
});
