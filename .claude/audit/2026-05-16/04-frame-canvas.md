# Frame Building Canvas — Audit Findings

Scope: React Flow (`@xyflow/react` v12) integration, custom nodes/edges, drag-drop, connector handle, edge-creation popup, minimap, toolbar, ELK layout integration, and styling. User-perspective severity buckets.

Severity legend: **P0 = visibly broken / dead feature** · **P1 = high-risk bug or correctness gap** · **P2 = polish, hardening, or perf**.

---

## P0 — Visibly broken or dead features

### 1. `legal_mode` is never passed to FrameCanvas — Authority pill is dead in Frame Building
`/Users/zacharywolk/zwolk/argmap/src/ui/frame-building/frame-building-page.tsx:321-359` mounts `<FrameCanvas>` without ever passing `legal_mode`. `FrameCanvasInner` defaults it to `false` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:393`). Result: the binding/persuasive pill rendered by `AuthorityNode` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-renderers.tsx:79`) is unreachable from the production page, even in a legal-mode frame.

### 2. `authority_binding_kind` is never populated in `buildRFNodes`
`FrameCanvasNodeData` declares `authority_binding_kind?: "binding" | "persuasive"` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/types.ts:46`) and `AuthorityNode` reads it (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-renderers.tsx:79`), but `buildRFNodes` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:197-225`) never sets the field. Even if `legal_mode` were on, `data.authority_binding_kind` would always be `undefined` and the pill never renders. Schema actually exposes `Authority.is_binding` (`/Users/zacharywolk/zwolk/argmap/src/schema/nodes.ts:190`) which the data builder never reads.

### 3. `<ConnectorHandle>` component is dead code
`grep -rn "<ConnectorHandle"` finds zero JSX usages anywhere in `src/`. The file at `/Users/zacharywolk/zwolk/argmap/src/ui/canvas/connector-handle.tsx` is exported from `/Users/zacharywolk/zwolk/argmap/src/ui/canvas/index.ts:16-17` but never mounted. The actual edge-creation gesture goes through React Flow's built-in `<Handle>` components inside `NodeFrame` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:233-241,290-297,346-353,360-368`). The orphan `ConnectorHandle` also lacks any touch-event handling (mousedown/mousemove/mouseup only), so promoting it would silently break iPad use.

### 4. Canvas-toolbar search input is permanently hidden
`CanvasToolbar` renders the search `<input>` only when `onSearch` is passed (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/canvas-toolbar.tsx:111-130`). `FrameCanvas` never forwards an `onSearch` to `CanvasToolbar` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:782-786`). `FrameCanvasProps.search` is declared at line 82 but unread. The toolbar's entire search affordance is dead.

### 5. xyflow attribution suppressed without paid license
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:774` sets `proOptions={{ hideAttribution: true }}`. xyflow's MIT license requires the attribution badge unless the consumer holds a Pro subscription. There is no other evidence in the repo of a Pro plan. Compliance/license risk.

### 6. Edge-color arrowhead mismatch (`markerEnd` defaults)
`StructuralEdge`, `ForeclosesEdge`, `CheckpointOptionEdge`, `AnnotationEdge`, and `ArgumentOverlayEdge` all forward React Flow's default `markerEnd` arrowhead unchanged (e.g., `/Users/zacharywolk/zwolk/argmap/src/ui/canvas/edges/forecloses-edge.tsx:25`, `/Users/zacharywolk/zwolk/argmap/src/ui/canvas/edges/argument-overlay-edge.tsx:57`). The stroke is themed per edge type (foreclosure red, supports teal, contradicts orange, primary-path accent) but the arrowhead color stays neutral. Visible mismatch on every typed edge.

### 7. `Background` dot color passed as CSS-var string (likely no-op)
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:780` calls `<Background color="var(--color-border-subtle)" …>`. React Flow's Background renders the dots via SVG `<circle fill="…">`, and SVG attribute values do **not** resolve CSS custom properties (only style-context resolution does). The dot color either falls back to xyflow's default or renders as the literal string `var(...)` (invalid → black). Themed canvas grid is broken.

