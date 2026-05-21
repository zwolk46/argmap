import { useState, type ReactElement } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import type { SatisfactionPolicy } from "@/schema";
import { DEFAULT_SATISFACTION_POLICIES, resolveEffectivePolicy, toModeFlavor } from "@/schema";
import type { SatisfactionPolicyKey } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { Button } from "#components/ui/button";
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
    <div className="overflow-hidden rounded-md border border-border">
      {/* KEEP RAW: accordion-header button with bespoke layout (full-width row, two ends), not the standard Button taxonomy. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center justify-between bg-muted px-3 py-2 text-left hover:bg-muted/80"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {node_type}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground/80">
          {frame_default ? "custom" : "library default"}
          {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </span>
      </button>

      {expanded && (
        <div className="bg-card p-3">
          <ConditionList
            policy={frame_default ?? effective}
            on_change={handleChange}
            mode_flavor={mode_flavor}
          />
          {frame_default && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChange(DEFAULT_SATISFACTION_POLICIES[node_type])}
              className="mt-2"
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
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Default satisfaction policies
      </h3>
      <p className="m-0 text-xs text-muted-foreground/80">
        These apply to all new nodes of each type in this frame unless overridden per-instance.
      </p>
      {POLICY_NODE_TYPES.map((nt) => (
        <NodeTypeDefaultEditor key={nt} node_type={nt} />
      ))}
    </div>
  );
}
