/**
 * Real-DOM integration test for FrameCanvas pointer events.
 *
 * The happy-dom unit tests at tests/ui/canvas/frame-canvas-interaction.test.tsx
 * mock @xyflow/react and verify prop wiring (does `onNodesChange` exist? is
 * `nodesDraggable` true?). Those checks have passed even when clicks fell
 * through to background panning in the browser, because they don't actually
 * exercise React Flow's pointer-event machinery.
 *
 * This spec hits the standalone canvas harness page served at
 * /canvas-harness.html (entry: src/canvas-harness.tsx). The harness mounts
 * <FrameCanvas /> with two pre-positioned RootQuestion nodes and forwards
 * every callback to `window.__canvasEvents`. We poll that array to assert
 * end-to-end behavior.
 */
import { test, expect, type Page } from "@playwright/test";

type CanvasEvent =
  | { kind: "node_moved"; node_id: string; x: number; y: number }
  | { kind: "selection_change"; node_ids: ReadonlyArray<string> }
  | { kind: "edge_created"; source: string; target: string }
  | { kind: "node_delete_requested"; node_id: string };

async function gotoHarness(page: Page): Promise<void> {
  await page.goto("/canvas-harness.html");
  await expect(page.getByTestId("canvas-harness")).toBeVisible();
  // Wait for both nodes to be rendered by React Flow. RF wraps each node in
  // a div with the data-id attribute matching the node id.
  await expect(page.locator('[data-id="node-a"]').first()).toBeVisible();
  await expect(page.locator('[data-id="node-b"]').first()).toBeVisible();
}

async function readEvents(page: Page): Promise<CanvasEvent[]> {
  return await page.evaluate(() => window.__canvasEvents.slice());
}

async function clearEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__canvasEvents.length = 0;
    window.__renderErrors.length = 0;
  });
}

async function expectNoRenderErrors(page: Page): Promise<void> {
  const errors = await page.evaluate(() => window.__renderErrors.slice());
  expect(errors, "Render errors during interaction").toEqual([]);
}

test("clicking a node fires onSelectionChange and does not throw render errors", async ({
  page,
}) => {
  await gotoHarness(page);
  await clearEvents(page);

  await page.locator('[data-id="node-a"]').first().click();

  // Wait briefly for the synchronous handler chain to complete.
  await expect.poll(async () => (await readEvents(page)).length).toBeGreaterThan(0);
  const events = await readEvents(page);
  const selection_events = events.filter((e) => e.kind === "selection_change");
  expect(selection_events.length).toBeGreaterThan(0);
  // The last selection event should include node-a.
  const last = selection_events[selection_events.length - 1];
  expect(last.node_ids).toContain("node-a");

  // CRITICAL: the click must not have triggered a render-loop. The original
  // bug was "Maximum update depth exceeded" thrown from react-dom; the unit
  // tests never saw it because they mock the ReactFlow component.
  await expectNoRenderErrors(page);
});

test("sibling inspector reflects the selected node id", async ({ page }) => {
  await gotoHarness(page);
  // Initial: sibling says "no selection"
  await expect(page.getByTestId("sibling-inspector")).toHaveText("no selection");
  await page.locator('[data-id="node-a"]').first().click();
  await expect(page.getByTestId("sibling-inspector")).toHaveText("selected: node-a");
  await expectNoRenderErrors(page);
});

test("external selection (outline-tree style) visually selects the node on the canvas", async ({
  page,
}) => {
  await gotoHarness(page);
  // node-b starts unselected
  await expect(page.locator('[data-id="node-b"]').first()).not.toHaveClass(/selected/);
  // Clicking the external selection button sets selection in the harness
  // store WITHOUT going through the canvas — mirrors the outline-tree path.
  await page.getByTestId("external-select-node-b").click();
  await expect(page.locator('[data-id="node-b"]').first()).toHaveClass(/selected/);
  await expect(page.getByTestId("sibling-inspector")).toHaveText("selected: node-b");
  await expectNoRenderErrors(page);
});

test("clicked node visually becomes selected", async ({ page }) => {
  await gotoHarness(page);

  const node = page.locator('[data-id="node-a"]').first();
  await node.click();

  // React Flow tags the wrapper element with class `selected` when a node
  // is selected. (xyflow v12: react-flow__node[+]selected)
  await expect(node).toHaveClass(/selected/);
});

test("dragging a node fires on_node_moved with the new position", async ({ page }) => {
  await gotoHarness(page);
  await clearEvents(page);

  const node = page.locator('[data-id="node-a"]').first();
  const box = await node.boundingBox();
  if (!box) throw new Error("node-a has no bounding box");

  // Drag the node 80px to the right and 60px down.
  const start_x = box.x + box.width / 2;
  const start_y = box.y + box.height / 2;
  await page.mouse.move(start_x, start_y);
  await page.mouse.down();
  await page.mouse.move(start_x + 80, start_y + 60, { steps: 10 });
  await page.mouse.up();

  await expect
    .poll(async () => (await readEvents(page)).filter((e) => e.kind === "node_moved").length)
    .toBeGreaterThan(0);

  const events = await readEvents(page);
  const moves = events.filter((e) => e.kind === "node_moved");
  // Last move should be for node-a, at a position roughly 80px right and
  // 60px down from the original (100, 100).
  const last_move = moves[moves.length - 1] as Extract<CanvasEvent, { kind: "node_moved" }>;
  expect(last_move.node_id).toBe("node-a");
  // Allow some tolerance since RF accounts for viewport pan/zoom, but the
  // delta should clearly reflect the drag direction.
  expect(last_move.x).toBeGreaterThan(100);
  expect(last_move.y).toBeGreaterThan(100);
});

test("clicking empty canvas pane deselects the node", async ({ page }) => {
  await gotoHarness(page);

  const node = page.locator('[data-id="node-a"]').first();
  await node.click();
  await expect(node).toHaveClass(/selected/);

  await clearEvents(page);
  // React Flow tags the empty interaction surface with `.react-flow__pane`.
  // Click it well below the nodes (which sit near y=100) so we don't land on
  // either node or the corner-positioned minimap/toolbar.
  const pane = page.locator(".react-flow__pane").first();
  const pane_box = await pane.boundingBox();
  if (!pane_box) throw new Error("react-flow__pane has no bounding box");
  await page.mouse.click(pane_box.x + pane_box.width / 2, pane_box.y + pane_box.height * 0.7);

  await expect(node).not.toHaveClass(/selected/);
});

test("pressing Delete after selecting a node fires on_node_delete_requested", async ({ page }) => {
  await gotoHarness(page);
  const node = page.locator('[data-id="node-a"]').first();
  await node.click();
  await expect(node).toHaveClass(/selected/);

  await clearEvents(page);
  await page.keyboard.press("Delete");

  await expect
    .poll(
      async () => (await readEvents(page)).filter((e) => e.kind === "node_delete_requested").length,
    )
    .toBeGreaterThan(0);

  const events = await readEvents(page);
  const deletes = events.filter((e) => e.kind === "node_delete_requested");
  expect(deletes.length).toBe(1);
  expect((deletes[0] as Extract<CanvasEvent, { kind: "node_delete_requested" }>).node_id).toBe(
    "node-a",
  );
});
