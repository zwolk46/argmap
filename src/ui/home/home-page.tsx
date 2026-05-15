import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { useAppStateStore, useRepository, PinnedCapReached } from "@/state";
import { useAuth } from "../auth";
import { useNavigate } from "../routing";
import { Dialog, Button, EmptyState, useToast } from "../primitives";
import { UIcon } from "../primitives/uicon";
import { NewFrameWizard, type NewFrameWizardSubmitArgs } from "../onboarding";
import { FrameSummaryCard, type FrameSummary } from "./frame-summary-card";
import { createTutorial } from "@/tutorial";
import { setTutorialPhase } from "../tutorial";

export interface HomePageProps {
  // Reserved for future extension; currently unused.
  initial_search?: string;
}

const EMPTY_COPY = {
  title: "No frames yet",
  body: "A frame is the logical structure of a legal question — reusable across cases. Create one from scratch, or walk through the worked Palsgraf example to see how it all fits.",
} as const;

export function HomePage(_props: HomePageProps = {}): ReactElement {
  const frames = useAppStateStore((s) => s.frames);
  const recents_ids = useAppStateStore((s) => s.app_state.recents);
  const pinned_ids = useAppStateStore((s) => s.app_state.pinned);
  const { repository, app_state_store, now, generateId } = useRepository();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [wizard_open, setWizardOpen] = React.useState(false);
  const [tutorial_loading, setTutorialLoading] = React.useState(false);
  // P3: per-frame pending state so the Run argument button can disable while
  // Supabase round-trips. A bare bool would race when the user clicks two
  // cards in quick succession; keying by frame_id keeps the indicators
  // independent.
  const [run_argument_pending, setRunArgumentPending] = React.useState<FrameId | null>(null);

  React.useEffect(() => {
    app_state_store.getState().loadFrames();
  }, [app_state_store]);

  const by_id = new Map<FrameId, FrameSummary>();
  for (const f of frames) by_id.set(f.id as FrameId, f as FrameSummary);

  const pinned: FrameSummary[] = [];
  for (const id of pinned_ids) {
    const f = by_id.get(id as FrameId);
    if (f && !(f as { archived?: boolean }).archived) pinned.push(f);
  }
  const pinned_set = new Set(pinned.map((f) => f.id));
  const recents: FrameSummary[] = [];
  for (const id of recents_ids) {
    const f = by_id.get(id as FrameId);
    if (f && !(f as { archived?: boolean }).archived && !pinned_set.has(f.id)) {
      recents.push(f);
    }
  }
  const is_empty = pinned.length === 0 && recents.length === 0;

  function onOpen(frame_id: FrameId): void {
    app_state_store.getState().setRecent(frame_id);
    navigate({ kind: "frame_building", frame_id });
  }

  async function onRunArgument(frame_id: FrameId): Promise<void> {
    // Mirrors `switchToArgumentRunning` in frame-building-page.tsx:
    // open the most-recent session on this frame, or create a blank one
    // and open that. Surfaces an error toast on failure instead of
    // navigating into a broken argument-running view.
    if (run_argument_pending) return; // guard against double-clicks before disabled prop arrives
    setRunArgumentPending(frame_id);
    try {
      const existing = await repository.listSessionsForFrame(frame_id);
      let session_id = existing[0]?.id;
      if (!session_id) {
        const frame = await repository.loadFrame(frame_id);
        const frame_version = await repository.loadFrameVersion(frame.current_version_id);
        const new_session_id = generateId();
        const new_session_version_id = generateId();
        const ts = now();
        await repository.saveSession({
          id: new_session_id,
          frame_id,
          frame_version_id: frame_version.id,
          frame_version_snapshot: frame_version,
          title: `Argument session — ${frame.title}`,
          premises: [],
          argument_edges: [],
          checkpoint_responses: [],
          interpretation_selections: [],
          status_map: {},
          created_at: ts,
          updated_at: ts,
          current_version_id: new_session_version_id,
        } as never);
        await repository.saveSessionVersion({
          id: new_session_version_id,
          session_id: new_session_id,
          version_number: 1,
          created_at: ts,
          is_milestone: true,
          premises: [],
          argument_edges: [],
          checkpoint_responses: [],
          interpretation_selections: [],
        } as never);
        session_id = new_session_id;
      }
      app_state_store.getState().setRecent(frame_id);
      navigate({ kind: "argument_running", session_id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push({ kind: "error", message: `Couldn't open an argument session: ${msg}` });
    } finally {
      setRunArgumentPending(null);
    }
  }
  function onTogglePin(frame_id: FrameId, pinned: boolean): void {
    try {
      app_state_store.getState().pinFrame(frame_id, pinned);
    } catch (err) {
      // P1: surface the pin cap as a warning toast instead of throwing
      // up into React's error boundary.
      if (err instanceof PinnedCapReached) {
        toast.push({ kind: "warning", message: err.message });
        return;
      }
      throw err;
    }
  }

  async function onStartTutorial(): Promise<void> {
    if (tutorial_loading) return;
    if (!user) {
      toast.push({ kind: "warning", message: "Sign in first to start the tutorial." });
      return;
    }
    setTutorialLoading(true);
    try {
      const result = await createTutorial({
        repo: repository,
        now,
        generateId,
        user_id: user.id,
      });
      // Re-list frames so the tutorial frame appears on the Home page.
      await app_state_store.getState().loadFrames();
      app_state_store.getState().setRecent(result.frame_id);
      // Arm the tour to start once argument-running mounts. Short tour first;
      // the user can opt into the long tour at the end of the short one.
      setTutorialPhase("short");
      navigate({ kind: "argument_running", session_id: result.session_id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push({ kind: "error", message: `Could not load the tutorial: ${msg}` });
    } finally {
      setTutorialLoading(false);
    }
  }

  async function onSubmitWizard(args: NewFrameWizardSubmitArgs): Promise<void> {
    const result = await app_state_store
      .getState()
      .createFrame({ title: args.title, mode: args.mode, flavor: args.flavor });
    // P0-13: record the new frame as Most Recent so it appears on the Home
    // page when the user navigates back. Before this fix, createFrame +
    // navigate left the new frame reachable only via the URL hash; the Home
    // page rebuilt Recents from app_state.recents only and the new frame
    // never landed there.
    app_state_store.getState().setRecent(result.frame.id);
    setWizardOpen(false);
    navigate({ kind: "frame_building", frame_id: result.frame.id });
  }

  return (
    // P5: parent <main id="main"> lives in app-routes.tsx so the skip-link
    // target is defined once for every page. Using a plain <div> here
    // avoids nested <main> elements (invalid per HTML5 spec).
    <div
      data-testid="home-page"
      style={{
        padding: "var(--space-6) var(--space-6) var(--space-8)",
        minHeight: "100vh",
        maxWidth: "1200px",
        margin: "0 auto",
        background: "var(--color-surface-canvas)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-6)",
          paddingBottom: "var(--space-4)",
          borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
          <h1
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--letter-spacing-tight)",
              margin: 0,
              color: "var(--color-text-primary)",
            }}
          >
            argmap
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {/* Demote the tutorial entry to a quiet text link so the primary
              CTA (New frame) reads as the singular intent. Production UIs
              follow this pattern: one primary action per surface, ancillary
              actions as links to the left of it. */}
          <button
            type="button"
            data-testid="home-start-tutorial"
            onClick={onStartTutorial}
            disabled={tutorial_loading}
            style={{
              background: "transparent",
              border: "none",
              padding: "var(--space-1) var(--space-2)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              cursor: tutorial_loading ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: tutorial_loading ? 0.6 : 1,
            }}
          >
            {tutorial_loading ? "Loading tutorial…" : "Try the tutorial"}
          </button>
          <Button
            variant="primary"
            data-testid="home-new-frame"
            onClick={() => setWizardOpen(true)}
            leading={<UIcon name="plus" size={16} />}
          >
            New frame
          </Button>
        </div>
      </header>

      {is_empty ? (
        <div data-testid="home-empty-state" style={{ marginTop: "var(--space-8)" }}>
          <EmptyState
            label={EMPTY_COPY.title}
            description={EMPTY_COPY.body}
            icon={
              <svg
                width={48}
                height={48}
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="8" y="10" width="32" height="28" rx="3" />
                <path d="M14 18h20M14 24h14M14 30h8" />
              </svg>
            }
            action={
              // Same hierarchy as the page header: one primary action,
              // tutorial as a quiet text link. Use the SAME copy as the
              // header ("Try the tutorial") and the SAME primary label
              // ("New frame") so there are not two phrasings for one action.
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  data-testid="home-empty-start-tutorial"
                  onClick={onStartTutorial}
                  disabled={tutorial_loading}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "var(--space-1) var(--space-2)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    cursor: tutorial_loading ? "default" : "pointer",
                    fontFamily: "inherit",
                    opacity: tutorial_loading ? 0.6 : 1,
                  }}
                >
                  {tutorial_loading ? "Loading tutorial…" : "Try the tutorial"}
                </button>
                <Button
                  variant="primary"
                  onClick={() => setWizardOpen(true)}
                  leading={<UIcon name="plus" size={16} />}
                >
                  New frame
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {pinned.length > 0 ? (
            <section data-testid="pinned-section" style={{ marginBottom: "var(--space-6)" }}>
              <SectionHeading>Pinned</SectionHeading>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "var(--space-3)",
                }}
              >
                {pinned.map((f) => (
                  <FrameSummaryCard
                    key={f.id}
                    summary={f}
                    is_pinned={pinned_set.has(f.id)}
                    onOpen={onOpen}
                    onTogglePin={onTogglePin}
                    onRunArgument={(id) => void onRunArgument(id)}
                    run_argument_pending={run_argument_pending === f.id}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {recents.length > 0 ? (
            <section data-testid="recents-section">
              <SectionHeading>Recent</SectionHeading>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "var(--space-3)",
                }}
              >
                {recents.slice(0, 20).map((f) => (
                  <FrameSummaryCard
                    key={f.id}
                    summary={f}
                    is_pinned={pinned_set.has(f.id)}
                    onOpen={onOpen}
                    onTogglePin={onTogglePin}
                    onRunArgument={(id) => void onRunArgument(id)}
                    run_argument_pending={run_argument_pending === f.id}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Dialog
        open={wizard_open}
        onClose={() => setWizardOpen(false)}
        aria_label="New frame"
        size="md"
      >
        {/* P1: key by `wizard_open` so the wizard remounts each time it
            opens, clearing any prior in-progress title/mode/flavor input.
            Without this key, the wizard's internal useState survived the
            Dialog's open/close cycle and the user saw stale form state on
            the next open. */}
        <NewFrameWizard
          key={String(wizard_open)}
          onSubmit={onSubmitWizard}
          onCancel={() => setWizardOpen(false)}
        />
      </Dialog>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <h2
      className="argmap-section-heading"
      style={{
        marginBottom: "var(--space-3)",
      }}
    >
      {children}
    </h2>
  );
}

export { EMPTY_COPY };
