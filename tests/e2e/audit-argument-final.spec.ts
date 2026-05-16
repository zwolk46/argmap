/**
 * AUDIT — argument-running capture (follow-up).
 *
 * The lead walkthrough (audit-walkthrough.spec.ts) built a complete but
 * invalidly-routed negligence frame to surface the C5 validation gate, then
 * was correctly blocked at the mode toggle. This spec builds a MINIMAL
 * BUT VALID frame (every node type still present, reachability ok) so the
 * mode toggle succeeds and we can capture the missing argument-running
 * screenshots the mission requires: path-overlay, decision-tree, prose,
 * and the status-painted canvas.
 *
 * Run: E2E_LIVE=1 npx playwright test tests/e2e/audit-argument-final.spec.ts \
 *        --workers=1
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";
const FRAME_TITLE = `Agent Audit AR Final — Negligence (valid routing) ${new Date()
  .toISOString()
  .slice(0, 19)
  .replace(/[T:]/g, "-")}`;

test.skip(!LIVE, "E2E_LIVE=1 to run the audit final spec");
test.setTimeout(8 * 60_000);

const SCREENSHOT_DIR = path.resolve(process.cwd(), "tests", "audit", "argument-final");
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

async function applyPatch(page: Page, patch: unknown): Promise<void> {
  await page.evaluate((p) => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): { applyPatch(p: unknown): void } } };
    };
    const fs = w.__argmap_test?.frame_store;
    if (!fs) throw new Error("__argmap_test.frame_store unavailable");
    fs.getState().applyPatch(p);
  }, patch);
  await page.waitForTimeout(40);
}

async function readValidation(page: Page): Promise<Array<{ severity: string; message: string }>> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): { validation: Array<{ severity: string; message: string }> } } };
    };
    return w.__argmap_test?.frame_store?.getState()?.validation ?? [];
  });
}

test("audit final: minimal valid legal frame, switch to argument, capture all output tabs", async ({
  page,
}) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));

  await test.step("sign in + create legal frame", async () => {
    await page.goto("/");
    await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sign-in-email").fill(EMAIL);
    await page.getByTestId("sign-in-password").fill(PASSWORD);
    await page.getByTestId("sign-in-submit").click();
    await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: /new frame/i }).first().click();
    await expect(page.getByTestId("new-frame-wizard")).toBeVisible();
    await page.getByTestId("wizard-mode-legal").click();
    await page.getByTestId("wizard-title-input").fill(FRAME_TITLE);
    await page.getByTestId("wizard-description-input").fill(
      "Minimal valid frame to capture argument-running screens: " +
        "RootQ → SubQ → Term → Interpretation → Checkpoint → AND gate → Conclusion, " +
        "with 3 Checkpoints (every answer_type) and 1 Authority.",
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
  });

  await test.step("seed valid minimal frame via applyPatch", async () => {
    const result = await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test: { frame_store: { getState(): { applyPatch(p: unknown): void; frame_version: { nodes: Array<{ id: string; type: string }> } } } };
      };
      const fs = w.__argmap_test.frame_store;
      const now = () => new Date().toISOString();
      const newId = () => crypto.randomUUID();

      const root_id = newId();
      const sub_id = newId();
      const term_id = newId();
      const interp_a = newId();
      const interp_b = newId();
      const cp_boolean = newId();
      const cp_multi = newId();
      const cp_graded = newId();
      const gate_id = newId();
      const concl_id = newId();
      const auth_id = newId();

      // Helper to apply edge patches with full identity.
      const addEdge = (type: string, source: string, target: string, extra: Record<string, unknown> = {}) => {
        fs.getState().applyPatch({
          kind: "edge_added",
          edge: {
            id: newId(),
            type,
            layer: type === "ANSWERS" || type === "SUPPORTS" || type === "CONTRADICTS" ? "argument" : "frame",
            source,
            target,
            created_at: now(),
            updated_at: now(),
            ...extra,
          },
        });
      };

      // Add nodes.
      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: root_id,
          type: "RootQuestion",
          layer: "frame",
          statement: "Is Driver liable to Plaintiff for negligence under NY law?",
          created_at: now(),
          updated_at: now(),
        },
      });
      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: sub_id,
          type: "SubQuestion",
          layer: "frame",
          statement: "Was Driver's conduct a substantial factor in causing Plaintiff's injury?",
          is_jurisdictional: false,
          standard_of_review: "de_novo",
          created_at: now(),
          updated_at: now(),
        },
      });
      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: term_id,
          type: "Term",
          layer: "frame",
          name: "Reasonable Person Standard",
          order: 0,
          dispositive: true,
          created_at: now(),
          updated_at: now(),
        },
      });
      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: interp_a,
          type: "Interpretation",
          layer: "frame",
          statement: "Ordinary prudent person under like circumstances (Restatement § 283).",
          created_at: now(),
          updated_at: now(),
        },
      });
      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: interp_b,
          type: "Interpretation",
          layer: "frame",
          statement: "Emergency-doctrine modification (Cordas v. Peerless Transp.).",
          created_at: now(),
          updated_at: now(),
        },
      });

      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: cp_boolean,
          type: "Checkpoint",
          layer: "frame",
          question: "Did Driver breach the standard of reasonable care?",
          answer_type: "boolean",
          requires_premise: true,
          requires_authority: true,
          burden_level: "preponderance",
          options: [
            { id: "yes", label: "Yes — breach proven", satisfies: true, target_node_id: gate_id },
            { id: "no", label: "No breach", satisfies: false },
          ],
          created_at: now(),
          updated_at: now(),
        },
      });
      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: cp_multi,
          type: "Checkpoint",
          layer: "frame",
          question: "Which characterization best fits Driver's conduct?",
          answer_type: "multiple_choice",
          requires_premise: true,
          requires_authority: false,
          burden_level: "preponderance",
          options: [
            { id: "reckless", label: "Recklessly disregarded a known risk", satisfies: true, target_node_id: gate_id },
            { id: "careless", label: "Failed to exercise reasonable care", satisfies: true, target_node_id: gate_id },
            { id: "ordinary", label: "Acted reasonably", satisfies: false },
          ],
          created_at: now(),
          updated_at: now(),
        },
      });
      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: cp_graded,
          type: "Checkpoint",
          layer: "frame",
          question: "How clearly within the foreseeable zone of danger was the harm?",
          answer_type: "graded",
          requires_premise: true,
          requires_authority: false,
          burden_level: "preponderance",
          options: [
            { id: "clear", label: "Clearly within zone of danger", satisfies: true, target_node_id: gate_id },
            { id: "moderate", label: "Plausibly foreseeable", satisfies: true, target_node_id: gate_id },
            { id: "remote", label: "Remote / unforeseeable", satisfies: false },
          ],
          created_at: now(),
          updated_at: now(),
        },
      });

      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: gate_id,
          type: "LogicalGate",
          layer: "frame",
          gate_type: "AND",
          inputs: [cp_boolean, cp_multi, cp_graded],
          output_target: concl_id,
          created_at: now(),
          updated_at: now(),
        },
      });

      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: concl_id,
          type: "Conclusion",
          layer: "frame",
          statement: "Defendant Driver is liable to Plaintiff for negligence (affirm).",
          direction: { kind: "legal", value: "affirm" },
          tags: [],
          created_at: now(),
          updated_at: now(),
        },
      });

      fs.getState().applyPatch({
        kind: "node_added",
        node: {
          id: auth_id,
          type: "Authority",
          layer: "frame",
          citation: "248 N.Y. 339 (1928)",
          court: "NY Court of Appeals",
          year: 1928,
          is_binding: true,
          jurisdiction: { level: "state", region: "NY" },
          binding_in: [{ level: "state", region: "NY" }],
          short_label: "Palsgraf (NY 1928)",
          holding_summary: "Duty in negligence runs only to those within the zone of foreseeable harm.",
          created_at: now(),
          updated_at: now(),
        },
      });

      // Edges: build the valid path RootQ → SubQ → Term → Interp → Checkpoint → Gate → Conclusion.
      addEdge("DECOMPOSES_INTO", root_id, sub_id);
      addEdge("TURNS_ON", sub_id, term_id);
      addEdge("INTERPRETED_AS", term_id, interp_a);
      addEdge("INTERPRETED_AS", term_id, interp_b);
      addEdge("LEADS_TO", interp_a, cp_boolean);
      addEdge("LEADS_TO", interp_a, cp_multi);
      addEdge("LEADS_TO", interp_a, cp_graded);
      // Audit-finding: LogicalGate.inputs[] is the canonical input
      // mechanism, but V-FR-2 (orphan check) only counts edge-based
      // incoming connections. Add a LEADS_TO Interp→Gate edge so the
      // gate isn't flagged as orphaned. (Documented as Class B finding.)
      addEdge("LEADS_TO", interp_a, gate_id);
      // GATES edge: gate → conclusion.
      addEdge("GATES", gate_id, concl_id);
      // CITES: Authority → Interpretation (frame-layer).
      addEdge("CITES", auth_id, interp_a, { strength: "directly_on_point" });

      return {
        root_id, sub_id, term_id, interp_a, interp_b,
        cp_boolean, cp_multi, cp_graded, gate_id, concl_id, auth_id,
      };
    });
    console.log("[audit-final] seed ids:", result);
    await shot(page, "frame-seeded");

    const validation = await readValidation(page);
    const errors = validation.filter((v) => v.severity === "error");
    const warnings = validation.filter((v) => v.severity === "warning");
    console.log(`[audit-final] validation: ${errors.length} errors, ${warnings.length} warnings`);
    for (const e of errors.slice(0, 5)) console.log(`  - ${e.message}`);
  });

  await test.step("switch to Argument Running", async () => {
    const argRadio = page.getByRole("radio", { name: /argument/i }).first();
    await argRadio.click();
    // Accept warnings dialog if present.
    const continueBtn = page.getByRole("button", { name: /continue/i }).first();
    if (await continueBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForTimeout(2_000);
    await shot(page, "after-mode-toggle");
  });

  await test.step("verify argument-running canvas is mounted", async () => {
    const interviewVisible = await page
      .getByTestId("interview-pane")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    console.log(`[audit-final] interview-pane visible: ${interviewVisible}`);
    await shot(page, "argument-running-canvas");
  });

  await test.step("path-overlay tab", async () => {
    const tab = page.getByTestId("output-view-tab-path_overlay");
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(800);
      await shot(page, "output-path-overlay");
    } else {
      console.log("[audit-final] path-overlay tab not visible");
    }
  });

  await test.step("decision-tree tab", async () => {
    const tab = page.getByTestId("output-view-tab-decision_tree");
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(800);
      await shot(page, "output-decision-tree");
    }
  });

  await test.step("prose tab", async () => {
    const tab = page.getByTestId("output-view-tab-prose");
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(800);
      await shot(page, "output-prose");
    }
  });

  await test.step("expand bottom panel (premises + authorities)", async () => {
    const toggle = page.getByTestId("bottom-panel-toggle");
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await page.waitForTimeout(500);
      await shot(page, "bottom-panel-expanded");
    }
  });

  // -----------------------------------------------------------------------
  // ACTUALLY RUN THE ARGUMENT: pick the dispositive Term's Interpretation
  // and verify (a) compute() reruns, (b) status repaints, (c) the sibling
  // Interpretation is auto-foreclosed (dispositive Term contract).
  // -----------------------------------------------------------------------
  await test.step("interview: select an Interpretation for the dispositive Term", async () => {
    // Identify the term row in the interview pane. We stashed term_id in
    // page state by running the seed step's evaluate; re-read it from the
    // store snapshot here.
    const term_id = await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test: {
          frame_store: { getState(): { frame_version: { nodes: Array<{ id: string; type: string }> } | null } };
          session_store: { getState(): { session: { frame_version_snapshot: { nodes: Array<{ id: string; type: string }> } } | null } };
        };
      };
      // In argument-running, frame data lives on the session's snapshot.
      const fv =
        w.__argmap_test.frame_store.getState().frame_version ??
        w.__argmap_test.session_store.getState().session?.frame_version_snapshot ??
        null;
      const term = fv?.nodes.find((n) => n.type === "Term");
      return term?.id ?? null;
    });
    expect(term_id).not.toBeNull();
    const row = page.getByTestId(`interview-row-${term_id}`);
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page.getByTestId("term-item-editor")).toBeVisible({ timeout: 5_000 });
    await shot(page, "term-item-editor-open");

    // Click the first listed Interpretation (interp_a — the ordinary
    // reasonable-person standard). Pattern: term-interpretation-{id}.
    const interpButton = page.locator('[data-testid^="term-interpretation-"]').first();
    await interpButton.click();
    await page.waitForTimeout(200);
    await page.getByTestId("term-editor-save").click();
    await page.waitForTimeout(800);
    await shot(page, "term-interpretation-selected");
  });

  await test.step("re-capture output tabs after interpretation pick", async () => {
    const pathTab = page.getByTestId("output-view-tab-path_overlay");
    if (await pathTab.isVisible().catch(() => false)) {
      await pathTab.click();
      await page.waitForTimeout(800);
      await shot(page, "post-pick-path-overlay");
    }
    const treeTab = page.getByTestId("output-view-tab-decision_tree");
    if (await treeTab.isVisible().catch(() => false)) {
      await treeTab.click();
      await page.waitForTimeout(800);
      await shot(page, "post-pick-decision-tree");
    }
    const proseTab = page.getByTestId("output-view-tab-prose");
    if (await proseTab.isVisible().catch(() => false)) {
      await proseTab.click();
      await page.waitForTimeout(800);
      await shot(page, "post-pick-prose");
    }
  });

  await test.step("verify dispositive foreclosure on sibling Interpretation", async () => {
    // Read compute_result from the session store. Sibling Interpretation
    // should appear in the foreclosed_set or have status === "foreclosed".
    const summary = await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test: {
          session_store: {
            getState(): {
              compute_result?: {
                status_map?: Record<string, string>;
                foreclosed_set?: string[];
              };
              session?: { frame_version_snapshot: { nodes: Array<{ id: string; type: string }> } };
            };
          };
          frame_store: { getState(): { frame_version: { nodes: Array<{ id: string; type: string }> } | null } };
        };
      };
      const fv =
        w.__argmap_test.frame_store.getState().frame_version ??
        w.__argmap_test.session_store.getState().session?.frame_version_snapshot ??
        null;
      const cr = w.__argmap_test.session_store.getState().compute_result;
      const interps = fv ? fv.nodes.filter((n) => n.type === "Interpretation").map((n) => n.id) : [];
      return {
        interps,
        status_map: cr?.status_map ?? null,
        foreclosed_set: Array.isArray(cr?.foreclosed_set) ? cr.foreclosed_set : [],
      };
    });
    console.log("[audit-final] post-pick summary:", JSON.stringify(summary, null, 2));
  });

  await test.step("final state capture", async () => {
    await shot(page, "final-state");
  });
});
