import type { ReactElement } from "react";
import type { NodeRef } from "@/schema";
import type { ValidationResult } from "@/schema";

export interface AdvisoryListProps {
  advisory: ValidationResult[];
  onNodeFocusRequested?: (node_id: NodeRef) => void;
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
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
              fontWeight: "var(--font-weight-medium)",
              marginTop: "var(--space-2)",
            }}
          >
            {rule_id}
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
