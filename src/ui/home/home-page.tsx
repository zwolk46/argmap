import * as React from "react";
import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { useAppStateStore, useRepository } from "@/state";
import { useNavigate } from "../routing";
import { Dialog, Button, EmptyState } from "../primitives";
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
    <main
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
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "var(--letter-spacing-wide)",
              textTransform: "uppercase",
            }}
          >
            v1
          </span>
        </div>
        <Button
          variant="primary"
          data-testid="home-new-frame"
          onClick={() => setWizardOpen(true)}
          leading={
            <svg
              width={14}
              height={14}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
          }
        >
          New frame
        </Button>
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
              <Button variant="primary" onClick={() => setWizardOpen(true)}>
                Create your first frame
              </Button>
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
        <NewFrameWizard onSubmit={onSubmitWizard} onCancel={() => setWizardOpen(false)} />
      </Dialog>
    </main>
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
