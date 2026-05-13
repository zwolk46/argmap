import type { ReactElement } from "react";
import type { NodeRef } from "@/schema";
import { useFrameStore } from "@/state";
import { selectValidationByNode } from "@/state";
import { SeverityIcon } from "../../primitives";

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

  if (!results || results.length === 0) return null;

  return (
    <div
      style={{
        marginTop: "var(--space-3, 12px)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1, 4px)",
      }}
    >
      <div
        style={{
          textTransform: "uppercase",
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
          letterSpacing: "0.05em",
        }}
      >
        Validation
      </div>
      {results.map((r, i) => (
        <div
          key={`${r.rule_id}-${i}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-2, 8px)",
            padding: "var(--space-2, 8px)",
            background: "var(--color-surface-pane, #f9fafb)",
            borderRadius: "var(--radius-sm, 4px)",
            fontSize: "var(--font-size-sm, 13px)",
          }}
        >
          <SeverityIcon severity={r.severity} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-tertiary, #9ca3af)",
              flexShrink: 0,
            }}
          >
            {r.rule_id}
          </span>
          <span style={{ color: "var(--color-text-primary, #111827)" }}>{r.message}</span>
        </div>
      ))}
    </div>
  );
}
