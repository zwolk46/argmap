export { RootQuestionEditor } from "./root-question-editor";
export type { RootQuestionEditorProps } from "./root-question-editor";
export { SubQuestionEditor } from "./sub-question-editor";
export type { SubQuestionEditorProps } from "./sub-question-editor";
export { TermEditor } from "./term-editor";
export type { TermEditorProps } from "./term-editor";
export { InterpretationEditor } from "./interpretation-editor";
export type { InterpretationEditorProps } from "./interpretation-editor";
export { CheckpointEditor } from "./checkpoint-editor";
export type { CheckpointEditorProps } from "./checkpoint-editor";
export { LogicalGateEditor } from "./logical-gate-editor";
export type { LogicalGateEditorProps } from "./logical-gate-editor";
export { ConclusionEditor } from "./conclusion-editor";
export type { ConclusionEditorProps } from "./conclusion-editor";
export { AuthorityEditor } from "./authority-editor";
export type { AuthorityEditorProps } from "./authority-editor";
export { EdgeEditor } from "./edge-editor";
export type { EdgeEditorProps } from "./edge-editor";

import * as React from "react";
import type { NodeType } from "@/schema";
import { RootQuestionEditor } from "./root-question-editor";
import { SubQuestionEditor } from "./sub-question-editor";
import { TermEditor } from "./term-editor";
import { InterpretationEditor } from "./interpretation-editor";
import { CheckpointEditor } from "./checkpoint-editor";
import { LogicalGateEditor } from "./logical-gate-editor";
import { ConclusionEditor } from "./conclusion-editor";
import { AuthorityEditor } from "./authority-editor";

function PremisePlaceholder(): React.ReactElement {
  return React.createElement(
    "div",
    {
      style: {
        padding: "var(--space-3, 12px)",
        color: "var(--color-text-secondary, #6b7280)",
        fontSize: "var(--font-size-sm, 13px)",
        fontStyle: "italic",
      },
    },
    "Premises are managed in Argument Running.",
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NODE_TYPE_EDITORS: Readonly<Record<NodeType, React.ComponentType<any>>> = {
  RootQuestion: RootQuestionEditor,
  SubQuestion: SubQuestionEditor,
  Term: TermEditor,
  Interpretation: InterpretationEditor,
  Checkpoint: CheckpointEditor,
  LogicalGate: LogicalGateEditor,
  Conclusion: ConclusionEditor,
  Authority: AuthorityEditor,
  Premise: PremisePlaceholder,
};
