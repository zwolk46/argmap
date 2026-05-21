import * as React from "react";
import type { ReactElement } from "react";
import { useRoute, useNavigate } from "./routing";
import {
  VersionHistoryPane,
  VersionHistoryPreviewProvider,
  useVersionHistoryPreview,
} from "./version-history";
import { OnboardingWizard } from "./onboarding";
import { HomePage } from "./home";
import { LoadingScreen } from "./primitives";
import { CommandPalette, useCommandPaletteShortcut } from "./chrome/command-palette";
import { useAppStateStore, useRepository, selectFirstLaunchDismissed } from "@/state";

// Code-split the heavy pages. Home + sign-in are the routes a first-time
// user hits; the canvas-heavy pages (Frame Building, Argument Running,
// version-history preview surfaces) ship a separate chunk that loads only
// when the user navigates to them. React Flow + ELK + the layout module
// together account for ~60% of the previous all-in-one bundle.
const FrameBuildingPage = React.lazy(() =>
  import("./pages").then((m) => ({ default: m.FrameBuildingPage })),
);
const ArgumentRunningPage = React.lazy(() =>
  import("./pages").then((m) => ({ default: m.ArgumentRunningPage })),
);
const FramePreviewView = React.lazy(() =>
  import("./version-history").then((m) => ({ default: m.FramePreviewView })),
);
const SessionPreviewView = React.lazy(() =>
  import("./version-history").then((m) => ({ default: m.SessionPreviewView })),
);

/**
 * Boots the app's persistent AppState (pins, recents, coachmark dismissals,
 * dismissed warnings, output-view tab choices, etc.) before any UI mutates it.
 * Without this gate, every reload painted DEFAULT_APP_STATE first and the
 * first stray patch autosaved that default over the on-disk record. P0-1.
 */
function useBootAppState(): boolean {
  const is_loaded = useAppStateStore((s) => s.is_loaded);
  const { app_state_store } = useRepository();
  React.useEffect(() => {
    if (!is_loaded) {
      void app_state_store.getState().loadAppState();
    }
  }, [app_state_store, is_loaded]);
  return is_loaded;
}

export function AppRoutes(): ReactElement {
  const is_loaded = useBootAppState();
  if (!is_loaded) return <LoadingScreen label="Loading your workspace…" />;
  return (
    <VersionHistoryPreviewProvider>
      <RoutedView />
    </VersionHistoryPreviewProvider>
  );
}

function RoutedView(): ReactElement {
  const route = useRoute();
  const [version_history_open, setVersionHistoryOpen] = React.useState(false);
  const onToggle = React.useCallback(() => setVersionHistoryOpen((v) => !v), []);
  const onClose = React.useCallback(() => setVersionHistoryOpen(false), []);
  const preview = useVersionHistoryPreview();
  const [palette_open, set_palette_open] = useCommandPaletteShortcut();

  // Lift the operating-mode data-attribute onto the document root so the
  // mode-accent cascade (focus rings, primary buttons, every chrome surface)
  // resolves correctly outside of the top bar.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const mode = route.kind === "argument_running" ? "argument-running" : "frame-building";
    document.documentElement.dataset.mode = mode;
    document.body.dataset.mode = mode;
  }, [route.kind]);

  let page: ReactElement;
  if (preview.state.kind === "frame") {
    page = (
      <FramePreviewView
        frame_id={preview.state.frame_id}
        version_id={preview.state.version_id}
        version_number={preview.state.version_number}
      />
    );
  } else if (preview.state.kind === "session") {
    page = (
      <SessionPreviewView
        session_id={preview.state.session_id}
        version_id={preview.state.version_id}
        version_number={preview.state.version_number}
      />
    );
  } else {
    switch (route.kind) {
      case "frame_building":
        page = (
          <FrameBuildingPage
            frame_id={route.frame_id}
            onToggleVersionHistory={onToggle}
            version_history_open={version_history_open}
          />
        );
        break;
      case "argument_running":
        page = (
          <ArgumentRunningPage
            session_id={route.session_id}
            on_toggle_version_history={onToggle}
            version_history_open={version_history_open}
          />
        );
        break;
      case "home":
      default:
        page = <HomePage />;
    }
  }

  // WCAG 2.4.1: activating the skip link must move keyboard focus to the
  // main landmark — just changing the hash isn't a bypass. Routing already
  // ignores `#main` (RouterProvider's isRouteHash guard), so navigation
  // doesn't change; we programmatically focus #main here so the next Tab
  // lands inside the primary content region.
  const onSkipToMain = React.useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.getElementById("main");
    if (main) main.focus();
  }, []);

  return (
    <>
      <a href="#main" className="argmap-skip-link" onClick={onSkipToMain}>
        Skip to main content
      </a>
      {/* `display: contents` makes the <main> a transparent passthrough so
          existing page layouts (which set their own minHeight/grid/flex on
          the immediate children) keep their geometry unchanged. tabIndex=-1
          allows programmatic focus after the skip link is activated. */}
      <main id="main" tabIndex={-1} style={{ display: "contents" }}>
        {/* React.lazy needs a Suspense boundary. We render LoadingScreen
            while the canvas-heavy chunk arrives — same component the
            workspace boot already uses, so the transition reads as one
            continuous load rather than a flash of empty UI. */}
        <React.Suspense fallback={<LoadingScreen label="Loading…" />}>{page}</React.Suspense>
      </main>
      <VersionHistoryPane open={version_history_open} onClose={onClose} />
      <AppOnboardingMount />
      <CommandPalette
        open={palette_open}
        onOpenChange={set_palette_open}
        on_toggle_version_history={
          route.kind !== "home" && preview.state.kind === "none" ? onToggle : undefined
        }
      />
    </>
  );
}

function AppOnboardingMount(): ReactElement | null {
  const dismissed = useAppStateStore((s) => selectFirstLaunchDismissed(s.app_state));
  const { app_state_store, autosave } = useRepository();
  const navigate = useNavigate();

  // Write to the registry-canonical key (coachmark_dismissals.welcome_screen)
  // and immediately flush so a quick reload doesn't lose the dismissal in
  // the 1s app-state debounce window.
  const onSkip = React.useCallback(() => {
    app_state_store.getState().dismissCoachmark("welcome_screen", true);
    void autosave.flushAppState();
  }, [app_state_store, autosave]);

  const onSubmit = React.useCallback(
    async (args: {
      title: string;
      description?: string;
      mode: "legal" | "general";
      flavor?: "personal" | "academic";
    }) => {
      const result = await app_state_store
        .getState()
        .createFrame({ title: args.title, mode: args.mode, flavor: args.flavor });
      // P0-13: record as Most Recent so the frame appears on Home when the
      // user navigates back from frame-building.
      app_state_store.getState().setRecent(result.frame.id);
      app_state_store.getState().dismissCoachmark("welcome_screen", true);
      // Force-flush so the dismissal+recent survive a quick navigation.
      void autosave.flushAppState();
      navigate({ kind: "frame_building", frame_id: result.frame.id });
    },
    [app_state_store, autosave, navigate],
  );

  return <OnboardingWizard open={!dismissed} onSkip={onSkip} onSubmit={onSubmit} />;
}
