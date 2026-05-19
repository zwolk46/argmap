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
        <section key={rule_id} data-testid="advisory-group" data-rule-id={rule_id}>
          <header
            title={rule_id}
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
              fontWeight: "var(--font-weight-medium)",
              marginTop: "var(--space-2)",
            }}
          >
            {humanLabel(rule_id)}
          </header>
          {items.map((v, i) => (
            <div
              key={`${rule_id}-${i}`}
              data-testid="advisory-row"
              style={{
                color: "var(--color-text-tertiary)",
                fontSize: "var(--font-size-sm)",
                padding: "var(--space-1) 0",
              }}
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
                  style={{
                    marginLeft: "var(--space-2)",
                    fontSize: "var(--font-size-2xs)",
                    background: "transparent",
                    border: "var(--border-thin) solid var(--color-border-default)",
                    borderRadius: "var(--radius-pill)",
                    padding: "0 var(--space-2)",
                    cursor: props.onNodeFocusRequested ? "pointer" : "default",
                  }}
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