### 8. `fc_visibility` prop drift — toolbar state divorces from caller after mount
`FrameCanvasInner` stores `foreclosure_visibility` in local state initialized from the prop only (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:421-422`). If a parent later passes a new `foreclosure_visibility` (e.g., persisted in user preferences and reloaded), the change is silently ignored. The local toolbar toggle becomes the only source of truth.

### 9. Collapsed SubQuestions render at `(0, 0)`
`frameToElkGraph` filters out nodes whose ancestor SubQuestion is collapsed via `computeVisibleNodes` (`/Users/zacharywolk/zwolk/argmap/src/layout/elk-mapping.ts:117-161`). But `buildRFNodes` iterates **all** `frame_version.nodes` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:147`), and for a node that ELK never positioned, the fallback is `{x: 0, y: 0}` (line 200). Effect: collapsing a SubQuestion piles its descendants on top of each other at canvas origin instead of hiding them.

### 10. Edge selection prop never produces a visual highlight
`FrameCanvas.onSelectionChange` returns both `node_ids` and `edge_ids` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:619-627`), but the inbound `selection` prop only carries `NodeRef[]` and the selection-sync effect only updates `rf_nodes.selected` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:545-558`). When `frame-building-page.tsx` (`handleSelectionChange` lines 187-204) routes to `{ kind: "edge", edge_id }`, that selection cannot be reflected on the canvas — the highlighted-edge state is unidirectional from RF to parent, never parent to RF.

### 11. Stale debug comment — `data-canvas-build` attribute does not exist
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:743-745` reads "Visible in DevTools as `data-canvas-build="2026-05-14-cb-ref-fix"`." The JSX `<div>` directly below at lines 747-753 has only `data-testid` and `data-read-only` — no `data-canvas-build`. The diagnostic the comment instructs the reader to look for has been removed. Either restore the attribute or delete the comment.

---

## P1 — High-risk bugs and correctness gaps

### 12. Drag-to-empty-canvas silently does nothing
`handleConnect` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:646-655`) is the **only** code path that sets `pending_connection`. `handleConnectEnd` then fires `on_edge_created` only if `pending_connection` is set (line 697). React Flow only calls `onConnect` when the user releases over a valid target handle. So dragging from a node's source handle out to empty canvas (the classic "draw an edge and drop on whitespace to spawn a new node" gesture) does nothing — no toast, no popup, no node-creation prompt. Comment at line 640-643 acknowledges the prior bug but the new code drops the gesture entirely.

### 13. `data-mode` is set only on `<TopBar>`, not on the canvas root
`tokens.css:222-230` defines `--color-mode-current-accent` via `[data-mode="frame-building"]` and `[data-mode="argument-running"]` selectors. The only site setting the attribute is `/Users/zacharywolk/zwolk/argmap/src/ui/chrome/top-bar.tsx:21`. If the canvas isn't a descendant of the TopBar (it is, today, via the page wrapper), the mode accent silently falls through to the `:root` default of frame-building (tokens.css:233-236). Confirm the chain — but more robust to mirror `data-mode` onto the canvas root itself.

### 14. `zoomToNode` silent fail when neither anchor nor layout result has the node
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:431-438` — if `frame_version.nodes.find(...)` returns undefined or both `presentation.x/y` and `layout_result.positions[i]` are missing, `setCenter` is never called and the handle returns silently. Outline-tree "highlight on canvas" looks broken with no diagnostic.

### 15. Edge-delete prefix filter is a brittle invariant
`handleEdgesDelete` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:733-741`) refuses to delete any edge whose id starts with `overlay_` or `checkpoint_option_`. This is the *only* defense against attempting to delete synthetic ids that don't exist in the store. If the id-generator scheme ever happens to produce a real edge id starting with one of those strings, the delete silently no-ops and the user can't remove the edge.

