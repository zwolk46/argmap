export { OnboardingWizard, type OnboardingWizardProps } from "./onboarding-wizard";
export { WelcomeScreen, WELCOME_SCREEN_COPY, type WelcomeScreenProps } from "./welcome-screen";
export {
  NewFrameWizard,
  WIZARD_STEP_TITLES,
  type NewFrameWizardProps,
  type NewFrameWizardSubmitArgs,
} from "./new-frame-wizard";
export { Coachmark, type CoachmarkProps } from "./coachmark";
export { NewFeatureNotice, type NewFeatureNoticeProps } from "./new-feature-notice";
export { useCoachmark, type UseCoachmarkReturn } from "./use-coachmark";
export { useNewFeatureNotice, type UseNewFeatureNoticeReturn } from "./use-new-feature-notice";
export { OnboardingPreferencesSection } from "./onboarding-preferences-section";
export {
  COACHMARK_IDS,
  COACHMARK_MESSAGES,
  FIRST_LAUNCH_COACHMARK_ID,
  NEW_FEATURE_NOTICE_IDS,
  NEW_FEATURE_NOTICE_DEFINITIONS,
  UnknownCoachmarkIdError,
  UnknownNewFeatureNoticeIdError,
  isCoachmarkId,
  type CoachmarkId,
  type NewFeatureNoticeId,
  type NewFeatureNoticeDefinition,
} from "./coachmark-registry";
