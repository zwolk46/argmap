export { ArgumentRunningPage, type ArgumentRunningPageProps } from "./argument-running-page";
export {
  ArgumentRunningTopBar,
  useArgumentRunningTopBarSlots,
  type ArgumentRunningTopBarDeps,
} from "./top-bar-slots";
export { TwoPaneLayout, type TwoPaneLayoutProps } from "./two-pane-layout";
export {
  FrameVersionDriftIndicator,
  type FrameVersionDriftIndicatorProps,
} from "./frame-version-drift-indicator";
export { StatusSummaryChip, type StatusSummaryChipProps } from "./status-summary-chip";

// Sub-module re-exports for tests and integration use:
export {
  InterviewPane,
  DEFAULT_INTERVIEW_FILTER,
  InterviewFilter,
  passesFilter,
  InterviewSearch,
  searchMatches,
  InterviewList,
  InterviewRow,
  buildBreadcrumb,
  statementPreviewFor,
  RecomputeIndicator,
  InterviewEmptyState,
  type InterviewPaneProps,
  type InterviewFilterState,
} from "./interview-pane";

export {
  OutputViewer,
  OutputViewTabs,
  OUTPUT_VIEW_TAB_ORDER,
  PathOverlayTab,
  buildArgumentOverlayProjection,
  DecisionTreeTab,
  layoutDecisionTreeBranches,
  type DecisionTreeNodeBox,
  ProseTab,
  copyTextToClipboard,
  proseToMarkdown,
  OutputEmptyState,
  type OutputViewerProps,
  type OutputViewTab,
} from "./output-viewer";

export {
  ItemEditorHost,
  ITEM_EDITOR_REGISTRY,
  CheckpointItemEditor,
  TermItemEditor,
  listTermInterpretations,
  InterpretationItemEditor,
  PremiseAuthoringSection,
  type PremiseAuthoringResult,
  PremiseReuseSuggestions,
  rankPremiseReuse,
  REUSE_SIMILARITY_THRESHOLD,
  REUSE_TOP_N,
  AuthorityAttachmentSection,
  authorityPickerVisible,
  NotesField,
} from "./item-editors";

export {
  BottomPanel,
  PremisePool,
  PremiseRow,
  countAttachedEdges,
  SessionAuthorities,
  SessionAuthorityRow,
  type BottomPanelProps,
  type PremisePoolProps,
  type PremiseRowProps,
  type AttachedEdgeCounts,
  type SessionAuthoritiesProps,
  type SessionAuthorityRowProps,
} from "./bottom-panel";
