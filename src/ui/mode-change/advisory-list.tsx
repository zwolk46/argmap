import type { ReactElement } from "react";
import type { NodeRef } from "@/schema";
import type { ValidationResult } from "@/schema";

export interface AdvisoryListProps {
  advisory: ValidationResult[];
  onNodeFocusRequested?: (node_id: NodeRef) => void;
}

// M14: rule_id values like "V-FR-3" or "V-ARG-7" are internal codes that don't
// communicate intent to the user. Map the ones used by mode-change scans to
// human-readable labels; fall back to a title-cased rendering of the rule_id
// if no entry is found.
const RULE_LABELS: Readonly<Record<string, string>> = {
  // Architectural mode-change advisories (Stream H).
  authority_visibility_loss: "Authorities may stop showing",
  authority_layer_drift: "Authority placement may change",
  premise_kind_cross_vocabulary: "Premise kinds outside the new mode's vocabulary",
  conclusion_direction_mismatch: "Conclusion directions need to be re-picked",
  jurisdiction_default_dropped: "Jurisdiction default no longer applies",
  // Validation rules surfaced as advisories in flavor changes.
  "V-FR-5": "Authority structure",
  "V-FR-6": "Authority/jurisdiction binding",
  "V-FR-7": "Conclusion direction",
  "V-ARG-3": "Premise vocabulary",
  "V-ARG-4": "Authority-citation binding",
};

function humanLabel(rule_id: string): string {
  const explicit = RULE_LABELS[rule_id];
  if (explicit) return explicit;
  // Fallback: split on _ or -, title-case each word.
  return rule_id
    .replace(/^V-(FR|ARG|NODE)-/, "")
    .split(/[-_]/)
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

export function AdvisoryList(props: AdvisoryListProps): ReactElement {
  // Group by rule_id, preserving first-occurrence order.
  const groups: Map<string, ValidationResult[]> = new Map();
  for (const a of props.advisory) {
    const arr = groups.get(a.rule_id) ?? [];
    arr.push(a);
    groups.set(a.rule_id, arr);
  }

  return (
    <div data-testid="advisory-list">
      {Array.from(groups.entries()).map(([rule_id, items]) => (
        <section key={rule_id} data-testid="advisory-group" data-rule-id={rule_id} className="mt-2">
          <header title={rule_id} className="text-xs font-medium text-muted-foreground">
            {humanLabel(rule_id)}
          </header>
          {items.map((v, i) => (
            <div
              key={`${rule_id}-${i}`}
              data-testid="advisory-row"
              className="flex items-center gap-2 py-1 text-sm text-muted-foreground"
            >
              <span>{v.message}</span>
              {/* KEEP RAW: pill-shaped node-id chip used to jump to a node; bespoke shape and size. */}
              {v.node_id ? (
                <button
                  type="button"
                  data-testid="advisory-node-pill"
                  onClick={
                    props.onNodeFocusRequested
                      ? () => props.onNodeFocusRequested!(v.node_id as NodeRef)
                      : undefined
                  }
                  disabled={!props.onNodeFocusRequested}
                  className="rounded-full border bg-background px-2 text-[10px] text-muted-foreground hover:bg-muted disabled:cursor-default"
                >
                  {v.node_id}
                </button>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
