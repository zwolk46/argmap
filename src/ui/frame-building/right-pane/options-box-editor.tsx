import type { ReactElement } from "react";
import type { Node, NodeType, SatisfactionPolicy } from "@/schema";
import { resolveEffectivePolicy, toModeFlavor } from "@/schema";
import type { SatisfactionPolicyKey } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { cn } from "#lib/utils";
import { humanizeConditionKind } from "../../primitives";
import { ConditionList } from "./condition-list";

export type OptionsBoxEditMode = "instance" | "frame_default";

export interface OptionsBoxEditorProps {
  node: Node;
  edit_mode: OptionsBoxEditMode;
  on_change_edit_mode: (next: OptionsBoxEditMode) => void;
}

const PER_INSTANCE_ALLOWED_TYPES: ReadonlySet<NodeType> = new Set([
  "Checkpoint",
  "RootQuestion",
  "SubQuestion",
  "Interpretation",
]);

function policyToString(policy: SatisfactionPolicy): string {
  const kinds = (policy.all_of ?? []).map((c) => humanizeConditionKind(c.kind));
  const label = kinds.join(", ") || "(empty)";
  if (policy.any_of && policy.any_of.length > 0) {
    return `${label} | any-of(${policy.any_of.map((c) => humanizeConditionKind(c.kind)).join(", ")})`;
  }
  return label;
}

export function OptionsBoxEditor(props: OptionsBoxEditorProps): ReactElement {
  const { node, edit_mode, on_change_edit_mode } = props;
  const frame = useFrameStore((s) => s.frame);
  const { frame_store } = useRepository();

  if (!frame) {
    return <div className="text-sm text-muted-foreground/80">Loading…</div>;
  }

  const node_type = node.type as SatisfactionPolicyKey;
  const per_instance = (node as { options_box?: SatisfactionPolicy }).options_box;
  const frame_default = (
    frame.default_satisfaction_policies as Record<string, SatisfactionPolicy | undefined>
  )[node_type];
  const effective = resolveEffectivePolicy(node_type, per_instance, frame_default);

  const source_label = per_instance
    ? "Per-instance override"
    : frame_default
      ? "Frame default"
      : "Library default";

  const mode_flavor = toModeFlavor(frame.mode, frame.flavor);

  const active_policy =
    edit_mode === "instance" ? (per_instance ?? effective) : (frame_default ?? effective);

  function handlePolicyChange(next: SatisfactionPolicy) {
    if (edit_mode === "instance") {
      frame_store.getState().applyPatch({
        kind: "options_box_edited",
        node_id: node.id,
        policy: next,
      });
    } else {
      frame_store.getState().applyPatch({
        kind: "default_policy_edited",
        node_type: node_type as SatisfactionPolicyKey,
        policy: next,
      });
    }
  }

  const allows_per_instance = PER_INSTANCE_ALLOWED_TYPES.has(node.type);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Satisfaction policy
      </h3>

      {/* Tier 1: Effective policy (read-only summary) */}
      <div
        className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
        title={`Effective: ${policyToString(effective)}`}
      >
        <span className="font-medium text-foreground">Effective: </span>
        {policyToString(effective)}
      </div>

      {/* Tier 2: Source chip */}
      <div className="flex items-center gap-1">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          source: {source_label}
        </span>
      </div>

      {/* Tier 3: Edit surface */}
      {allows_per_instance ? (
        <>
          {/* KEEP RAW: pill-toggle for edit-mode selection (instance vs frame default), not the standard Button taxonomy. */}
          <div className="flex gap-1">
            {(["instance", "frame_default"] as OptionsBoxEditMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => on_change_edit_mode(m)}
                className={cn(
                  "cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs",
                  edit_mode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                {m === "instance" ? "Edit this instance" : "Edit frame default"}
              </button>
            ))}
          </div>
          {edit_mode === "frame_default" && (
            <div
              data-testid="frame-default-edit-notice"
              role="note"
              className="px-1 py-0.5 text-xs text-muted-foreground"
            >
              Editing will create a frame-level override from the library default.
            </div>
          )}
          <ConditionList
            policy={active_policy}
            on_change={handlePolicyChange}
            mode_flavor={mode_flavor}
          />
        </>
      ) : (
        <div className="text-xs text-muted-foreground">
          This node type uses the frame default. Edit it under Frame Settings → Default policies.
        </div>
      )}
    </div>
  );
}
