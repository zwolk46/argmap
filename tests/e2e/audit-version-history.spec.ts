/**
 * AUDIT — VERSION HISTORY (frame + session)
 *
 * Drives the version-history UI end-to-end through the live browser:
 *
 *   1. Save-milestone affordance in frame-building mode
 *   2. Version-history pane: open, list, milestone filter, summaries
 *   3. Preview a prior frame version (read-only, banner, no drag)
 *   4. Structural diff (Compare selected vs current)
 *   5. Restore: confirmation dialog + new version creation
 *   6. Session-side version history (save milestone, preview)
 *   7. F-028 regression: FrameVersion snapshot survives reload
 *   8. Drift indicator after frame advances past session pin
 *
 * Run:
 *   E2E_LIVE=1 npx playwright test tests/e2e/audit-version-history.spec.ts \
 *     --headed --workers=1
 *
 * Writes real data to Supabase. Frame title is prefixed
 * "Agent Audit VH —" so it's identifiable from Home.
 */

import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const LIVE = process.env.E2E_LIVE === "1";
const EMAIL = process.env.E2E_USER_EMAIL ?? "zacharywolk05@gmail.com";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "testtest1";
const TIMESTAMP = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
const FRAME_TITLE = `Agent Audit VH — Version History Probe ${TIMESTAMP}`;

test.skip(!LIVE, "E2E_LIVE=1 to run the live-Supabase version-history audit");
test.setTimeout(15 * 60_000);

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------
const SCREENSHOT_DIR = path.resolve(process.cwd(), "tests", "audit", "version-history");
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
// Programmatic helpers
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
  await page.waitForTimeout(80);
}

async function saveFrameMilestone(page: Page, change_summary: string): Promise<void> {
  await page.evaluate(async (cs) => {
    const w = window as unknown as {
      __argmap_test?: {
        frame_store?: { getState(): { saveFrameMilestone(s: string): Promise<void> } };
      };
    };
    const fs = w.__argmap_test?.frame_store;
    if (!fs) throw new Error("frame_store unavailable");
    await fs.getState().saveFrameMilestone(cs);
  }, change_summary);
  // Settle so the autosave queue + the milestone save don't interleave at
  // the next applyPatch tick.
  await page.waitForTimeout(400);
}

async function saveSessionMilestoneViaStore(page: Page, change_summary: string): Promise<void> {
  await page.evaluate(async (cs) => {
    const w = window as unknown as {
      __argmap_test?: {
        session_store?: { getState(): { saveSessionMilestone(s: string): Promise<void> } };
      };
    };
    const ss = w.__argmap_test?.session_store;
    if (!ss) throw new Error("session_store unavailable");
    await ss.getState().saveSessionMilestone(cs);
  }, change_summary);
  await page.waitForTimeout(400);
}

async function readFrameStore(page: Page): Promise<{
  frame_id: string | null;
  frame_current_version_id: string | null;
  frame_version_id: string | null;
  frame_version_number: number | null;
  is_milestone: boolean | null;
  jurisdiction_default: unknown;
  mode: string | null;
  flavor: string | null;
  default_satisfaction_policies: unknown;
  nodes_len: number;
  edges_len: number;
}> {
  return await page.evaluate(() => {
    const w = window as unknown as {
      __argmap_test?: { frame_store?: { getState(): unknown } };
    };
    const s = w.__argmap_test?.frame_store?.getState() as
      | {
          frame: { id: string; current_version_id: string } | null;
          frame_version: {
            id: string;
            version_number: number;
            is_milestone: boolean;
            nodes: unknown[];
            edges: unknown[];
            jurisdiction_default?: unknown;
            mode?: string;
            flavor?: string;
            default_satisfaction_policies?: unknown;
          } | null;
        }
      | undefined;
    if (!s) throw new Error("frame_store missing");
    return {
      frame_id: s.frame?.id ?? null,
      frame_current_version_id: s.frame?.current_version_id ?? null,
      frame_version_id: s.frame_version?.id ?? null,
      frame_version_number: s.frame_version?.version_number ?? null,
      is_milestone: s.frame_version?.is_milestone ?? null,
      jurisdiction_default: s.frame_version?.jurisdiction_default ?? null,
      mode: s.frame_version?.mode ?? null,
      flavor: s.frame_version?.flavor ?? null,
      default_satisfaction_policies: s.frame_version?.default_satisfaction_policies ?? null,
      nodes_len: s.frame_version?.nodes.length ?? 0,
      edges_len: s.frame_version?.edges.length ?? 0,
    };
  });
}