### 16. `pending_connection` ref not cleared on visibility change or escape key
The cleanup effect (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:712-722`) listens for `pointercancel` and `blur` only. Holding shift mid-drag on iPad/Mac can fire `visibilitychange` (Spotlight, App Switcher) without firing blur; the next legitimate edge drag would then resolve against the stale source/target.

### 17. Touch / pinch / two-finger pan not explicitly handled
`<ReactFlow>` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:754-776`) sets no `panOnDrag`, `panOnScroll`, `zoomOnPinch`, `zoomOnScroll`, or touch-related options. RF v12 defaults work, but the absence of explicit touch configuration means iPad behavior is implicit and untested. Specifically, the custom DataTransfer-based palette drop (lines 661-688) uses HTML5 drag-and-drop, which on iOS Safari does not fire `dragstart`/`drop` reliably — palette drops likely don't work on iPad at all.

### 18. Background grid pitch hardcoded — no Hi-DPI compensation
`CANVAS_GRID_GAP = 22` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:32`) and `<Background gap={22} size={1}>` (line 780) use CSS pixels. On a 2x or 3x display this is fine, but `size={1}` becomes a sub-pixel dot at heavy zoom-out; combined with HSL `--color-border-subtle: hsl(30 8% 88%)` the grid will be near-invisible at >100% zoom-out on Retina screens.

### 19. Recommended-next pulse re-creates every node's `data` object on every interview tick
`recommended_next_id` is a dep of `desired_rf_nodes` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:480, 490`). Every time the interview advances and the recommended-next node changes, `buildRFNodes` reconstructs the entire array; each `RFNode<>.data` is a new object reference. React Flow then re-renders every node, even though only two nodes actually changed state. On a 100+ node frame this is a noticeable cost per interview step.

### 20. `status_map`, `primary_path_set`, `active_set_set` also dep the full rebuild
Same shape as finding 19: `/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:481-491`. Every status tick from the runtime (i.e., the recompute loop in argument-running) re-derives all nodes' data objects. Combined with the React Flow re-mount cost, large frames pay an order-of-magnitude cost for what should be O(changed_nodes).

