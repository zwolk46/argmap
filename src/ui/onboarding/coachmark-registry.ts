export const COACHMARK_IDS = [
  "welcome_screen",
  "inspector_open",
  "edge_create",
  "switch_to_argument",
  "version_history_open",
  "argument_pane_open",
] as const;

export type CoachmarkId = (typeof COACHMARK_IDS)[number];

export const FIRST_LAUNCH_COACHMARK_ID: CoachmarkId = "welcome_screen";

export const COACHMARK_MESSAGES: Record<CoachmarkId, string> = {
  welcome_screen:
    "Welcome to argmap. Start a guided first frame to learn the basics, or skip to explore.",
  inspector_open:
    "This panel shows the fields for whatever you've selected. Mode-specific fields appear or hide automatically.",
  edge_create:
    "Drag from this handle to another node to create an edge. Only valid edge types will be offered.",
  switch_to_argument:
    "If your frame has errors, the switch is blocked. Warnings let you proceed.",
  version_history_open:
    "Every save is preserved. Star icons mark milestones you've named.",
  argument_pane_open:
    "These are the open items. Top is recommended next, but you can address any of them.",
};

export class UnknownCoachmarkIdError extends Error {
  constructor(id: string) {
    super(`Unknown coachmark id: ${id}`);
    this.name = "UnknownCoachmarkIdError";
  }
}

export const NEW_FEATURE_NOTICE_IDS = [] as const;
export type NewFeatureNoticeId = (typeof NEW_FEATURE_NOTICE_IDS)[number];

export interface NewFeatureNoticeDefinition {
  id: NewFeatureNoticeId;
  title: string;
  message: string;
  glossary_term?: string;
}

export const NEW_FEATURE_NOTICE_DEFINITIONS: ReadonlyArray<NewFeatureNoticeDefinition> = [];

export class UnknownNewFeatureNoticeIdError extends Error {
  constructor(id: string) {
    super(`Unknown new-feature-notice id: ${id}`);
    this.name = "UnknownNewFeatureNoticeIdError";
  }
}

export function isCoachmarkId(id: string): id is CoachmarkId {
  return (COACHMARK_IDS as ReadonlyArray<string>).includes(id);
}
