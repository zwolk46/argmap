export { App } from "./App";
export type { AppProps } from "./App";

export * from "./primitives";
export * from "./chrome";
export * from "./canvas";
export * from "./ai-suggestion";
export * from "./hooks";

export { useRoute, useNavigate } from "./routing";
export type { Route } from "./routing";

export {
  FrameBuildingPage,
  ArgumentRunningPage,
  VersionHistoryPane,
  VersionHistoryPreviewProvider,
  useVersionHistoryPreview,
  VersionHistoryPreviewProviderMissingError,
  FramePreviewView,
  SessionPreviewView,
  OnboardingWizard,
} from "./pages";
export type {
  ArgumentRunningPageProps,
  FrameBuildingPageProps,
  VersionHistoryPaneProps,
  PreviewState,
  VersionHistoryPreviewControls,
  FramePreviewViewProps,
  SessionPreviewViewProps,
  OnboardingWizardProps,
} from "./pages";

export {
  Coachmark,
  NewFeatureNotice,
  useCoachmark,
  useNewFeatureNotice,
  OnboardingPreferencesSection,
  WelcomeScreen,
  NewFrameWizard,
  WELCOME_SCREEN_COPY,
  COACHMARK_IDS,
  COACHMARK_MESSAGES,
  FIRST_LAUNCH_COACHMARK_ID,
  isCoachmarkId,
  type CoachmarkId,
} from "./onboarding";

export {
  HomePage,
  FrameSummaryCard,
  relativeTime as homeRelativeTime,
  EMPTY_COPY as HOME_EMPTY_COPY,
  type HomePageProps,
  type FrameSummaryCardProps,
  type FrameSummary,
} from "./home";