### 21. `primary_path_set` and `active_set_set` re-build whenever parent doesn't memoize the array
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:410-418` — `React.useMemo` keyed on the array reference. The comment at lines 408-409 says "fine because the page passes referentially-stable snapshots from useSessionStore," but it relies on every caller knowing this. Any caller that inlines `[…ids]` or `new Set(...)` invalidates the memo each render and pays the rebuild cost — a footgun without a runtime check or invariant.

### 22. LogicalGate Handle anchor is on the unrotated wrapper, not the rotated diamond
`NodeFrame` for gates (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:282-328`) places the wrapper `<div>` at 60×60 without rotation; only the inner `cardStyle` is `rotate(45deg)`. The xyflow `<Handle position={Position.Top}>` and `Position.Bottom>` (lines 290-297, 317-325) attach to the wrapper, so edges connect at the **top edge of the 60×60 box**, which renders **inside** the visible diamond (since the diamond's "north" point extends ~30px above the wrapper top). Edge routing looks wrong on every gate.

### 23. Checkpoint hex clipPath obscures node hit-targets at the corners
`NodeFrame` for checkpoint (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:241-249`) applies a hex clipPath to the card. The wrapper `<div>` (line 221-232, `display: "inline-block"`) however remains rectangular, so click hit-detection extends beyond the hex visual into the four corners cut off by clipPath. The user can click "outside" the visible hex and still select the node.

### 24. Status badge overlap on tight layouts
Status badge is positioned `top: -8px, right: -8px` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:253-257, 312-316, 355-359`). For checkpoint hex and 45°-rotated gates, the badge extends into the negative-coordinate quadrant beyond the node's "true" bounds. With ELK's `elk.spacing.nodeNode: 48` (`/Users/zacharywolk/zwolk/argmap/src/layout/elk-options.ts:9`), tight-packed frames will overlap badges with adjacent nodes — no `z-index` on the badge so it can render under a neighbor.

### 25. `variant_map` silent fallback to `"sub_question"`
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:204` — `variant_map[node.type] ?? "sub_question"`. Any future `NodeType` shipped without updating the map silently renders as a SubQuestion (no exhaustiveness check). Schema's `NodeType` union is the single source of truth, but the variant_map doesn't statically derive from it.

### 26. `primary_text` falls back to `node.id` (UUID) for Premise/unknown
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:160-169` — if none of `question / statement / name / citation` matches, the node renders its raw UUID as a label. Since `nodeTypes` includes `premise_pill` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/index.ts:39`), this can plausibly trigger; the field on `Premise` is `statement`, which does match, so practically OK today. But the cascading fallback is fragile and the failure mode is "render a UUID on the canvas."

### 27. Selection `selection_key` join is fragile against ids that contain `"|"`
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:540-543` — `[...selection].sort().join("|")`. UUIDs don't contain `|`, but the runtime never enforces UUID-only ids; a future migration that uses pipe in any node id would alias two distinct selections to the same key and silently skip the selection update.

### 28. Read-only mode allows edge clicks to route through `onSelectionChange`
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:634-637` — `handleEdgeClick` gates on `cb.read_only`, blocking the *manual* edge-click selection path. But RF's own `onSelectionChange` (handler line 619-627) still fires whenever RF marks an edge selected via box-select or programmatic selection, and **does not check `read_only`**. So in read-only mode the user can still see edge inspector open from a click-drag selection.

### 29. `handleNodeDragStop` doesn't gate on `nodesDraggable={!read_only}`
RF will not call `onNodeDragStop` if `nodesDraggable` is false (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:770`), so the gate at line 613 (`if (cb.read_only) return`) is currently redundant — but it's defensive against future RF behavior. Not a bug, but the comment block doesn't explain the redundancy; a reader might think drag-stop fires in read-only mode and worry.

### 30. ELK options claim ORTHOGONAL routing but edges use Bezier rendering
`/Users/zacharywolk/zwolk/argmap/src/layout/elk-options.ts:7` requests `"elk.edgeRouting": "ORTHOGONAL"` (right-angle bends). Every edge component calls `getBezierPath` (e.g., `/Users/zacharywolk/zwolk/argmap/src/ui/canvas/edges/structural-edge.tsx:10`). ELK computes orthogonal routes that the renderer immediately discards. Pick one: either render `getSmoothStepPath`/orthogonal SVG to match ELK, or set ELK to `SPLINES`/`POLYLINE` to match the bezier output.

### 31. Layout error has no user surface in argument-running view
`useLayoutResult` returns `{ kind: "error" }` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/layout-consumer.ts:78`). `frame-building-page.tsx:410-429` renders a warning banner. But `/Users/zacharywolk/zwolk/argmap/src/ui/argument-running/output-viewer/path-overlay-tab.tsx:68` and `/Users/zacharywolk/zwolk/argmap/src/ui/version-history/frame-preview-view.tsx:87` (and session-preview-view) also use the canvas — none of them check for the error state, so layout failures in those surfaces are silently swallowed with stale-or-missing positions.

---

## P2 — Polish, hardening, and visual fit

### 32. Foreclosure toggle uses ambiguous icon for "dimmed" state
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/canvas-toolbar.tsx:23-25` — "visible" and "dimmed" both use the same `eye` glyph, distinguished only by `opacity: 0.55`. A user clicking the toggle sees barely-perceptible state change. The third state (hidden) uses `eye-crossed`. Either use three distinct glyphs or label-text the current state.

