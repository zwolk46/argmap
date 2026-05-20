import { useMemo, type ReactElement } from "react";
import type { NodeRef, ValidationResult } from "@/schema";
import { VALIDATION_RULE_DESCRIPTIONS } from "@/schema";
import { useFrameStore } from "@/state";
import { SeverityIcon, humanizeValidationMessage } from "../../primitives";
import { cn } from "#lib/utils";

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
    <div className="mt-4 flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Validation
      </h3>
      {results.map((r, i) => {
        const toneClasses =
          r.severity === "error"
            ? "border-l-4 border-destructive bg-destructive/10 text-foreground"
            : r.severity === "warning"
              ? "border-l-4 border-amber-500 bg-amber-50 text-foreground dark:bg-amber-950/30"
              : "border-l-4 border-border bg-muted text-foreground";
        return (
          <div
            key={`${r.rule_id}-${i}`}
            className={cn(
              "flex items-start gap-2 rounded-md py-2 pl-3 pr-3 text-sm leading-snug",
              toneClasses,
            )}
          >
            <SeverityIcon severity={r.severity} />
            <span
              className="flex-1 text-foreground"
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
