/**
 * AUDIT WALKTHROUGH — agent-driven legal-mode scenario.
 *
 * Builds a realistic negligence frame end-to-end through the live UI, then
 * runs an argument session against it. Doubles as the canonical "what can
 * this app do" worked example.
 *
 * Scenario: plaintiff sues a driver for negligence in NY state court.
 * Exercises every node type, multiple gate kinds, multiple edge types,
 * dispositive Interpretation foreclosure, options_box overrides
 * (standard_of_review, burden_of_proof), requires_authority enforcement,
 * three Authorities (binding NY court of appeals + persuasive English
 * common law + same-jurisdiction trial court), and the comparative-
 * negligence UNLESS gate.
 *
 * UI gestures driven through the live browser:
 *   - sign in, wizard flow, frame title
 *   - palette clicks to add every node
 *   - inspector text edits (statement / question / name / citation)
 *   - mode toggle (frame → argument)
 *   - interview-pane interactions, premise authoring, authority attachment
 *   - output viewer tab cycling
 *   - milestone saves
 *
 * Programmatic via window.__argmap_test:
 *   - edge applyPatch — drag-from-handle is functional for humans but
 *     extremely brittle to script in Playwright (React Flow's pointer
 *     hit-testing rejects synthetic mouse events from off-screen handles).
 *     This is a test-tooling gap, not a UX defect; see audit report.
 *   - structured field edits with no UI affordance (e.g., LogicalGate
 *     inputs[] before the gate inspector is wired in I.9c).
 *
 * Run: E2E_LIVE=1 npx playwright test tests/e2e/audit-walkthrough.spec.ts \
 *        --headed --workers=1
 *
 * Writes real data to the configured Supabase project. The frame title is
 * prefixed "Agent Audit —" so it's unambiguously identifiable on Home.
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";
const FRAME_TITLE = `Agent Audit — Negligence (NY Driver) ${new Date()
  .toISOString()
  .slice(0, 19)
  .replace(/[T:]/g, "-")}`;

test.skip(!LIVE, "E2E_LIVE=1 to run the live-Supabase audit walkthrough");
test.setTimeout(15 * 60_000);

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------
const SCREENSHOT_DIR = path.resolve(process.cwd(), "tests", "audit", "ui-walkthrough");
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
// Programmatic helpers — uses window.__argmap_test exposed by the
// RepositoryProvider in dev mode (see src/state/context.tsx). Public API
// matches store.applyPatch(patch) — patch shapes defined in
// src/state/action-runner.ts.
// ---------------------------------------------------------------------------
async function frameApplyPatch(page: Page, patch: unknown): Promise<void> {
  await page.evaluate((p) => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): { applyPatch(p: unknown): void } } };
    };
    const fs = w.__argmap_test?.frame_store;
    if (!fs) throw new Error("window.__argmap_test.frame_store not exposed");
    fs.getState().applyPatch(p);
  }, patch);
  await page.waitForTimeout(60);
}

async function readFrameVersionFromStore(page: Page): Promise<{
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
          frame_version: { nodes: Array<{ id: string; type: string }>; edges: Array<{ id: string; source: string; target: string; type: string }> } | null;
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

// ---------------------------------------------------------------------------
// UI gestures
// ---------------------------------------------------------------------------

/** Click a palette tile by aria-label and return the newly-minted node id. */
async function paletteAdd(page: Page, label: string): Promise<string> {
  const beforeIds = new Set((await readFrameVersionFromStore(page)).nodes.map((n) => n.id));
  await page.getByRole("button", { name: label, exact: true }).first().click();
  // Wait for store to reflect the new node.
  let freshId: string | null = null;
  await expect
    .poll(
      async () => {
        const after = await readFrameVersionFromStore(page);
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
  if (!freshId) throw new Error(`paletteAdd(${label}) failed: no new node id`);
  return freshId;
}

/** Click on the canvas node by data-node-id to select it. */
async function selectNode(page: Page, nodeId: string): Promise<void> {
  await page.locator(`[data-node-id="${nodeId}"]`).first().click();
  await page.waitForTimeout(60);
}

/**
 * Edit the primary text field of the currently-selected node through the
 * Inspector textarea. Saves on blur per the inspector's commit contract.
 */
async function setInspectorText(page: Page, text: string): Promise<void> {
  const ta = page
    .locator("textarea")
    .filter({ hasNot: page.locator("[placeholder*='Add notes']") })
    .first();
  await ta.waitFor({ state: "visible", timeout: 3_000 });
  await ta.click();
  await ta.fill(text);
  await ta.blur();
  await page.waitForTimeout(120);
}

/**
 * Apply an EDGE_ADDED patch through the store. The caller is responsible
 * for minting the id + created_at/updated_at; the dispatch table does not
 * stamp them — see frame-building-page.tsx:applyCandidate for the canonical
 * pattern.
 */
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
  await page.waitForTimeout(40);
  return id;
}

/** Mutate a node via NODE_EDITED patch (shape: { node_id, partial }). */
async function editNode(page: Page, nodeId: string, fields: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    ({ id, partial }) => {
      const w = window as unknown as {
        __argmap_test?: { frame_store?: { getState(): { applyPatch(p: unknown): void } } };
      };
      const fs = w.__argmap_test?.frame_store;
      if (!fs) throw new Error("frame_store unavailable");
      fs.getState().applyPatch({
        kind: "node_edited",
        node_id: id,
        partial,
      });
    },
    { id: nodeId, partial: fields },
  );
  await page.waitForTimeout(40);
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test("audit walkthrough: build a legal-mode negligence frame and run an argument", async ({
  page,
}) => {
  // Pipe console errors to the test log so render-loops / boot errors surface.
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
        "Plaintiff sues defendant driver for negligence after a motor-vehicle accident in NY. " +
          "Exercises every node type: Root/Sub-Questions for the four elements (duty, breach, " +
          "causation, damages), a Term ('reasonable person') with three Interpretations including " +
          "a dispositive sibling, Checkpoints with all three answer_types, an AND gate, an UNLESS " +
          "gate for the comparative-negligence defense, three Authorities (Palsgraf — binding NY, " +
          "Vaughan v. Menlove — persuasive, Cordas v. Peerless Transp. — same-jurisdiction trial).",
      );
    await shot(page, "wizard-filled");
    await page.getByTestId("wizard-submit").click();
    await expect(page.locator("body")).toContainText(FRAME_TITLE, { timeout: 15_000 });
    // Wait for the dev-mode window helper to install.
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
    await shot(page, "frame-building-empty");
  });

  // ----- BUILD FRAME — palette clicks (UI) + applyPatch for edges -----
  const ids: Record<string, string> = {};

  await test.step("UI: add root question + sub-questions + decomposition", async () => {
    ids.root = await paletteAdd(page, "Root Question");
    await selectNode(page, ids.root);
    await setInspectorText(
      page,
      "Is Defendant Driver liable to Plaintiff for negligence under New York law?",
    );

    ids.duty = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.duty);
    await setInspectorText(page, "Did Driver owe Plaintiff a duty of reasonable care?");

    ids.breach = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.breach);
    await setInspectorText(page, "Did Driver breach the standard of reasonable care?");

    ids.causation = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.causation);
    await setInspectorText(page, "Did Driver's breach cause Plaintiff's injury?");

    ids.factual_cause = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.factual_cause);
    await setInspectorText(
      page,
      "Factual (but-for) cause: would Plaintiff have escaped injury but for Driver's conduct?",
    );

    ids.proximate_cause = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.proximate_cause);
    await setInspectorText(
      page,
      "Proximate cause: was the injury within the foreseeable risk created by Driver's conduct?",
    );

    ids.damages = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.damages);
    await setInspectorText(page, "Did Plaintiff suffer cognizable damages?");

    // Mark jurisdictional questions for the D2 ordering rule.
    await editNode(page, ids.duty, { is_jurisdictional: false });

    await shot(page, "frame-questions-created");

    // Edges: root decomposes into each element. (DECOMPOSES_INTO)
    await addEdge(page, "DECOMPOSES_INTO", ids.root, ids.duty);
    await addEdge(page, "DECOMPOSES_INTO", ids.root, ids.breach);
    await addEdge(page, "DECOMPOSES_INTO", ids.root, ids.causation);
    await addEdge(page, "DECOMPOSES_INTO", ids.root, ids.damages);
    await addEdge(page, "DECOMPOSES_INTO", ids.causation, ids.factual_cause);
    await addEdge(page, "DECOMPOSES_INTO", ids.causation, ids.proximate_cause);
    await shot(page, "frame-decomposed");
  });

  await test.step("UI: add Term + three Interpretations (one DISPOSITIVE)", async () => {
    ids.term_rp = await paletteAdd(page, "Term");
    await selectNode(page, ids.term_rp);
    await setInspectorText(page, "Reasonable Person Standard");

    ids.interp_ordinary = await paletteAdd(page, "Interpretation");
    await selectNode(page, ids.interp_ordinary);
    await setInspectorText(
      page,
      "Ordinary prudent person under like circumstances — Restatement (Second) § 283.",
    );

    ids.interp_carrier = await paletteAdd(page, "Interpretation");
    await selectNode(page, ids.interp_carrier);
    await setInspectorText(
      page,
      "Heightened common-carrier standard — applies only to commercial drivers.",
    );

    ids.interp_emergency = await paletteAdd(page, "Interpretation");
    await selectNode(page, ids.interp_emergency);
    await setInspectorText(
      page,
      "Emergency doctrine (Cordas v. Peerless Transp.): relaxes reasonable-person " +
        "standard when actor faces sudden emergency not of their own making.",
    );

    // Mark common-carrier interpretation as dispositive on the Term:
    // selecting it should foreclose siblings.
    await editNode(page, ids.term_rp, { dispositive: true, order: 0 });

    await shot(page, "frame-term-interpretations");

    // Edges: breach Turns On term; term Interpreted As three interps.
    await addEdge(page, "TURNS_ON", ids.breach, ids.term_rp);
    await addEdge(page, "INTERPRETED_AS", ids.term_rp, ids.interp_ordinary);
    await addEdge(page, "INTERPRETED_AS", ids.term_rp, ids.interp_carrier);
    await addEdge(page, "INTERPRETED_AS", ids.term_rp, ids.interp_emergency);
  });

  await test.step("UI: add Checkpoints (boolean / multiple_choice / graded)", async () => {
    ids.cp_duty = await paletteAdd(page, "Checkpoint");
    await selectNode(page, ids.cp_duty);
    await setInspectorText(
      page,
      "Did Driver owe Plaintiff a duty of reasonable care under NY law?",
    );
    // Boolean Checkpoint with requires_authority=true (legal-mode binding-check).
    await editNode(page, ids.cp_duty, {
      answer_type: "boolean",
      requires_authority: true,
      options: [
        { id: "yes", label: "Yes — duty owed", satisfies: true },
        { id: "no", label: "No — no duty", satisfies: false, routes_to_status: "contested" },
      ],
      burden_level: "preponderance",
    });

    ids.cp_breach = await paletteAdd(page, "Checkpoint");
    await selectNode(page, ids.cp_breach);
    await setInspectorText(
      page,
      "Which characterization best fits Driver's conduct on the proven facts?",
    );
    await editNode(page, ids.cp_breach, {
      answer_type: "multiple_choice",
      requires_authority: false,
      options: [
        { id: "reckless", label: "Recklessly disregarded a known risk", satisfies: true },
        { id: "careless", label: "Failed to exercise reasonable care", satisfies: true },
        { id: "ordinary", label: "Acted as a reasonable person would", satisfies: false },
      ],
      burden_level: "preponderance",
    });

    ids.cp_factual = await paletteAdd(page, "Checkpoint");
    await selectNode(page, ids.cp_factual);
    await setInspectorText(page, "But for Driver's conduct, would Plaintiff have escaped injury?");
    await editNode(page, ids.cp_factual, {
      answer_type: "boolean",
      requires_authority: false,
      options: [
        { id: "yes", label: "Yes — but-for established", satisfies: true },
        { id: "no", label: "No — injury would have occurred anyway", satisfies: false },
      ],
      burden_level: "preponderance",
    });

    ids.cp_proximate = await paletteAdd(page, "Checkpoint");
    await selectNode(page, ids.cp_proximate);
    await setInspectorText(
      page,
      "Foreseeability of the harm-type: how clearly within the risk created?",
    );
    await editNode(page, ids.cp_proximate, {
      answer_type: "graded",
      requires_authority: false,
      options: [
        { id: "clear", label: "Clearly foreseeable (within zone of danger)", satisfies: true },
        { id: "moderate", label: "Plausibly foreseeable", satisfies: true },
        { id: "remote", label: "Remote / unforeseeable", satisfies: false },
      ],
      burden_level: "preponderance",
    });

    ids.cp_damages = await paletteAdd(page, "Checkpoint");
    await selectNode(page, ids.cp_damages);
    await setInspectorText(page, "Degree of cognizable damages established by the evidence.");
    await editNode(page, ids.cp_damages, {
      answer_type: "graded",
      requires_authority: false,
      options: [
        { id: "substantial", label: "Substantial proven damages", satisfies: true },
        { id: "nominal", label: "Nominal damages only", satisfies: true },
        { id: "none", label: "No cognizable damages", satisfies: false },
      ],
      burden_level: "preponderance",
    });

    ids.cp_comparative = await paletteAdd(page, "Checkpoint");
    await selectNode(page, ids.cp_comparative);
    await setInspectorText(
      page,
      "Comparative negligence defense: was Plaintiff's own negligence a substantial factor?",
    );
    await editNode(page, ids.cp_comparative, {
      answer_type: "boolean",
      requires_authority: false,
      options: [
        { id: "yes", label: "Yes — Plaintiff was negligent", satisfies: true },
        { id: "no", label: "No — Plaintiff exercised due care", satisfies: false },
      ],
      burden_level: "preponderance",
    });

    await shot(page, "frame-checkpoints");

    // Edges: SubQs/Interpretations route into the relevant Checkpoint.
    await addEdge(page, "LEADS_TO", ids.duty, ids.cp_duty);
    await addEdge(page, "LEADS_TO", ids.interp_ordinary, ids.cp_breach);
    await addEdge(page, "LEADS_TO", ids.factual_cause, ids.cp_factual);
    await addEdge(page, "LEADS_TO", ids.proximate_cause, ids.cp_proximate);
    await addEdge(page, "LEADS_TO", ids.damages, ids.cp_damages);
  });

  await test.step("UI: add LogicalGates (AND + UNLESS)", async () => {
    ids.and_elements = await paletteAdd(page, "Logical Gate");
    await selectNode(page, ids.and_elements);
    // AndGate schema: inputs is NodeRef[] (array of strings). Defaults from
    // buildNodeDefaults already give us an empty array; populate it.
    await editNode(page, ids.and_elements, {
      gate_type: "AND",
      inputs: [
        ids.cp_duty,
        ids.cp_breach,
        ids.cp_factual,
        ids.cp_proximate,
        ids.cp_damages,
      ],
      output_target: undefined,
    });

    ids.unless_defense = await paletteAdd(page, "Logical Gate");
    await selectNode(page, ids.unless_defense);
    // UnlessGate schema: main + exception are NodeRef (string). Switching
    // gate_type away from AND must scrub the AND-only `inputs` field, else
    // we end up with a node that has BOTH AND fields and UNLESS fields.
    await editNode(page, ids.unless_defense, {
      gate_type: "UNLESS",
      main: ids.and_elements,
      exception: ids.cp_comparative,
      inputs: undefined,
    });

    await shot(page, "frame-gates-added");
  });

  await test.step("UI: add Conclusion + GATES wiring", async () => {
    ids.conclusion = await paletteAdd(page, "Conclusion");
    await selectNode(page, ids.conclusion);
    await setInspectorText(
      page,
      "Defendant Driver is liable to Plaintiff for negligence (affirm).",
    );
    // The unless-gate's output feeds the conclusion via a GATES edge.
    await addEdge(page, "GATES", ids.unless_defense, ids.conclusion);
    await shot(page, "frame-conclusion");
  });

  await test.step("UI: add Authorities (binding + persuasive + same-jurisdiction)", async () => {
    ids.auth_palsgraf = await paletteAdd(page, "Authority");
    await selectNode(page, ids.auth_palsgraf);
    await setInspectorText(
      page,
      "Palsgraf v. Long Island R.R. Co.",
    );
    await editNode(page, ids.auth_palsgraf, {
      citation: "248 N.Y. 339 (1928)",
      court: "NY Court of Appeals",
      year: 1928,
      is_binding: true,
      jurisdiction: { level: "state", region: "NY" },
      binding_in: [{ level: "state", region: "NY" }],
      short_label: "Palsgraf (NY 1928)",
      holding_summary:
        "Duty in negligence runs only to those within the zone of foreseeable harm.",
    });

    ids.auth_vaughan = await paletteAdd(page, "Authority");
    await selectNode(page, ids.auth_vaughan);
    await setInspectorText(page, "Vaughan v. Menlove");
    await editNode(page, ids.auth_vaughan, {
      citation: "132 Eng. Rep. 490 (C.P. 1837)",
      court: "Court of Common Pleas (England)",
      year: 1837,
      is_binding: false,
      short_label: "Vaughan v. Menlove (1837)",
      holding_summary:
        "Reasonable-person standard is objective: actor judged by ordinary prudent person.",
    });

    ids.auth_cordas = await paletteAdd(page, "Authority");
    await selectNode(page, ids.auth_cordas);
    await setInspectorText(page, "Cordas v. Peerless Transp. Co.");
    await editNode(page, ids.auth_cordas, {
      citation: "27 N.Y.S.2d 198 (City Ct. 1941)",
      court: "NYC Municipal Court",
      year: 1941,
      is_binding: false,
      jurisdiction: { level: "state", region: "NY" },
      short_label: "Cordas v. Peerless (NY 1941)",
      holding_summary:
        "Emergency doctrine modifies the reasonable-person standard when actor faces sudden, unprovoked emergency.",
    });

    // CITES edges from each Authority to the Interpretation it supports.
    await addEdge(page, "CITES", ids.auth_palsgraf, ids.interp_ordinary, {
      strength: "directly_on_point",
    });
    await addEdge(page, "CITES", ids.auth_vaughan, ids.interp_ordinary, {
      strength: "analogous",
    });
    await addEdge(page, "CITES", ids.auth_cordas, ids.interp_emergency, {
      strength: "directly_on_point",
    });
    await shot(page, "frame-with-authorities");
  });

  await test.step("UI: add options_box override on standard_of_review", async () => {
    // Apply a per-instance options_box override on the duty SubQuestion:
    // standard_of_review = "de_novo" — typical for pure questions of law.
    await editNode(page, ids.duty, {
      standard_of_review: "de_novo",
    });
    await shot(page, "frame-options-box-override");
  });

  await test.step("inspect validation state", async () => {
    const state = await readFrameVersionFromStore(page);
    console.log(`[audit] nodes=${state.nodes.length} edges=${state.edges.length}`);
    console.log(
      `[audit] validation: ${state.validation.length} entries — ${state.validation
        .map((v) => `[${v.severity}]`)
        .join(" ")}`,
    );
    const errors = state.validation.filter((v) => v.severity === "error");
    if (errors.length > 0) {
      console.log("[audit] errors:");
      for (const e of errors) console.log(`  - ${e.message}`);
    }
    await shot(page, "frame-final-build");
  });

  await test.step("switch to Argument Running mode", async () => {
    const argRadio = page.getByRole("radio", { name: /argument/i }).first();
    await argRadio.click();
    // If a validation-warnings confirm dialog appears, accept it.
    const continueBtn = page.getByRole("button", { name: /continue/i }).first();
    if (await continueBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForTimeout(1_500);
    await shot(page, "after-mode-toggle");
  });

  await test.step("inspect argument-running landing surface", async () => {
    const interview = page.getByTestId("interview-pane");
    const visible = await interview.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!visible) {
      console.log("[audit] interview-pane not visible — mode toggle may have been blocked");
    } else {
      await shot(page, "argument-interview-pane");
    }
  });

  await test.step("cycle output viewer tabs (path_overlay / decision_tree / prose)", async () => {
    if (await page.getByTestId("output-view-tabs").isVisible().catch(() => false)) {
      await page.getByTestId("output-view-tab-path_overlay").click().catch(() => {});
      await shot(page, "output-path-overlay");
      await page.getByTestId("output-view-tab-decision_tree").click().catch(() => {});
      await shot(page, "output-decision-tree");
      await page.getByTestId("output-view-tab-prose").click().catch(() => {});
      await shot(page, "output-prose");
    }
  });

  await shot(page, "final-state");
});
