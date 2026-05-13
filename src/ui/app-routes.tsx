import * as React from "react";
import type { ReactElement } from "react";
import { useRoute, useNavigate } from "./routing";
import { FrameBuildingPage, ArgumentRunningPage } from "./pages";
import {
  VersionHistoryPane,
  VersionHistoryPreviewProvider,
  FramePreviewView,
  SessionPreviewView,
  useVersionHistoryPreview,
} from "./version-history";
import { OnboardingWizard } from "./onboarding";
import { HomePage } from "./home";
import { useAppStateStore, useRepository, selectFirstLaunchDismissed } from "@/state";

export function AppRoutes(): ReactElement {
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

  // Lift the operating-mode data-attribute onto the document root so the
  // mode-accent cascade (focus rings, primary buttons, every chrome surface)
  // resolves correctly outside of the top bar.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const mode =
      route.kind === "argument_running" ? "argument-running" : "frame-building";
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

  return (
    <>
      {page}
      <VersionHistoryPane open={version_history_open} onClose={onClose} />
      <AppOnboardingMount />
    </>
  );
}

function AppOnboardingMount(): ReactElement | null {
  const dismissed = useAppStateStore((s) => selectFirstLaunchDismissed(s.app_state));
  const { app_state_store } = useRepository();
  const navigate = useNavigate();

  const onSkip = React.useCallback(() => {
    app_state_store.getState().dismissWarning("first_launch");
  }, [app_state_store]);

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
      app_state_store.getState().dismissWarning("first_launch");
      navigate({ kind: "frame_building", frame_id: result.frame.id });
    },
    [app_state_store, navigate],
  );

  return <OnboardingWizard open={!dismissed} onSkip={onSkip} onSubmit={onSubmit} />;
}