### 33. Toolbar zoom-to-100% button uses `<span>` text where every sibling is a glyph
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/canvas-toolbar.tsx:84-88` — visually breaks the toolbar's icon-only rhythm. Either swap to a "1×" SVG glyph or label every button with text for consistency.

### 34. Toolbar has no aria-roledescription / no keyboard navigation between buttons
The toolbar is a `<div role>`-less container with `<button>` children (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/canvas-toolbar.tsx:56-130`). No `role="toolbar"`, no `aria-orientation`, no roving tabindex. Screen-reader users get five disconnected buttons; keyboard users tab through each one individually.

### 35. Minimap colors read CSS variables once at mount and never update on theme change
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/minimap.tsx:25-46` — `readCssVar` runs inside `useMemo([])` so values are frozen at first render. Comment at lines 22-24 acknowledges this. Today's app ships no theme switcher, but if dark mode lands the minimap's node-fill palette will silently stay light.

### 36. Minimap contrast: `not_applicable` and `foreclosed` both use a tertiary-gray fallback
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/minimap.tsx:30-31` — `foreclosed → --color-text-tertiary` (`hsl(30 6% 46%)`) and `not_applicable → --color-border-default` (`hsl(30 8% 80%)`). These are extremely close; users can't distinguish foreclosed from N/A on the minimap. Similarly, `open` and `not_applicable` are both warm gray.

### 37. Edge-creation popup positions in viewport coords from `drop_position`
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/edge-creation-popup.tsx:48-50` uses `position: "fixed", left/top: position.x/y`. The drop_position passed from `handleConnectEnd` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:692-696`) is `event.clientX/Y`. If the drop occurs near the right/bottom of the viewport, the popup overflows offscreen — no edge-clamping logic. The user sees a partial or invisible popup.

### 38. Edge-creation popup `onMouseDown` listener catches the same gesture that opened it
The popup mounts on the heels of a `mouseup` (from `handleConnectEnd`), and immediately starts listening for `mousedown` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/edge-creation-popup.tsx:34`). If the user's next click is anywhere outside the popup (a fast double-click), the popup dismisses. Most popup-on-event UIs add a one-frame delay to avoid the open-and-immediately-close edge.

### 39. Hover-only handle visibility breaks touch UX
`NodeFrame` hides the source `<Handle>` until hover (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:382-394` — `opacity: visible ? 1 : 0`). Touch devices have no hover; the handle never appears, so the user has no way to start an edge drag on iPad. (The `:hover` CSS selector in `global.css:976` is also touch-broken.)

