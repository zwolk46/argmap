import type { ReactElement } from "react";
import { CheckCircle, Warning, XCircle } from "@phosphor-icons/react";
import type { NodeRef, ConclusionDirection, Position, ValidationResult } from "@/schema";
import type { ConclusionDirectionEditor } from "@/state";
import { ConclusionDirectionEditorRow } from "./conclusion-direction-editor";
import { AdvisoryList } from "./advisory-list";

export interface ScanResultBodyProps {
  blocking: ValidationResult[];
  advisory: ValidationResult[];
  inline_editors: ConclusionDirectionEditor[];
  direction_resolutions: ReadonlyMap<NodeRef, ConclusionDirection>;
  onResolutionChanged: (node_id: NodeRef, direction: ConclusionDirection) => void;
  conclusion_title_by_id: ReadonlyMap<NodeRef, string>;
  available_positions?: Position[];
}

export function ScanResultBody(props: ScanResultBodyProps): ReactElement {
  const has_blocking = props.blocking.length > 0;
  const has_advisory = props.advisory.length > 0;

  if (!has_blocking && !has_advisory) {
    return (
      <div
        data-testid="scan-result-empty"
        className="mt-3 flex items-center gap-2 rounded-md px-4 py-3 text-sm"
        style={{
          color: "var(--color-status-satisfied)",
          background: "var(--color-status-satisfied-bg)",
        }}
      >
        <CheckCircle size={14} weight="fill" />
        No items to address — mode change ready to commit.
      </div>
    );
  }

  return (
    <div data-testid="scan-result-body" className="mt-3">
      {has_blocking ? (
        <section data-testid="scan-result-blocking">
          <h3
            className="my-2 mt-3 flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--color-severity-error)" }}
          >
            <XCircle size={14} weight="fill" />
            Resolve before continuing ({props.blocking.length})
          </h3>
          {props.inline_editors.map((editor) => (
            <ConclusionDirectionEditorRow
              key={editor.node_id}
              editor={editor}
              conclusion_title={
                props.conclusion_title_by_id.get(editor.node_id as NodeRef) ?? editor.node_id
              }
              current_value={props.direction_resolutions.get(editor.node_id as NodeRef)}
              onValueChanged={(d) => props.onResolutionChanged(editor.node_id as NodeRef, d)}
              available_positions={props.available_positions}
            />
          ))}
        </section>
      ) : null}
      {has_advisory ? (
        <section data-testid="scan-result-advisory">
          <h3
            className="mb-2 mt-4 flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--color-severity-warning)" }}
          >
            <Warning size={14} weight="fill" />
            Advisories ({props.advisory.length})
          </h3>
          <AdvisoryList advisory={props.advisory} />
        </section>
      ) : null}
    </div>
  );
}
