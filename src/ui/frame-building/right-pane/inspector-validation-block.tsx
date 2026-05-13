import type { ReactElement } from "react";
import type { NodeRef } from "@/schema";
import { useFrameStore } from "@/state";
import { selectValidationByNode } from "@/state";
import { SeverityIcon, humanizeValidationMessage } from "../../primitives";

export interface InspectorValidationBlockProps {
  node_id: NodeRef;
}

export function InspectorValidationBlock(
  props: InspectorValidationBlockProps,
): ReactElement | null {
  const { node_id } = props;
  const snapshot = useFrameStore((s) => s);
  const by_node = selectValidationByNode(snapshot);
  const results = by_node.get(node_id);
  const frame_version = snapshot.frame_version;

  if (!results || results.length === 0) return null;

  return (
    <div
      style={{
        marginTop: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <div
        className="argmap-section-heading"
        style={{
          textTransform: "uppercase",
        }}
      >
        Validation
      </div>
      {results.map((r, i) => {
        const tone =
          r.severity === "error"
            ? {
                fg: "var(--color-severity-error)",
                bg: "var(--color-severity-error-bg)",
                border: "var(--color-severity-error)",
              }
            : r.severity === "warning"
              ? {
                  fg: "var(--color-severity-warning)",
                  bg: "var(--color-severity-warning-bg)",
                  border: "var(--color-severity-warning)",
                }
              : {
                  fg: "var(--color-text-secondary)",
                  bg: "var(--color-surface-pane)",
                  border: "var(--color-border-subtle)",
                };
        return (
          <div
            key={`${r.rule_id}-${i}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              background: tone.bg,
              borderRadius: "var(--radius-md)",
              borderLeft: `var(--border-thick) solid ${tone.border}`,
              fontSize: "var(--font-size-sm)",
              lineHeight: "var(--line-height-snug)",
            }}
          >
            <SeverityIcon severity={r.severity} />
            <span style={{ color: "var(--color-text-primary)", flex: 1 }} title={r.rule_id}>
              {humanizeValidationMessage(r.message, frame_version)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