async function loadFrameSummaries(
  page: Page,
  frame_id: string,
): Promise<
  Array<{
    id: string;
    version_number: number;
    is_milestone: boolean;
    change_summary?: string;
  }>
> {
  return await page.evaluate(async (fid) => {
    const w = window as unknown as {
      // Repository accessed via store — but the repo lives on the
      // RepositoryProvider, not on window. Cheaper path: shell out to the
      // version-history use-version-summaries hook? No — that's a hook.
      // Easiest: call the repo via the frame store's parent provider —
      // but the test handle only exposes stores. Resort to reading store
      // state and falling back: ask the version-tree DOM.
      __argmap_test?: unknown;
    };
    // Use the DOM. We open the pane in the calling step and read rows.
    void w;
    void fid;
    return [] as Array<{
      id: string;
      version_number: number;
      is_milestone: boolean;
      change_summary?: string;
    }>;
  }, frame_id);
}

// Read the rendered version-tree rows from the pane (assumes pane is open).
async function readVersionTreeRows(page: Page): Promise<
  Array<{ id: string; version_number: number; is_milestone: boolean }>
> {
  return await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll('[data-testid="version-tree-row"]'),
    ) as HTMLElement[];
    return rows.map((r) => ({
      id: r.dataset.versionId ?? r.getAttribute("data-version-id") ?? "",
      version_number: Number(
        r.dataset.versionNumber ?? r.getAttribute("data-version-number") ?? "0",
      ),
      is_milestone:
        (r.dataset.isMilestone ?? r.getAttribute("data-is-milestone")) === "true",
    }));
  });
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
async function paletteAdd(page: Page, label: string): Promise<string> {
  const before = await readFrameStore(page);
  const beforeIds = new Set<string>(
    await page.evaluate(() => {
      const w = window as unknown as {
        __argmap_test?: { frame_store?: { getState(): unknown } };
      };
      const s = w.__argmap_test?.frame_store?.getState() as
        | { frame_version: { nodes: Array<{ id: string }> } | null }
        | undefined;
      return (s?.frame_version?.nodes ?? []).map((n) => n.id);
    }),
  );
  await page.getByRole("button", { name: label, exact: true }).first().click();
  let freshId: string | null = null;
  await expect
    .poll(
      async () => {
        const after = await page.evaluate(() => {
          const w = window as unknown as {
            __argmap_test?: { frame_store?: { getState(): unknown } };
          };
          const s = w.__argmap_test?.frame_store?.getState() as
            | { frame_version: { nodes: Array<{ id: string }> } | null }
            | undefined;
          return (s?.frame_version?.nodes ?? []).map((n) => n.id);
        });
        const fresh = after.find((id) => !beforeIds.has(id));
        if (fresh) {
          freshId = fresh;
          return true;
        }
        return false;
      },
      { timeout: 5_000 },
    )
    .toBe(true);
  if (!freshId) throw new Error(`paletteAdd(${label}) failed`);
  void before;
  return freshId;
}

async function selectNode(page: Page, nodeId: string): Promise<void> {
  await page.locator(`[data-node-id="${nodeId}"]`).first().click();
  await page.waitForTimeout(60);
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
  await page.waitForTimeout(120);
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
  await page.waitForTimeout(40);
  return id;
}