### 40. `setHovered` per-node React state forces a re-render of the whole node subtree on every pointer enter/leave
`NodeFrame` uses local `useState` for hover (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:89`). For a 100-node frame, mousing across the canvas can fire 100+ re-renders, each computing the inline `cardStyle`. CSS `:hover` would be enough for visual changes; the JS state only matters for the handle-visibility, which could move to CSS `.react-flow__node:hover .react-flow__handle`.

### 41. Conclusion's double-border `boxShadow` ring overlaps with selection ring
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-frame.tsx:60-62` builds a 3px gap + thick ring via box-shadow. On selection, the composition (lines 175-183) places the selection halo on top — but the math doesn't account for the gap, so the selection ring visually merges with the double-border outer ring. Hard to tell selected vs. not-selected on a Conclusion.

### 42. Premise/Annotation edge stroke at 0.5px is below the 1px CSS rendering threshold on many browsers
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/edges/annotation-edge.tsx:24` — `strokeWidth: 0.5`. Webkit/Blink may round to 0 or render via half-pixel anti-aliasing only, producing ghost edges that disappear at certain zoom levels.

### 43. `argument-overlay-edge.tsx` writes `--trace-stroke-width` to inline style via `as any` cast
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/edges/argument-overlay-edge.tsx:35-44` — two `as any` casts. Works, but the comment at line 35-40 admits the approach. CSS variables on SVG elements work in Firefox/Chrome/Safari, but support is recent. The animation also depends on `forwards` fill-mode (global.css:1005) staying applied — if RF remounts the edge mid-animation (it does, when `path_fingerprint` changes), the half-traced animation snaps.

### 44. ELK options use `elk.padding` with bracket syntax; the rest use dot-separated
`/Users/zacharywolk/zwolk/argmap/src/layout/elk-options.ts:12` — `"elk.padding": "[top=24,left=24,bottom=24,right=24]"`. Most ELK consumers use this, but the bracket syntax silently fails on older `elkjs` versions; the lib version in package.json should be confirmed (`elkjs/lib/elk.bundled.js` at `/Users/zacharywolk/zwolk/argmap/src/layout/run.ts:1`).

### 45. ELK worker error handler nukes the entire worker on a single error
`/Users/zacharywolk/zwolk/argmap/src/layout/elk-bridge.ts:28-33` — `w.onerror` rejects every in-flight promise and sets `workerInstance = null`. If ELK throws on one bad frame, every queued layout request also rejects, and the next call spins up a fresh worker — paying the worker-init cost (10-50ms typical). A bad frame should fail just its own request.

### 46. `terminate()` exists but no caller invokes it
`/Users/zacharywolk/zwolk/argmap/src/layout/elk-bridge.ts:66-74` is the only worker-cleanup path. `grep -rn "terminate(" /src/ui/`/etc. — no caller. In a single-page SPA this might not matter, but if the user navigates away mid-layout the worker holds the reference until tab close.

### 47. `reconcileEdges` preserves `selected` but the selection effect never sets edges
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:369-382` carries forward `e.selected`, but the only writer of `e.selected` is RF's internal `applyEdgeChanges` triggered from edge clicks. There's no symmetry with the node selection effect. Related to finding 10 — fixing one fixes the other.

### 48. `desired_rf_edges` re-runs whenever `argument_overlay` reference changes
`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/frame-canvas.tsx:494-512` — the deps array includes `argument_overlay` (the whole object). Callers passing `argument_overlay={{ edges: [...] }}` inline rebuild this every render. Same caller-side memoization footgun as finding 21.

### 49. `pulse-recommended` keyframe is `opacity: 1 ↔ 0.85` — barely visible
`/Users/zacharywolk/zwolk/argmap/src/ui/styles/tokens.css:238-246` — a 15% opacity drop over 1.8s, eased soft. The visual signal that "this is the node to look at next" is so subtle it's easy to miss. Most recommend-pulse patterns use a ring/glow expansion (the existing `argmap-recompute-pulse` keyframe does scale, but that's not what node-frame uses).

### 50. Drag from connector handle on a Premise pill is disabled (correctly) but ALSO disables hover state
`PremisePill` (`/Users/zacharywolk/zwolk/argmap/src/ui/canvas/nodes/node-renderers.tsx:105-119`) passes `enable_connector_handle={false}`. In NodeFrame, this also suppresses the `<Handle type="target">` (line 233-241 etc.). Result: a Premise pill cannot be the target of any edge dragged from another node. Whether that's correct schema-wise depends on `VALID_EDGE_PAIRS`, but the canvas silently makes the gesture impossible rather than showing a "no" indicator.

---

## Summary tally

- **P0 (blocker / dead feature):** 11 findings (#1–#11)
- **P1 (high-risk bug / correctness gap):** 20 findings (#12–#31)
- **P2 (polish / hardening / perf):** 19 findings (#32–#50)
- **Total:** 50 findings

Hot spots worth prioritizing:
- `legal_mode`/`authority_binding_kind` data plumbing is broken end-to-end (#1, #2)
- React Flow custom rendering vs. ELK orthogonal routing mismatch (#30)
- Touch / iPad UX is uninstrumented across palette drop, hover handles, and connector ergonomics (#17, #39)
- Performance scales poorly with frame size due to coarse useMemo deps (#19, #20, #21, #48)
- The `<ConnectorHandle>` file is dead code that should be deleted or wired up (#3)
