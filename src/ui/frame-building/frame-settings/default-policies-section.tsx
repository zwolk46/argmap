import { useState, type ReactElement } from "react";
import type { SatisfactionPolicy } from "@/schema";
import { DEFAULT_SATISFACTION_POLICIES, resolveEffectivePolicy, toModeFlavor } from "@/schema";
import type { SatisfactionPolicyKey } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "../../primitives";
import { ConditionList } from "../right-pane/condition-list";

const POLICY_NODE_TYPES: SatisfactionPolicyKey[] = [
  "Checkpoint",
  "Interpretation",
  "Term",
  "SubQuestion",
  "RootQuestion",
  "Conclusion",
  "LogicalGate",
];

function NodeTypeDefaultEditor({ node_type }: { node_type: SatisfactionPolicyKey }): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const frame = useFrameStore((s) => s.frame);
  const { frame_store } = useRepository();

  if (!frame) return <></>;

  const frame_default = (
    frame.default_satisfaction_policies as Record<string, SatisfactionPolicy | undefined>
  )[node_type];
  const effective = resolveEffectivePolicy(node_type, undefined, frame_default);
  const mode_flavor = toModeFlavor(frame.mode, frame.flavor);

  function handleChange(next: SatisfactionPolicy) {
    frame_store.getState().applyPatch({
      kind: "default_policy_edited",
      node_type,
      policy: next,
    });
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border-subtle, #f3f4f6)",
        borderRadius: "var(--radius-sm, 4px)",
        overflow: "hidden",
      }}
    >
      {/* KEEP RAW: accordion-header button with bespoke layout (full-width row, two ends), not the standard Button taxonomy. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          padding: "var(--space-2, 8px) var(--space-3, 12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--color-surface-pane, #f9fafb)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span className="argmap-section-heading">{node_type}</span>
        <span
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-tertiary, #9ca3af)",
          }}
        >
          {frame_default ? "custom" : "library default"} {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div
          style={{
            padding: "var(--space-3, 12px)",
            background: "var(--color-surface-elevated, #fff)",
          }}
        >
          <ConditionList
            policy={frame_default ?? effective}
            on_change={handleChange}
            mode_flavor={mode_flavor}
          />
          {frame_default && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleChange(DEFAULT_SATISFACTION_POLICIES[node_type])}
              style={{ marginTop: "var(--space-2, 8px)" }}
            >
              Reset to library default
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function DefaultPoliciesSection(): ReactElement | null {
  const frame = useFrameStore((s) => s.frame);

  if (!frame) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2, 8px)" }}>
      <h3 className="argmap-section-heading">Default satisfaction policies</h3>
      <p
        style={{
          margin: 0,
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-tertiary, #9ca3af)",
        }}
      >
        These apply to all new nodes of each type in this frame unless overridden per-instance.
      </p>
      {POLICY_NODE_TYPES.map((nt) => (
        <NodeTypeDefaultEditor key={nt} node_type={nt} />
      ))}
    </div>
  );
}