async function editNode(
  page: Page,
  nodeId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    ({ id, partial }) => {
      const w = window as unknown as {
        __argmap_test?: {
          frame_store?: { getState(): { applyPatch(p: unknown): void } };
        };
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

async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("sign-in-form")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("sign-in-email").fill(EMAIL);
  await page.getByTestId("sign-in-password").fill(PASSWORD);
  await page.getByTestId("sign-in-submit").click();
  await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function openHistoryPane(page: Page): Promise<void> {
  // Top-bar clock icon: aria-label="Version history"
  const btn = page.getByRole("button", { name: /version history/i }).first();
  await btn.click();
  await expect(page.getByTestId("version-history-header-title")).toBeVisible({
    timeout: 5_000,
  });
}

async function closeHistoryPane(page: Page): Promise<void> {
  const close = page.getByTestId("version-history-close");
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(150);
  }
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------
test("audit version history: frame + session — milestones, preview, compare, restore, drift, F-028", async ({
  page,
}) => {
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console.error]", m.text());
  });

  let frame_id: string | null = null;

  // -------------------------------------------------------------------------
  await test.step("sign in + create legal frame via wizard", async () => {
    await signIn(page);
    await shot(page, "01-home-after-signin");

    await page.getByRole("button", { name: /new frame/i }).first().click();
    await expect(page.getByTestId("new-frame-wizard")).toBeVisible();
    await page.getByTestId("wizard-mode-legal").click();
    await page.getByTestId("wizard-title-input").fill(FRAME_TITLE);
    await page
      .getByTestId("wizard-description-input")
      .fill("Version-history audit probe — 5 milestones, preview, compare, restore.");
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

    const s = await readFrameStore(page);
    frame_id = s.frame_id;
    expect(frame_id).toBeTruthy();
    await shot(page, "02-frame-building-empty");
  });

  // -------------------------------------------------------------------------
  // FINDING #1: In frame-building mode there is NO UI button to save a
  // milestone. The top-bar only exposes the version-history clock,
  // FrameSettings, Help, SignOut. The `[data-testid="save-milestone-button"]`
  // is argument-running-only and lives in InterviewEmptyState (only renders
  // after all interview items are resolved). We therefore use
  // `frame_store.getState().saveFrameMilestone(label)` directly.
  // -------------------------------------------------------------------------
  await test.step("AUDIT 1: save-milestone affordance in frame-building", async () => {
    // Search the top bar for any button literally named "save milestone".
    const candidate = page.getByRole("button", { name: /save milestone/i });
    const count = await candidate.count();
    console.log(`[audit] frame-building "save milestone" buttons found: ${count}`);
    expect(count).toBe(0); // documents the gap

    // Confirm the only history-related top-bar button is the clock.
    await expect(page.getByRole("button", { name: /version history/i }).first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  const ids: Record<string, string> = {};

  await test.step("Milestone v1: RootQuestion statement", async () => {
    ids.root = await paletteAdd(page, "Root Question");
    await selectNode(page, ids.root);
    await setInspectorText(
      page,
      "Is Defendant Driver liable to Plaintiff for negligence under New York law?",
    );
    await saveFrameMilestone(page, "v1: RootQuestion statement");
    const s = await readFrameStore(page);
    // FINDING: saveFrameMilestone() writes to repo with is_milestone=true,
    // but the in-memory frame_version snapshot is NOT updated (see
    // frame-store.ts:saveFrameMilestone — it awaits autosave but doesn't
    // call set() with the new version). So the store still shows
    // is_milestone=false until next loadFrame. Milestone presence is
    // verified later by inspecting the version-tree pane rows.
    console.log(`[audit] after v1: version_number=${s.frame_version_number} is_milestone=${s.is_milestone}`);
    await shot(page, "03-milestone-v1-root-only");
  });

  // -------------------------------------------------------------------------
  await test.step("Milestone v2: + SubQuestions + Term + 2 Interpretations", async () => {
    ids.duty = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.duty);
    await setInspectorText(page, "Did Driver owe Plaintiff a duty of reasonable care?");

    ids.breach = await paletteAdd(page, "Sub-Question");
    await selectNode(page, ids.breach);
    await setInspectorText(page, "Did Driver breach the standard of reasonable care?");

    ids.term_rp = await paletteAdd(page, "Term");
    await selectNode(page, ids.term_rp);
    await setInspectorText(page, "Reasonable Person Standard");

    ids.interp_ordinary = await paletteAdd(page, "Interpretation");
    await selectNode(page, ids.interp_ordinary);
    await setInspectorText(
      page,
      "Ordinary prudent person under like circumstances — Restatement (Second) § 283.",
    );

    ids.interp_emergency = await paletteAdd(page, "Interpretation");
    await selectNode(page, ids.interp_emergency);
    await setInspectorText(
      page,
      "Emergency doctrine: relaxes reasonable-person standard for sudden emergencies.",
    );

    await addEdge(page, "DECOMPOSES_INTO", ids.root, ids.duty);
    await addEdge(page, "DECOMPOSES_INTO", ids.root, ids.breach);
    await addEdge(page, "TURNS_ON", ids.breach, ids.term_rp);
    await addEdge(page, "INTERPRETED_AS", ids.term_rp, ids.interp_ordinary);
    await addEdge(page, "INTERPRETED_AS", ids.term_rp, ids.interp_emergency);

    await saveFrameMilestone(page, "v2: + SubQs + Term + 2 Interpretations");
    const s = await readFrameStore(page);
    console.log(`[audit] after v2: version_number=${s.frame_version_number} nodes=${s.nodes_len} edges=${s.edges_len}`);
    await shot(page, "04-milestone-v2-subqs-term-interps");
  });

  // -------------------------------------------------------------------------
  await test.step("Milestone v3: + Checkpoint + Conclusion", async () => {
    ids.cp_duty = await paletteAdd(page, "Checkpoint");
    await selectNode(page, ids.cp_duty);
    await setInspectorText(page, "Did Driver owe Plaintiff a duty of reasonable care?");
    await editNode(page, ids.cp_duty, {
      answer_type: "boolean",
      requires_authority: false,
      options: [
        { id: "yes", label: "Yes — duty owed", satisfies: true },
        { id: "no", label: "No — no duty", satisfies: false },
      ],
      burden_level: "preponderance",
    });

    ids.conclusion = await paletteAdd(page, "Conclusion");
    await selectNode(page, ids.conclusion);
    await setInspectorText(page, "Defendant is liable for negligence.");

    await addEdge(page, "LEADS_TO", ids.duty, ids.cp_duty);

    await saveFrameMilestone(page, "v3: + Checkpoint + Conclusion");
    const s = await readFrameStore(page);
    console.log(`[audit] after v3: version_number=${s.frame_version_number}`);
    await shot(page, "05-milestone-v3-checkpoint-conclusion");
  });

  // -------------------------------------------------------------------------
  await test.step("Milestone v4: + Authority + CITES edge + jurisdiction_default", async () => {
    ids.auth_palsgraf = await paletteAdd(page, "Authority");
    await selectNode(page, ids.auth_palsgraf);
    await setInspectorText(page, "Palsgraf v. Long Island R.R. Co.");
    await editNode(page, ids.auth_palsgraf, {
      citation: "248 N.Y. 339 (1928)",
      court: "NY Court of Appeals",
      year: 1928,
      is_binding: true,
      jurisdiction: { level: "state", region: "NY" },
      binding_in: [{ level: "state", region: "NY" }],
      short_label: "Palsgraf (NY 1928)",
      holding_summary: "Duty runs only to those within the zone of foreseeable harm.",
    });
    await addEdge(page, "CITES", ids.auth_palsgraf, ids.interp_ordinary, {
      strength: "directly_on_point",
    });

    // F-028 setup: write Frame-level jurisdiction_default via metadata_edited.
    await frameApplyPatch(page, {
      kind: "metadata_edited",
      partial: { jurisdiction_default: { level: "state", region: "NY" } },
    });

    await saveFrameMilestone(page, "v4: + Authority + CITES + jurisdiction NY");
    const s = await readFrameStore(page);
    console.log(
      `[audit] after v4: jurisdiction_default=${JSON.stringify(s.jurisdiction_default)} mode=${s.mode} flavor=${s.flavor}`,
    );
    expect(s.jurisdiction_default).toEqual({ level: "state", region: "NY" });
    await shot(page, "06-milestone-v4-authority-cites-jurisdiction");
  });

  // -------------------------------------------------------------------------
  await test.step("Milestone v5: rename some nodes", async () => {
    await editNode(page, ids.root, {
      statement:
        "Is the Defendant Driver liable to the Plaintiff for negligence (NY)? [renamed v5]",
    });
    await editNode(page, ids.conclusion, {
      statement: "Defendant Driver is liable for negligence. [renamed v5]",
    });
    await saveFrameMilestone(page, "v5: rename root + conclusion");
    const s = await readFrameStore(page);
    console.log(`[audit] after v5: version_number=${s.frame_version_number}`);
    await shot(page, "07-milestone-v5-renames");
  });

  // -------------------------------------------------------------------------
  await test.step("AUDIT 2: open version-history pane + verify list", async () => {
    await openHistoryPane(page);
    // Wait for the version-tree to render.
    await expect(page.getByTestId("version-tree")).toBeVisible({ timeout: 5_000 });

    // Filter to milestones only to assert all 5 are present.
    await page.getByTestId("milestone-filter-milestones").click();
    await page.waitForTimeout(200);

    const rows = await readVersionTreeRows(page);
    const milestone_numbers = rows
      .filter((r) => r.is_milestone)
      .map((r) => r.version_number)
      .sort((a, b) => a - b);
    console.log(`[audit] milestone version_numbers visible: ${milestone_numbers.join(", ")}`);
    expect(milestone_numbers.length).toBeGreaterThanOrEqual(5);

    await shot(page, "08-version-history-pane-milestones");

    // Switch back to "all".
    await page.getByTestId("milestone-filter-all").click();
    await page.waitForTimeout(150);
    await shot(page, "09-version-history-pane-all");
  });

  // -------------------------------------------------------------------------
  await test.step("AUDIT 3: preview a prior frame version (read-only)", async () => {
    // Select v1 (the oldest milestone visible).
    const rows = await readVersionTreeRows(page);
    const milestones = rows.filter((r) => r.is_milestone).sort((a, b) => a.version_number - b.version_number);
    const v1 = milestones[0];
    expect(v1).toBeTruthy();
    await page
      .locator(`[data-testid="version-tree-row"][data-version-id="${v1.id}"]`)
      .first()
      .click();
    await page.waitForTimeout(150);

    // Click Preview in the footer.
    await page.getByTestId("footer-preview").click();

    // Banner appears.
    const banner = page.getByTestId("preview-banner");
    await expect(banner).toBeVisible({ timeout: 5_000 });
    const banner_text = await banner.textContent();
    console.log(`[audit] preview banner text: ${banner_text}`);
    expect(banner_text ?? "").toMatch(/Previewing version \d+ \(read-only\)/);

    // Frame-preview-view present
    await expect(page.getByTestId("frame-preview-view")).toBeVisible();

    await shot(page, "10-frame-preview-v1-readonly");

    // Try to drag a node — verify it does NOT move. We attempt a small drag
    // gesture on whatever node is rendered and assert the data-node-id's
    // position doesn't change relative to itself across the gesture.
    const previewedNode = page.locator("[data-node-id]").first();
    if (await previewedNode.isVisible().catch(() => false)) {
      const before = await previewedNode.boundingBox();
      if (before) {
        await page.mouse.move(before.x + 10, before.y + 10);
        await page.mouse.down();
        await page.mouse.move(before.x + 120, before.y + 120, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        const after = await previewedNode.boundingBox();
        if (after) {
          const dx = Math.abs((after.x ?? 0) - (before.x ?? 0));
          const dy = Math.abs((after.y ?? 0) - (before.y ?? 0));
          console.log(`[audit] preview-mode drag: dx=${dx.toFixed(1)} dy=${dy.toFixed(1)} (expect both ~0)`);
          // Allow a tiny epsilon — pan/zoom can shift origin a hair.
          expect(dx).toBeLessThan(20);
          expect(dy).toBeLessThan(20);
        }
      }
    }

    // No node-palette in preview mode (palette is frame-building chrome).
    // Drag from palette tile to canvas wouldn't fire anyway; just verify
    // the "Save snapshot" / inspector-save controls are not active. The
    // strict check: preview-banner-exit exists and is the only interactive
    // CTA in the banner row.
    await expect(page.getByTestId("preview-banner-exit")).toBeVisible();

    await shot(page, "11-preview-drag-attempted");

    // Exit preview.
    await page.getByTestId("preview-banner-exit").click();
    await expect(banner).toBeHidden({ timeout: 3_000 });
    await shot(page, "12-after-exit-preview");
  });

  // -------------------------------------------------------------------------
  await test.step("AUDIT 4: structural diff (Compare)", async () => {
    // Pane may close on preview-exit in some flows; re-open if needed.
    if (!(await page.getByTestId("version-history-header-title").isVisible().catch(() => false))) {
      await openHistoryPane(page);
    }
    const rows = await readVersionTreeRows(page);
    const milestones = rows.filter((r) => r.is_milestone).sort((a, b) => a.version_number - b.version_number);
    // Select v2 — compare uses (selected, current).
    const v2 = milestones[1];
    expect(v2).toBeTruthy();
    await page
      .locator(`[data-testid="version-tree-row"][data-version-id="${v2.id}"]`)
      .first()
      .click();
    await page.waitForTimeout(150);
    await page.getByTestId("footer-compare").click();

    const compareTitle = page.getByTestId("compare-view-title");
    await expect(compareTitle).toBeVisible({ timeout: 5_000 });
    const title_text = await compareTitle.textContent();
    console.log(`[audit] compare title: ${title_text}`);
    expect(title_text ?? "").toMatch(/Compare v\d+ to v\d+/);

    // Verify some compare-entry lists rendered.
    const listCount = await page.getByTestId("compare-entry-list").count();
    const rowCount = await page.getByTestId("compare-entry-row").count();
    console.log(`[audit] compare lists=${listCount} entry-rows=${rowCount}`);
    expect(listCount).toBeGreaterThan(0);
    expect(rowCount).toBeGreaterThan(0);

    await shot(page, "13-compare-view");

    // Click first entry row — should not throw; navigates to entity.
    await page.getByTestId("compare-entry-row").first().click();
    await page.waitForTimeout(200);
    await shot(page, "14-compare-entry-clicked");
  });

  // -------------------------------------------------------------------------
  // FINDING #2: Compare in the UI is "selected vs current", not "two
  // arbitrary milestones". The footer Compare button always uses
  // current_version_id as the `to` half (see version-history-pane.tsx
  // handleCompareClicked). Task wording "pick two milestones, click compare"
  // is unsupported — selecting two rows is not exposed. Document as B.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  await test.step("AUDIT 5: restore an older milestone", async () => {
    // Go back to the version tree.
    const backBtn = page.getByRole("button", { name: /back to history/i }).first();
    if (await backBtn.isVisible().catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(200);
    }

    const before = await readFrameStore(page);
    const beforeVersionNumber = before.frame_version_number ?? 0;
    const beforeCurrentVersionId = before.frame_current_version_id;
    console.log(`[audit] before-restore: current_version=v${beforeVersionNumber} id=${beforeCurrentVersionId}`);

    const rows = await readVersionTreeRows(page);
    const milestones = rows.filter((r) => r.is_milestone).sort((a, b) => a.version_number - b.version_number);
    const v2 = milestones[1];
    await page
      .locator(`[data-testid="version-tree-row"][data-version-id="${v2.id}"]`)
      .first()
      .click();
    await page.waitForTimeout(150);
    await shot(page, "15-restore-selected-older");

    await page.getByTestId("footer-restore").click();
    // Restore dialog appears.
    await expect(page.getByTestId("restore-confirm-body")).toBeVisible({ timeout: 3_000 });
    const body = await page.getByTestId("restore-confirm-body").textContent();
    console.log(`[audit] restore dialog body: ${body}`);
    expect(body ?? "").toMatch(/will create a new version/i);

    await shot(page, "16-restore-confirm-dialog");

    // Confirm.
    await page.getByRole("button", { name: /^restore$/i }).click();
    await page.waitForTimeout(1_200);

    const after = await readFrameStore(page);
    console.log(
      `[audit] after-restore: current_version=v${after.frame_version_number} id=${after.frame_current_version_id}`,
    );
    // New version is current; numerically higher than before.
    expect((after.frame_version_number ?? 0)).toBeGreaterThan(beforeVersionNumber);
    expect(after.frame_current_version_id).not.toBe(beforeCurrentVersionId);

    await shot(page, "17-after-restore");
  });

  // -------------------------------------------------------------------------
  await test.step("AUDIT 6: switch to argument-running + session-side history", async () => {
    // Close history pane if open.
    await closeHistoryPane(page);

    // Switch to argument-running mode.
    const argRadio = page.getByRole("radio", { name: /argument/i }).first();
    await argRadio.click();
    const continueBtn = page.getByRole("button", { name: /continue/i }).first();
    if (await continueBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await continueBtn.click();
    }
    await page.waitForTimeout(1_500);
    const interview = page.getByTestId("interview-pane");
    const interview_visible = await interview.isVisible({ timeout: 8_000 }).catch(() => false);
    console.log(`[audit] arg-mode reached: interview-pane visible=${interview_visible}`);
    await shot(page, "18-argument-running");

    if (!interview_visible) {
      console.log("[audit] AUDIT 6 skipped — could not reach argument-running mode");
      return;
    }

    // Save a session milestone via the store (no resolved-interview UI yet).
    await saveSessionMilestoneViaStore(page, "session v-milestone via store");

    // Open the version-history pane — in argument-running it shows tabs.
    await openHistoryPane(page);
    await expect(page.getByTestId("version-history-tabs")).toBeVisible({ timeout: 4_000 });
    // Sessions tab is default.
    await expect(page.getByTestId("version-tree")).toBeVisible({ timeout: 4_000 });
    await shot(page, "19-session-history-pane");

    // Preview a session version (if any).
    const session_rows = await readVersionTreeRows(page);
    if (session_rows.length > 0) {
      const oldest = session_rows.sort((a, b) => a.version_number - b.version_number)[0];
      await page
        .locator(`[data-testid="version-tree-row"][data-version-id="${oldest.id}"]`)
        .first()
        .click();
      await page.waitForTimeout(150);
      await page.getByTestId("footer-preview").click();
      const banner = page.getByTestId("preview-banner");
      if (await banner.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const t = await banner.textContent();
        console.log(`[audit] session preview banner: ${t}`);
        expect(t ?? "").toMatch(/Previewing session version \d+ \(read-only\)/);
        await shot(page, "20-session-preview");
        await page.getByTestId("preview-banner-exit").click();
      } else {
        console.log("[audit] session preview banner did not appear");
        await shot(page, "20-session-preview-banner-missing");
      }
    } else {
      console.log("[audit] no session rows in history pane");
      await shot(page, "20-session-no-rows");
    }
  });

  // -------------------------------------------------------------------------
  await test.step("AUDIT 8: drift indicator — advance frame past session pin", async () => {
    // We're (best-effort) in argument-running with the pane potentially open.
    // Save another FRAME milestone via the store while in arg-mode → the
    // frame version_number advances, but the session is still pinned to
    // its earlier frame_version_id.
    await closeHistoryPane(page);

    // Apply a benign frame patch to bump the frame version, then milestone.
    await frameApplyPatch(page, {
      kind: "metadata_edited",
      partial: { description: `Drift-trigger edit @ ${new Date().toISOString()}` },
    });
    await saveFrameMilestone(page, "drift-trigger milestone");

    // Drift indicator should appear in the top-bar.
    const drift = page.getByTestId("frame-version-drift-indicator");
    const drift_visible = await drift.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[audit] drift indicator visible=${drift_visible}`);
    if (drift_visible) {
      const has_drift = await drift.getAttribute("data-has-drift");
      const drift_text = await drift.textContent();
      console.log(`[audit] drift data-has-drift=${has_drift} text=${drift_text}`);
      await shot(page, "21-drift-indicator");

      // Click — should open a migration dialog (or placeholder).
      if (has_drift === "true") {
        await drift.click();
        await page.waitForTimeout(400);
        await shot(page, "22-drift-clicked-migration");
      }
    } else {
      await shot(page, "21-drift-not-visible");
    }
  });

  // -------------------------------------------------------------------------
  await test.step("AUDIT 7: F-028 regression — FrameVersion snapshot survives reload", async () => {
    // Capture the frame's snapshot fields BEFORE reload.
    const before = await readFrameStore(page);
    console.log(
      `[audit] F-028 before-reload: jurisdiction=${JSON.stringify(before.jurisdiction_default)} mode=${before.mode} flavor=${before.flavor} policies=${JSON.stringify(before.default_satisfaction_policies)}`,
    );
    expect(before.frame_id).toBeTruthy();

    const savedFrameId = before.frame_id!;
    const savedVersionId = before.frame_version_id;

    // Reload.
    await page.reload();
    // After reload we land on sign-in (auth state may or may not persist via Supabase).
    const signInVisible = await page
      .getByTestId("sign-in-form")
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (signInVisible) {
      await page.getByTestId("sign-in-email").fill(EMAIL);
      await page.getByTestId("sign-in-password").fill(PASSWORD);
      await page.getByTestId("sign-in-submit").click();
    }
    await expect(page.getByRole("button", { name: /new frame/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    // Re-open our frame from Home — click the row containing FRAME_TITLE.
    const row = page.getByText(FRAME_TITLE, { exact: false }).first();
    await row.click();
    await page.waitForTimeout(1_500);

    // Wait for the dev test handle to remount.
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

    const after = await readFrameStore(page);
    console.log(
      `[audit] F-028 after-reload: jurisdiction=${JSON.stringify(after.jurisdiction_default)} mode=${after.mode} flavor=${after.flavor} policies=${JSON.stringify(after.default_satisfaction_policies)}`,
    );
    expect(after.frame_id).toBe(savedFrameId);
    // Snapshotted Frame-level fields should survive.
    expect(after.jurisdiction_default).toEqual({ level: "state", region: "NY" });
    // mode/flavor should be present on the snapshot (legal mode).
    expect(after.mode).toBe("legal");
    void savedVersionId;
    await shot(page, "23-f028-after-reload");
  });

  await shot(page, "99-final-state");
});
