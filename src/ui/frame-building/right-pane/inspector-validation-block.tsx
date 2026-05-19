import { useMemo, type ReactElement } from "react";
import type { NodeRef, ValidationResult } from "@/schema";
import { VALIDATION_RULE_DESCRIPTIONS } from "@/schema";
import { useFrameStore } from "@/state";
import { SeverityIcon, humanizeValidationMessage } from "../../primitives";

export interface InspectorValidationBlockProps {
  node_id: NodeRef;
}

export function InspectorValidationBlock(
  props: InspectorValidationBlockProps,
): ReactElement | null {
  const { node_id } = props;
  // Subscribe via narrow selectors — `useFrameStore((s) => s)` re-renders
  // on every patch (drag, edit) including ones that don't touch validation
  // or the frame version, which is the anti-pattern frame-building-page
  // explicitly avoids.
  const validation = useFrameStore((s) => s.validation);
  const frame_version = useFrameStore((s) => s.frame_version);
  const results = useMemo(() => {
    const out: ValidationResult[] = [];
    for (const r of validation) {
      if (r.node_id === node_id) out.push(r);
    }
    return out;
  }, [validation, node_id]);

  if (results.length === 0) return null;

  return (
    <div
      style={{
        marginTop: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
    >
      <h3 className="argmap-section-heading">Validation</h3>
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
            <span
              style={{ color: "var(--color-text-primary)", flex: 1 }}
              title={VALIDATION_RULE_DESCRIPTIONS[r.rule_id] ?? r.rule_id}
            >
              {humanizeValidationMessage(r.message, frame_version)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
