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
              fontSize: "var(--font-size-xs, 11px)",
              color: "var(--color-text-secondary, #6b7280)",
              fontWeight: 500,
              marginTop: "var(--space-2, 8px)",
            }}
          >
            {rule_id}
          </header>
          {items.map((v, i) => (
            <div
              key={`${rule_id}-${i}`}
              data-testid="advisory-row"
              style={{
                color: "var(--color-text-tertiary, #9ca3af)",
                fontSize: "var(--font-size-sm, 13px)",
                padding: "var(--space-1, 4px) 0",
              }}
            >
              <span>{v.message}</span>
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
                    marginLeft: "var(--space-2, 8px)",
                    fontSize: "var(--font-size-2xs, 10px)",
                    background: "transparent",
                    border: "var(--border-thin, 1px) solid var(--color-border-default, #e5e7eb)",
                    borderRadius: "var(--radius-pill, 9999px)",
                    padding: "0 var(--space-2, 8px)",
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
