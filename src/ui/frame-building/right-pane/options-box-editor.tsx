import type { ReactElement } from "react";
import type { Node, NodeType, SatisfactionPolicy } from "@/schema";
import { resolveEffectivePolicy, toModeFlavor } from "@/schema";
import type { SatisfactionPolicyKey } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
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
    return (
      <div
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-tertiary)",
        }}
      >
        Loading…
      </div>
    );
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <h3 className="argmap-section-heading">Satisfaction policy</h3>

      {/* Tier 1: Effective policy (read-only summary) */}
      <div
        style={{
          padding: "var(--space-1) var(--space-2)",
          background: "var(--color-surface-pane)",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-secondary)",
        }}
        title={`Effective: ${policyToString(effective)}`}
      >
        <span
          style={{
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-primary)",
          }}
        >
          Effective:{" "}
        </span>
        {policyToString(effective)}
      </div>

      {/* Tier 2: Source chip */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
        <span
          style={{
            padding: "2px var(--space-2)",
            background: "var(--color-surface-hover)",
            borderRadius: "var(--radius-pill)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          source: {source_label}
        </span>
      </div>

      {/* Tier 3: Edit surface */}
      {allows_per_instance ? (
        <>
          {/* KEEP RAW: pill-toggle for edit-mode selection (instance vs frame default), not the standard Button taxonomy. */}
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {(["instance", "frame_default"] as OptionsBoxEditMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => on_change_edit_mode(m)}
                style={{
                  padding: "3px 10px",
                  background: edit_mode === m ? "var(--color-accent)" : "transparent",
                  color:
                    edit_mode === m ? "var(--color-text-on-accent)" : "var(--color-text-secondary)",
                  border: "var(--border-hairline) solid var(--color-border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-xs)",
                }}
              >
                {m === "instance" ? "Edit this instance" : "Edit frame default"}
              </button>
            ))}
          </div>
          {edit_mode === "frame_default" && (
            <div
              data-testid="frame-default-edit-notice"
              role="note"
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
                padding: "2px var(--space-1)",
              }}
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
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-secondary)",
          }}
        >
          This node type uses the frame default. Edit it under Frame Settings → Default policies.
        </div>
      )}
    </div>
  );
}
