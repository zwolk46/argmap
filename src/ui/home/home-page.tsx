import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { useAppStateStore, useRepository } from "@/state";
import { useNavigate } from "../routing";
import { Dialog } from "../primitives";
import { NewFrameWizard, type NewFrameWizardSubmitArgs } from "../onboarding";
import { FrameSummaryCard, type FrameSummary } from "./frame-summary-card";

export interface HomePageProps {
  // Reserved for future extension; currently unused.
  initial_search?: string;
}

const EMPTY_COPY = {
  title: "No frames yet.",
  body: "Create your first frame, or start from a template.",
} as const;

export function HomePage(_props: HomePageProps = {}): ReactElement {
  const frames = useAppStateStore((s) => s.frames);
  const recents_ids = useAppStateStore((s) => s.app_state.recents);
  const pinned_ids = useAppStateStore((s) => s.app_state.pinned);
  const { app_state_store } = useRepository();
  const navigate = useNavigate();
  const [wizard_open, setWizardOpen] = React.useState(false);

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
  function onTogglePin(frame_id: FrameId, pinned: boolean): void {
    app_state_store.getState().pinFrame(frame_id, pinned);
  }

  async function onSubmitWizard(args: NewFrameWizardSubmitArgs): Promise<void> {
    const result = await app_state_store
      .getState()
      .createFrame({ title: args.title, mode: args.mode, flavor: args.flavor });
    setWizardOpen(false);
    navigate({ kind: "frame_building", frame_id: result.frame.id });
  }

  return (
    <main
      data-testid="home-page"
      style={{
        padding: "var(--space-6, 24px)",
        fontFamily: "var(--font-sans)",
        color: "var(--color-text-primary)",
        background: "var(--color-surface-canvas)",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-5, 20px)",
        }}
      >
        <h1
          style={{
            fontSize: "var(--font-size-xl, 20px)",
            fontWeight: 500,
            margin: 0,
          }}
        >
          argmap
        </h1>
        <button
          type="button"
          data-testid="home-new-frame"
          onClick={() => setWizardOpen(true)}
          style={{
            background: "var(--color-mode-current-accent, #1d4ed8)",
            color: "var(--color-text-on-accent, #ffffff)",
            border: "none",
            borderRadius: "var(--radius-md, 6px)",
            padding: "var(--space-2, 8px) var(--space-4, 16px)",
            cursor: "pointer",
          }}
        >
          + New frame
        </button>
      </header>

      {is_empty ? (
        <div
          data-testid="home-empty-state"
          style={{
            textAlign: "center",
            color: "var(--color-text-secondary, #6b7280)",
            padding: "var(--space-6, 24px)",
          }}
        >
          <p style={{ fontSize: "var(--font-size-base, 14px)", fontWeight: 500 }}>
            {EMPTY_COPY.title}
          </p>
          <p style={{ fontSize: "var(--font-size-sm, 13px)" }}>{EMPTY_COPY.body}</p>
        </div>
      ) : (
        <>
          {pinned.length > 0 ? (
            <section data-testid="pinned-section" style={{ marginBottom: "var(--space-5, 20px)" }}>
              <h2
                style={{
                  fontSize: "var(--font-size-xs, 11px)",
                  textTransform: "uppercase",
                  color: "var(--color-text-secondary, #6b7280)",
                  letterSpacing: "0.04em",
                  margin: "0 0 var(--space-3, 12px)",
                }}
              >
                Pinned
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-3, 12px)",
                  overflowX: "auto",
                  paddingBottom: "var(--space-2, 8px)",
                }}
              >
                {pinned.map((f) => (
                  <FrameSummaryCard
                    key={f.id}
                    summary={f}
                    onOpen={onOpen}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {recents.length > 0 ? (
            <section data-testid="recents-section">
              <h2
                style={{
                  fontSize: "var(--font-size-xs, 11px)",
                  textTransform: "uppercase",
                  color: "var(--color-text-secondary, #6b7280)",
                  letterSpacing: "0.04em",
                  margin: "0 0 var(--space-3, 12px)",
                }}
              >
                Recent
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "var(--space-3, 12px)",
                }}
              >
                {recents.slice(0, 20).map((f) => (
                  <FrameSummaryCard
                    key={f.id}
                    summary={f}
                    onOpen={onOpen}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Dialog open={wizard_open} onClose={() => setWizardOpen(false)} aria_label="New frame">
        <NewFrameWizard onSubmit={onSubmitWizard} onCancel={() => setWizardOpen(false)} />
      </Dialog>
    </main>
  );
}

export { EMPTY_COPY };
