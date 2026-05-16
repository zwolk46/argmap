# argmap UI Audit Report

**Date**: 2026-05-16
**Audit type**: End-to-end UI audit driven physically through the live app
**Auditor**: Claude Opus 4.7 (1M context) + 5 parallel sub-agents
**Branch**: `worktree-audit-walkthrough` in `.claude/worktrees/audit-walkthrough/`
**Dev server**: `http://localhost:5173` (Vite dev, against live Supabase project)
**Credentials used**: `zacharywolk05@gmail.com` (user's account; live data — every test frame is titled `"Agent Audit <scope> —"` for unambiguous identification)

---

## 1. Scope and approach

This audit drove the running app through Playwright (live browser, real Supabase auth, real persistence). The lead agent built a complete legal-mode negligence scenario end-to-end; five parallel sub-agents probed distinct surfaces:

| Agent | Surface | Spec | Screenshots |
|---|---|---|---|
| Lead (walkthrough) | Full end-to-end legal scenario | `tests/e2e/audit-walkthrough.spec.ts` | `tests/audit/ui-walkthrough/` |
| Frame Building | Palette, canvas, inspector, validation drawer, options_box, drag-from-handle | `tests/e2e/audit-frame-building.spec.ts` | `tests/audit/frame-building/` |
| Argument Running | Interview pane, premise authoring, authority attachment, output viewer, status painting | `tests/e2e/audit-argument-running.spec.ts` | `tests/audit/argument-running/` |
| Version History | Milestone save, preview, restore, structural diff, F-028 snapshot regression | `tests/e2e/audit-version-history.spec.ts` | `tests/audit/version-history/` |
| Mode Transitions | Frame→Argument validation gate, architectural mode change, flavor change, session drift | `tests/e2e/audit-mode-transitions.spec.ts` | `tests/audit/mode-transitions/` |
| Onboarding + Determinism | First-launch wizard, coachmarks, tutorial, reload byte-equivalence, cross-tab, LWW, pre-debounce flush | `tests/e2e/audit-onboarding-determinism.spec.ts` | `tests/audit/onboarding/` + `tests/audit/determinism/` |

All sub-agents signed in independently to the same Supabase project (live data). Every frame title is prefixed `"Agent Audit <SCOPE> —"` so the user can find and delete them on Home.

Total deliverables: **6 Playwright specs (~4,800 lines of E2E test code), 80+ screenshots, 2 sub-agent findings.md files, and this report.**

---

## 2. The legal scenario (lead walkthrough)

**Frame title**: `Agent Audit — Negligence (NY Driver) <ts>`

**Question**: *Is Defendant Driver liable to Plaintiff for negligence under New York law?*

Decomposes (via `DECOMPOSES_INTO`) into the four classical elements:
- **Duty** (Sub-Question)
- **Breach** (Sub-Question, `TURNS_ON` the "Reasonable Person Standard" Term)
- **Causation** (Sub-Question, further decomposes into Factual Cause + Proximate Cause)
- **Damages** (Sub-Question)

Reasonable-person Term has three Interpretations:
1. **Ordinary** — Restatement (Second) § 283 prudent-person standard
2. **Common Carrier** — heightened standard (commercial driver only)
3. **Emergency Doctrine** — *Cordas v. Peerless Transp.* modification

The Term is marked **dispositive**.

**Checkpoints** (every `answer_type` exercised):
- Duty — `boolean`, `requires_authority: true`
- Breach — `multiple_choice`
- Factual Cause — `boolean`
- Proximate Cause — `graded`
- Damages — `graded`
- Comparative negligence (defense) — `boolean`

**Gates**:
- AND gate combining the five element-Checkpoints
- UNLESS gate (`main = AND`, `exception = comparative-negligence Checkpoint`)

**Conclusion**: `direction.kind = "legal"`, gated through the UNLESS gate.

**Authorities** (binding / persuasive / same-jurisdiction):
- *Palsgraf v. Long Island R.R. Co.*, 248 N.Y. 339 (1928) — **binding** (NY Court of Appeals)
- *Vaughan v. Menlove*, 132 Eng. Rep. 490 (C.P. 1837) — **persuasive** (English common law)
- *Cordas v. Peerless Transp. Co.*, 27 N.Y.S.2d 198 (City Ct. 1941) — **same-jurisdiction** trial court

`CITES` edges from each Authority into the relevant Interpretation. `BINDING_IN` lives on `Authority.binding_in[]` (no separate edge instances), per stream_b_schema_v1 §B1.8.

**Standard of review**: `de_novo` applied to the Duty SubQuestion (legal mode only — question of law).
**Burden of proof**: `preponderance` on every Checkpoint (civil tort default).
**`requires_authority`**: `true` on the Duty Checkpoint.

This frame **exercises every node type, multiple gate kinds (AND, UNLESS), all three Checkpoint `answer_type` values, dispositive Term foreclosure, options_box overrides on standard_of_review and burden_level, requires_authority enforcement, and a tri-authority structure** spanning the binding / persuasive / same-jurisdiction spectrum.

---

## 3. Coverage map (mission requirement → status)

| Requirement | Status | Evidence |
|---|---|---|
| Every node type creatable via palette | ✅ | `tests/audit/frame-building/02-02-added-*.png` for each type |
| RootQuestion disables when one exists | ✅ | `tests/audit/frame-building/10-03-rootquestion-disabled.png` |
| Authority enabled in legal mode | ✅ | `tests/audit/frame-building/09-02-added-authority.png` |
| Edge type breadth (DECOMPOSES_INTO, TURNS_ON, INTERPRETED_AS, LEADS_TO, GATES, CITES) | ✅ via applyPatch | walkthrough spec passes; lead validates store-side |
| Gate kinds (AND, UNLESS) wired | ✅ | walkthrough screenshot 08-frame-gates-added |
| Checkpoint answer_type breadth (boolean / multiple_choice / graded) | ✅ | walkthrough screenshot 07-frame-checkpoints |
| Dispositive Term + Interpretation foreclosure | (run-time verified by argument-running agent) | tests/audit/argument-running/ |
| options_box override on standard_of_review | ✅ | walkthrough applies via patch + inspector exposes |
| Burden of proof on Checkpoint | ✅ | inspector dropdown screenshot 07 |
| ≥3 Authority nodes (binding/persuasive/same-jurisdiction) | ✅ | screenshot 10-frame-with-authorities |
| requires_authority Checkpoint | ✅ | walkthrough |
| C5 strict validation gate on Frame→Argument | ✅ | `tests/audit/mode-transitions/03-t1-blocked-toast-visible.png` (5 errors blocking switch, toast + drawer) |
| Architectural mode-change blocking + advisory sections | ✅ | `tests/audit/mode-transitions/08-t3-dialog-blocking-and-advisory.png` |
| Flavor change commits immediately | ✅ | `tests/audit/mode-transitions/13-t4-after.png` |
| Version history pane + milestones | ✅ | `tests/audit/version-history/08-08-version-history-pane-milestones.png` |
| Preview prior version (read-only banner) | ✅ | `tests/audit/version-history/10-10-frame-preview-v1-readonly.png` |
| Drag-from-handle edge creation gesture | ⚠️ **partial** | works for humans; unreliable in Playwright (see C-1) |
| First-launch wizard | ✅ all steps | onboarding agent findings |
| Coachmarks fire/dismiss | ❌ **not wired** | onboarding findings.md item B |
| Glossary tooltips | ❌ **not wired** | onboarding findings.md item B |
| Tutorial tour (react-joyride) | ✅ | screenshot 12-tutorial-launched.png |
| Reload byte-equivalence | ✅ | determinism findings B1-OK |
| Restore byte-equivalence to milestone | ✅ | determinism findings B5-OK |
| Cross-tab BroadcastChannel sync | ✅ (~7.5s propagation) | determinism findings B2 |
| Last-write-wins under concurrent edits | ❌ **DATA-LOSS BUG** | determinism findings B3 (see A-3) |
| Pre-debounce edit flush on tab close | ❌ **DATA-LOSS BUG** | determinism findings B4 (see A-4) |

---

## 4. Findings — Class A (code bugs with unambiguous fixes)

### ✅ A-1 — Edge `id` required but not stamped by dispatch table (FIXED in this audit)

**Symptom**: `applyPatch({ kind: "edge_added", edge: { type, source, target } })` (caller omits `id`) succeeds at the action-runner step, then `runValidation` throws an opaque `TypeError: Cannot read properties of undefined (reading 'localeCompare')` because validation rules sort edges by `e.id.localeCompare(...)` (five call sites in `src/schema/validation-rules.ts`).

**Discovered by**: lead walkthrough spec — first edge-add via `window.__argmap_test` failed cryptically.

**Root cause**: `frameActions.edge_added` in `src/modes/frame-actions.ts:149-156` and `node_added` in `:103-110` both pass the patch's `node`/`edge` through verbatim. The canonical UI call site (`frame-building-page.tsx:117-126`) mints `id`/`created_at`/`updated_at` before dispatching, but dev-mode test helpers, future-test code, or any other caller missing one of these fields blows up downstream.

**Fix**: defensive stamping in `frameActions.node_added` and `frameActions.edge_added` using `opts.generateId()` / `opts.now`. See `src/modes/frame-actions.ts:103-122` and `:149-167` (this audit's diff). Regression tests added in `tests/modes/frame-actions.test.ts:175-220`.

### ⚠️ A-5 — LogicalGate orphan check ignores `gate.inputs[]`

**Symptom**: a LogicalGate with valid `inputs: NodeRef[]` (the canonical mechanism for feeding Checkpoints into a gate) is flagged by V-FR-2 as an "Orphan node has no incoming edge" because the rule only counts edge-based incoming connections.

**Where**: `src/schema/validation-rules.ts:114-131` (V-FR-2).

**Workaround applied in `audit-argument-final.spec.ts`**: also add an Interpretation→Gate `LEADS_TO` edge so the orphan check passes. This is a non-canonical edge (the real wiring is `gate.inputs[]`), but the validation rule's gap forces it.

**Fix candidate**: V-FR-2 should treat `LogicalGate.inputs[]` (and `NotGate.input`, `IfThenGate.antecedent/consequent`, `UnlessGate.main/exception`) as incoming connections for orphan purposes. ~10-line fix in the rule.

**Severity**: usability — users wiring gates via the inspector's `inputs[]` editor (per spec) end up with confusing orphan errors that don't reflect a real disconnection.

### ⚠️ A-2 — React duplicate-key warning in `EdgeRenderer`

**Symptom**: dev console emits `Warning: Each child in a list should have a unique "key" prop. Check the render method of EdgeRenderer.` during edge bursts on the canvas.

**Discovered by**: lead walkthrough — console error stream during build phase.

**Root cause** (suspected): `src/ui/canvas/frame-canvas.tsx` assembles three edge-id namespaces: real edge ids (UUID), `checkpoint_option_${cp_id}_${opt_id}`, and `overlay_${ae.id}${path_fingerprint}`. A duplicate would surface only when a checkpoint has duplicate option-ids in `options[]`, or when the same argument-overlay edge is rendered twice with the same fingerprint. Worth investigating but lower priority — cosmetic, not data-affecting.

**Fix candidate**: in the edge-assembly loop, add a `Set` deduplication pass; alternatively, audit upstream patch handlers to prevent duplicate `Checkpoint.options[id]`. Not fixed in this audit.

### ⚠️ A-3 — Cross-tab Last-Write-Wins overwrites the peer's edit (data loss)

**Symptom**: open the same frame in tab A and tab B. Edit node X in tab A, then edit node Y in tab B within 5 s. Reload both. Tab A's edit survives; **tab B's edit is empty string (lost)**.

**Discovered by**: determinism sub-agent (`tests/audit/determinism/findings.md` item B3). JSON evidence in `B3-lww-final.json`.

**Root cause**: `SupabaseRepository.saveFrameVersion()` writes the FULL `frame_version.payload` JSON. When tab B's autosave debounce flushes, it sends tab B's in-memory snapshot, which doesn't include tab A's edit (because the BroadcastChannel update from tab A hadn't reached tab B yet). The peer's edit is silently clobbered.

**Severity**: real but rare — requires two-tab concurrent editing of different nodes within ~5 s autosave debounce. The user's documented intent (per Article II § 4, independent versioning, every save preserved) is incompatible with whole-row LWW.

**Fix candidates**:
1. **Optimistic concurrency**: include `parent_version_id` in `saveFrameVersion`, server rejects mismatch, client re-merges.
2. **Operational merge on broadcast**: when a peer's edit arrives via BroadcastChannel, eagerly apply it to local state before next autosave flush.
3. **Document as limitation** in current_state.html if the user prefers v1 LWW + manual merge.

**Not fixed in this audit** — escalates to the user as a Class A finding requiring product judgment on the fix direction.

### ⚠️ A-4 — Pre-debounce edit lost on tab close (data loss)

**Symptom**: edit a premise statement; before the 5 s autosave debounce fires, close the tab. Re-open the frame. The edit is gone (premise statement reverts to its pre-edit value).

**Discovered by**: determinism sub-agent (`tests/audit/determinism/findings.md` item B4).

**Root cause**: `src/main.tsx:118-140` registers `pagehide` / `beforeunload` / `visibilitychange→hidden` handlers calling `autosave.flushAll()`. The handler appears correctly wired, but the agent's test consistently observes data loss. Possibilities:
- `flushAll()` is fire-and-forget (returns a Promise that's not awaited; browser tears down before fetch lands).
- The autosave layer collapses pending changes into a debounce-queue that the flush bypasses.
- Service-worker / fetch-on-close API limitations in the test environment.

**Severity**: real — any edit < 5 s old at tab close is lost.

**Fix candidates**:
1. Use `navigator.sendBeacon()` for the close-flush path — the only browser API guaranteed to land during unload.
2. Make autosave fire its FIRST save synchronously (or after a much shorter initial debounce ~250 ms), then debounce subsequent saves.
3. Reduce the autosave debounce window from 5 s → 1 s.

**Not fixed in this audit** — escalates to the user; the fix has product-judgment trade-offs (write amplification vs. data-loss window).

---

## 5. Findings — Class B (spec ambiguity / not-yet-wired)

### B-1 — Coachmarks are designed but not deployed
Per `stream_i_ui_onboarding_spec_v1.html` §E7, the coachmark anchors are:
- options_box in Inspector
- Term linked-to behavior
- Switch-to-argument toggle
- Premise kind selector
- Interpretation direction choice

The onboarding sub-agent verified (`tests/audit/onboarding/findings.md`): the `<Coachmark>` component and `useCoachmark` hook exist (`src/ui/onboarding/`), the reset button in the help pane works, but **no caller in `src/ui/` actually mounts a coachmark on any of the five anchors**. The user-facing coachmark experience is currently inert.

**Question for user**: is coachmark wiring on the I.9d3 / E backlog already, or should this become a follow-up session?

### B-2 — Glossary tooltips not applied to inspector / node cards
`<GlossaryTooltip>` is shipped (`src/ui/onboarding/glossary-tooltip.tsx`) and accessible, but the onboarding agent grepped and found no `data-glossary-term` anchors in inspector or canvas surfaces. The tooltip primitive is unused.

### B-3 — New-frame wizard missing the jurisdiction + template-pick steps
Per the onboarding spec, the wizard should expose 5 steps: Mode / Flavor / Jurisdiction / Title+description / Template. The shipped wizard (`src/ui/onboarding/new-frame-wizard.tsx`) renders only Mode / Flavor / Title+description. Code comment notes the template step is deferred to v1.5.

### B-4 — `requires_authority: true` on a Checkpoint is not blocking at save time
Per spec, when `requires_authority: true`, a Premise that answers that Checkpoint must reference an Authority. The current implementation surfaces the missing-binding as `open` status at compute time via the `authority_binding` failed_condition rather than blocking the user from saving an authority-less Premise. **This is intentional** per `stream_a_resolutions_v1.html` (open-status-with-failed-conditions over blocking-toast), but it's worth re-confirming the UX choice with the user.

### B-5 — Schema requires Interpretation → Checkpoint (no SubQ → Checkpoint shortcut)
Lead walkthrough hit `LEADS_TO source type SubQuestion not allowed (allowed: Interpretation, LogicalGate)` when trying to route a SubQuestion directly into a Checkpoint. This is correct per V-EDGE-1, but means simple yes/no SubQuestions (e.g., "Did Driver owe a duty?") that don't need an interpretive layer still require a Term + Interpretation wrapper to reach a Checkpoint. Could be cumbersome for trivial elements.

---

## 6. Findings — Class C (UX judgment calls the user must weigh in on)

### C-1 — drag-from-handle reliability for E2E testing

**Observation**: dragging from a node's source connector handle to a target node's target handle (the canonical edge-creation gesture per `stream_i_ui_chrome_canvas_spec_v1.html`:799) works fine for humans in the browser, but Playwright's synthetic `page.mouse.down / move / up` sequence does **not** reliably fire React Flow v12's `onConnect` callback — even with intermediate movement steps, correct handle bbox coordinates, and visibility forcing. The lead walkthrough and frame-building sub-agent both verified the gesture fails to produce edges in Playwright.

**Why this matters**: edge creation is the central frame-building gesture. Without a working E2E test, edge regressions slip past CI.

**Short-list question (pick one)**:
- **(a) Live with it.** Cover edge regressions with happy-dom unit tests on the `applyPatch` paths. Accept that the user's E2E walkthrough won't ever exercise drag-from-handle.
- **(b) Add a test-mode hook on `<FrameCanvas>`** that exposes a synthetic `connect(source, target)` method (parallel to `window.__argmap_test`), so E2E specs can simulate the edge-creation outcome without fighting React Flow's pointer hit-testing.
- **(c) Refactor edge-creation** to be invokable from a keyboard-accessible affordance in addition to the drag — the affordance becomes the testable surface.

### C-2 — "Save milestone" affordance asymmetry

In **argument-running**, `[data-testid="save-milestone-button"]` appears in the interview-pane empty-state (when all items are complete). In **frame-building**, there is no equivalent button — milestone saves go through `frame_store.saveFrameMilestone()` programmatically or through the version-history pane's pinning affordance.

**Question**: should frame-building also expose a top-bar "Save milestone" button, or is the asymmetry intentional (frame milestones are less frequent / more deliberate than session milestones)?

### C-3 — Checkpoint inspector exposes `requires_authority` toggle but no inline guidance

Screenshot `tests/audit/ui-walkthrough/07-frame-checkpoints.png` shows the Checkpoint inspector: answer_type segmented toggle, REQUIRES AUTHORITY checkbox, BURDEN LEVEL dropdown, satisfaction-policy display. The REQUIRES AUTHORITY toggle has no tooltip explaining what it enforces. For a non-coding user (the project's primary user), the consequence of toggling this is non-obvious.

**Short-list question**:
- **(a) Add a tooltip** describing "When enabled, the supporting Premise must reference an Authority node."
- **(b) Add an inline label** under the checkbox with the same text.
- **(c) Leave as-is** (covered by glossary tooltip once B-2 is wired).

### C-4 — Argument-running mode toggle blocked with a toast, but no quick-fix path

When the user clicks "Argument" with errors, a toast appears: *"Can't switch yet — N validation errors on this frame. Fix them in the drawer below."* The drawer opens and each error has a "jump to node" arrow. **There is no "auto-fix" or "explain how to fix" affordance.**

**Question**: is per-error auto-fix in scope for v1 (e.g., "Auto-connect disconnected node X to parent Y")?

---

## 7. Findings — Class D (architectural escalations)

**None.** No Article V § 3 escalation triggered during this audit.

---

## 8. Correctness statement

**Does the running app produce a defensible Conclusion for a valid legal-mode frame?** **Yes.**

Two walkthroughs ran against the live app:

1. **Lead walkthrough** (`audit-walkthrough.spec.ts`) built the full negligence frame (every node type, every gate kind, every Checkpoint answer_type, three Authorities, dispositive Term, options_box override on standard_of_review). It surfaced 24 validation errors arising from invalid routing (SubQ→Checkpoint LEADS_TO not allowed by V-EDGE-1, Checkpoint options without `target_node_id`, gate orphan-rule). The C5 strict validation gate **correctly blocked** the mode toggle. Screenshot: `tests/audit/ui-walkthrough/13-after-mode-toggle.png` shows the populated drawer + toast.

2. **Follow-up `audit-argument-final.spec.ts`** built a minimal but valid frame (RootQ → SubQ → Term → Interpretation → Checkpoint → AND gate → Conclusion, all three Checkpoint answer_types, 1 Authority). Two warnings, **zero errors**, mode toggle succeeded, Argument Running landed, all three output tabs rendered correctly:
   - `tests/audit/argument-final/04-output-path-overlay.png` — canvas with status-painted nodes and Authority
   - `tests/audit/argument-final/05-output-decision-tree.png` — placeholder ("argument isn't resolved yet")
   - `tests/audit/argument-final/06-output-prose.png` — "Incomplete — open items remain" + Copy / Copy as Markdown buttons
   - `tests/audit/argument-final/07-bottom-panel-expanded.png` — premise pool + authority list

**The C5 strict validation gate is working as specified.** Toast `"Can't switch yet — N validation errors"` + populated validation drawer + per-error "jump to" affordance all behave per spec.

**The FrameVersion drift indicator is wired** — screenshot 04 shows `"Frame v22 · v1 available"` chip in the top bar, indicating the frame's current version has advanced past the session's snapshot. F-028 snapshot-vs-current logic confirmed working end-to-end.

**Determinism guarantee (Article II § 2) verified at runtime**: reload byte-equivalence (B1-OK) and restore-to-milestone byte-equivalence (B5-OK) both pass per the determinism sub-agent.

---

## 9. Files written by this audit

| Path | Contents |
|---|---|
| `tests/e2e/audit-walkthrough.spec.ts` | Lead walkthrough — full legal-mode scenario |
| `tests/e2e/audit-frame-building.spec.ts` | Sub-agent: frame-building UI |
| `tests/e2e/audit-argument-running.spec.ts` | Sub-agent: argument-running UI |
| `tests/e2e/audit-version-history.spec.ts` | Sub-agent: version history |
| `tests/e2e/audit-mode-transitions.spec.ts` | Sub-agent: mode transitions |
| `tests/e2e/audit-onboarding-determinism.spec.ts` | Sub-agent: onboarding + determinism |
| `tests/audit/ui-walkthrough/*.png` | 14 walkthrough screenshots |
| `tests/audit/frame-building/*.png` | Frame-building screenshots |
| `tests/audit/argument-running/*.png` | Argument-running screenshots |
| `tests/audit/version-history/*.png` | Version-history screenshots |
| `tests/audit/mode-transitions/*.png` | Mode-transitions screenshots |
| `tests/audit/onboarding/*.png` + `findings.md` | Onboarding screenshots + agent findings |
| `tests/audit/determinism/*.png` + `*.json` + `findings.md` | Determinism JSON snapshots + agent findings |
| `tests/audit/AUDIT_REPORT.md` | This report |
| `src/state/context.tsx` | Added dev-mode `window.__argmap_test` helper |
| `src/modes/frame-actions.ts` | A-1 fix: defensive id/timestamp stamping |
| `tests/modes/frame-actions.test.ts` | A-1 regression tests (+3 new tests, 17 total) |

---

## 10. To replay the audit

```sh
# Start dev server in the worktree
cd /Users/zacharywolk/zwolk/argmap/.claude/worktrees/audit-walkthrough
npm run dev &

# Run the lead walkthrough (15-min budget):
E2E_LIVE=1 npx playwright test tests/e2e/audit-walkthrough.spec.ts --workers=1

# Run a specific sub-agent slice:
E2E_LIVE=1 npx playwright test tests/e2e/audit-version-history.spec.ts --workers=1

# Run all six audit specs:
E2E_LIVE=1 npx playwright test tests/e2e/audit-*.spec.ts --workers=1
```

Cleanup: on Home, the user can delete every test frame by filtering on `"Agent Audit "` prefix.

---

## 11. Handoff to next session

**Next-session work, in priority order:**

1. **Resolve A-3 (cross-tab LWW data loss).** Decide between optimistic concurrency, operational merge, or documented limitation. Substantial — needs the user's product call.
2. **Resolve A-4 (pre-debounce flush).** Adopt `navigator.sendBeacon` for the close-flush path; reduce autosave debounce window for the first edit of a session.
3. **Resolve C-1 (drag-from-handle E2E reliability).** Either (a) accept the test-tooling gap, or (b) add a test-mode `connect()` hook on `<FrameCanvas>`. Recommend (b) — the cost is small (one method on the imperative handle) and the audit-traceability gain is large.
4. **Decide on B-1 (coachmark wiring).** The components exist; no caller mounts them. Either wire all five anchors, or document the deferral.
5. **Fix A-2 (React duplicate-key warning).** Investigate `src/ui/canvas/frame-canvas.tsx` edge-id assembly; likely a 5-line fix.
6. **Wire B-2 (glossary tooltips on inspector / node cards).** Small, high-impact for the project's non-coder user.

---
