import * as React from "react";
import type { ReactElement } from "react";
import { Plus, FileText, TestTube } from "@phosphor-icons/react";
import type { FrameId } from "@/schema";
import { useAppStateStore, useRepository, PinnedCapReached } from "@/state";
import { useAuth } from "../auth";
import { useNavigate } from "../routing";
import { Dialog, EmptyState, Spinner, useToast } from "../primitives";
import { Button } from "#components/ui/button";
import { NewFrameWizard, type NewFrameWizardSubmitArgs } from "../onboarding";
import { FrameSummaryCard, type FrameSummary } from "./frame-summary-card";
import { createTutorial } from "@/tutorial";
import { setTutorialPhase } from "../tutorial";
import { seedPeopleVZach } from "@/demo/seed-people-v-zach";

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
  const is_loading = useAppStateStore((s) => s.is_loading);
  const { repository, app_state_store, now, generateId } = useRepository();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [wizard_open, setWizardOpen] = React.useState(false);
  const [tutorial_loading, setTutorialLoading] = React.useState(false);
  const [seed_demo_loading, setSeedDemoLoading] = React.useState(false);
  const [frames_loaded_once, setFramesLoadedOnce] = React.useState(false);
  const [run_argument_pending, setRunArgumentPending] = React.useState<FrameId | null>(null);
  const run_argument_in_flight = React.useRef<Set<FrameId>>(new Set());

  React.useEffect(() => {
    void app_state_store
      .getState()
      .loadFrames()
      .finally(() => setFramesLoadedOnce(true));
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
  const is_empty = frames.length === 0 && pinned.length === 0 && recents.length === 0;
  const non_empty_no_recents = frames.length > 0 && pinned.length === 0 && recents.length === 0;

  function onOpen(frame_id: FrameId): void {
    app_state_store.getState().setRecent(frame_id);
    navigate({ kind: "frame_building", frame_id });
  }

  async function onRunArgument(frame_id: FrameId): Promise<void> {
    if (run_argument_in_flight.current.has(frame_id)) return;
    run_argument_in_flight.current.add(frame_id);
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
          // §8 #1: snapshot the frame this version is authored against.
          frame_version_snapshot: frame_version,
        } as never);
        session_id = new_session_id;
      }
      app_state_store.getState().setRecent(frame_id);
      navigate({ kind: "argument_running", session_id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push({ kind: "error", message: `Couldn't open an argument session: ${msg}` });
    } finally {
      run_argument_in_flight.current.delete(frame_id);
      setRunArgumentPending(null);
    }
  }
  function onTogglePin(frame_id: FrameId, pinned: boolean): void {
    try {
      app_state_store.getState().pinFrame(frame_id, pinned);
    } catch (err) {
      if (err instanceof PinnedCapReached) {
        toast.push({ kind: "warning", message: err.message });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      toast.push({ kind: "error", message: `Couldn't update the pin: ${msg}` });
    }
  }

  async function onSeedDemo(): Promise<void> {
    if (seed_demo_loading) return;
    setSeedDemoLoading(true);
    try {
      const result = await seedPeopleVZach({
        repo: repository,
        now,
        generateId,
        user_id: user?.id,
      });
      await app_state_store.getState().loadFrames();
      app_state_store.getState().setRecent(result.frame_id);
      toast.push({
        kind: result.reused ? "info" : "success",
        message: result.reused
          ? "Opened existing People v. Zach demo frame."
          : "Seeded the People v. Zach demo frame.",
      });
      navigate({ kind: "frame_building", frame_id: result.frame_id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push({ kind: "error", message: `Couldn't seed the demo frame: ${msg}` });
    } finally {
      setSeedDemoLoading(false);
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
      await app_state_store.getState().loadFrames();
      app_state_store.getState().setRecent(result.frame_id);
      setTutorialPhase("short");
      navigate({ kind: "argument_running", session_id: result.session_id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push({ kind: "error", message: `Couldn't load the tutorial: ${msg}` });
    } finally {
      setTutorialLoading(false);
    }
  }

  async function onSubmitWizard(args: NewFrameWizardSubmitArgs): Promise<void> {
    try {
      const result = await app_state_store
        .getState()
        .createFrame({ title: args.title, mode: args.mode, flavor: args.flavor });
      app_state_store.getState().setRecent(result.frame.id);
      setWizardOpen(false);
      navigate({ kind: "frame_building", frame_id: result.frame.id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push({ kind: "error", message: `Couldn't create the frame: ${msg}` });
    }
  }

  return (
    // P5: parent <main id="main"> lives in app-routes.tsx so the skip-link
    // target is defined once for every page. Using a plain <div> here
    // avoids nested <main> elements (invalid per HTML5 spec).
    <div
      data-testid="home-page"
      className="mx-auto min-h-screen max-w-[1200px] bg-[var(--color-surface-canvas)] px-6 pb-8 pt-6"
    >
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-baseline gap-2">
          <h1 className="m-0 text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            argmap
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Demote the tutorial entry to a quiet text link so the primary
              CTA (New frame) reads as the singular intent. */}
          <Button
            variant="ghost"
            size="sm"
            data-testid="home-start-tutorial"
            onClick={onStartTutorial}
            disabled={tutorial_loading}
          >
            {tutorial_loading ? <Spinner size={12} decorative /> : null}
            {tutorial_loading ? "Loading tutorial…" : "Try the tutorial"}
          </Button>
          {import.meta.env.DEV ? (
            <Button
              variant="ghost"
              size="sm"
              data-testid="home-seed-demo"
              title="Dev-only: seed the People v. Zach demo frame"
              onClick={onSeedDemo}
              disabled={seed_demo_loading}
            >
              {seed_demo_loading ? (
                <Spinner size={12} decorative />
              ) : (
                <TestTube size={14} data-icon="inline-start" />
              )}
              {seed_demo_loading ? "Seeding…" : "Seed demo"}
            </Button>
          ) : null}
          <Button
            variant="default"
            data-testid="home-new-frame"
            onClick={() => setWizardOpen(true)}
          >
            <Plus size={16} data-icon="inline-start" />
            New frame
          </Button>
        </div>
      </header>

      {!frames_loaded_once && is_loading ? (
        <div
          data-testid="home-loading"
          role="status"
          aria-live="polite"
          className="mt-8 flex items-center justify-center gap-2 p-8 text-[var(--color-text-secondary)]"
        >
          <Spinner size={16} decorative />
          <span>Loading your frames…</span>
        </div>
      ) : is_empty ? (
        <div data-testid="home-empty-state" className="mt-8">
          <EmptyState
            label={EMPTY_COPY.title}
            description={EMPTY_COPY.body}
            icon={<FileText size={48} />}
            action={
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid="home-empty-start-tutorial"
                  onClick={onStartTutorial}
                  disabled={tutorial_loading}
                >
                  {tutorial_loading ? <Spinner size={12} decorative /> : null}
                  {tutorial_loading ? "Loading tutorial…" : "Try the tutorial"}
                </Button>
                <Button variant="default" onClick={() => setWizardOpen(true)}>
                  <Plus size={16} data-icon="inline-start" />
                  New frame
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <>
          {pinned.length > 0 ? (
            <section data-testid="pinned-section" className="mb-6">
              <SectionHeading>Pinned</SectionHeading>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
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
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
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
          {non_empty_no_recents ? (
            <section data-testid="all-frames-section">
              <SectionHeading>All frames</SectionHeading>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                {frames.slice(0, 20).map((f) => (
                  <FrameSummaryCard
                    key={f.id}
                    summary={f as FrameSummary}
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
            opens, clearing any prior in-progress title/mode/flavor input. */}
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
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
      {children}
    </h2>
  );
}

export { EMPTY_COPY };
