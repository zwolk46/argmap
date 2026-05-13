import type { ReactElement } from "react";
import type { NodeRef, ConclusionDirection, Position, ValidationResult } from "@/schema";
import type { ConclusionDirectionEditor } from "@/state";
import { ConclusionDirectionEditorRow } from "./conclusion-direction-editor";
import { AdvisoryList } from "./advisory-list";
import { SeverityIcon } from "../primitives/severity-icon";

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
        style={{
          color: "var(--color-status-satisfied)",
          background: "var(--color-status-satisfied-bg)",
          fontSize: "var(--font-size-sm)",
          padding: "var(--space-3) var(--space-4)",
          borderRadius: "var(--radius-md)",
          marginTop: "var(--space-3)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <SeverityIcon severity="pass" size={14} />
        No items to address — mode change ready to commit.
      </div>
    );
  }

  return (
    <div data-testid="scan-result-body" style={{ marginTop: "var(--space-3)" }}>
      {has_blocking ? (
        <section data-testid="scan-result-blocking">
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              margin: "var(--space-3) 0 var(--space-2)",
              color: "var(--color-severity-error)",
            }}
          >
            <SeverityIcon severity="error" size={14} />
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              margin: "var(--space-4) 0 var(--space-2)",
              color: "var(--color-severity-warning)",
            }}
          >
            <SeverityIcon severity="warning" size={14} />
            Advisories ({props.advisory.length})
          </h3>
          <AdvisoryList advisory={props.advisory} />
        </section>
      ) : null}
    </div>
  );
}
