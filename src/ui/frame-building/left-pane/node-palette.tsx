import * as React from "react";
import type { ReactElement } from "react";
import type { NodeType, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { PaletteItem } from "./palette-item";

/**
 * Pure helper. Produces a fully-stamped Node from a NodeType, separated for
 * testing and for callers that need to build defaults outside the palette
 * component. Caller supplies `generateId` and `now` so determinism is preserved
 * end-to-end (Constitution Article II § 2). The returned Node always carries
 * `layer`, `created_at`, `updated_at`, and every type-specific required field.
 */
export function buildNodeDefaults(
  node_type: NodeType,
  generateId: () => string,
  now: string,
): Node {
  const id = generateId();
  const base = {
    id,
    type: node_type,
    layer: "frame" as const,
    notes: "",
    created_at: now,
    updated_at: now,
  };
  switch (node_type) {
    case "RootQuestion":
      return { ...base, type: "RootQuestion", layer: "frame", statement: "" } as Node;
    case "SubQuestion":
      return {
        ...base,
        type: "SubQuestion",
        layer: "frame",
        statement: "",
        is_jurisdictional: false,
      } as Node;
    case "Term":
      return {
        ...base,
        type: "Term",
        layer: "frame",
        name: "",
        order: 0,
        dispositive: false,
      } as Node;
    case "Interpretation":
      return { ...base, type: "Interpretation", layer: "frame", statement: "" } as Node;
    case "Checkpoint":
      return {
        ...base,
        type: "Checkpoint",
        layer: "frame",
        question: "",
        answer_type: "boolean",
        options: [
          { id: `${id}-yes`, label: "Yes", satisfies: true, target_node_id: undefined },
          { id: `${id}-no`, label: "No", satisfies: false, target_node_id: undefined },
        ],
        requires_premise: false,
        requires_authority: false,
      } as Node;
    case "LogicalGate":
      return {
        ...base,
        type: "LogicalGate",
        layer: "frame",
        gate_type: "AND",
        inputs: [],
      } as Node;
    case "Conclusion":
      return {
        ...base,
        type: "Conclusion",
        layer: "frame",
        statement: "",
        direction: { kind: "legal", value: "affirm" },
        tags: [],
      } as Node;
    case "Authority":
      return { ...base, type: "Authority", layer: "frame", citation: "" } as Node;
    case "Premise":
      // Premise is an argument-layer node; not surfaced via the palette in
      // frame building, but we keep the branch defined for completeness.
      return {
        ...base,
        type: "Premise",
        layer: "argument",
        statement: "",
        kind: "stipulated",
      } as Node;
  }
}

export interface NodePaletteProps {
  visible_types_override?: ReadonlyArray<NodeType>;
}

const ALL_FRAME_NODE_TYPES: NodeType[] = [
  "RootQuestion",
  "SubQuestion",
  "Term",
  "Interpretation",
  "Checkpoint",
  "LogicalGate",
  "Conclusion",
  "Authority",
];

export function visibleNodeTypesForPalette(
  mode: "legal" | "general",
  flavor: "personal" | "academic" | undefined,
  authority_enabled_in_personal: boolean,
  _has_root_question: boolean,
): ReadonlyArray<NodeType> {
  const types: NodeType[] = [];
  for (const t of ALL_FRAME_NODE_TYPES) {
    if (t === "Authority") {
      if (mode === "legal") {
        types.push(t);
      } else if (flavor === "academic") {
        types.push(t);
      } else if (flavor === "personal" && authority_enabled_in_personal) {
        types.push(t);
      }
    } else {
      types.push(t);
    }
  }
  return types;
}

export function NodePalette(props: NodePaletteProps): ReactElement {
  const { visible_types_override } = props;
  const frame = useFrameStore((s) => s.frame);
  const frame_version = useFrameStore((s) => s.frame_version);
  const { frame_store, generateId, now } = useRepository();

  const mode = frame?.mode ?? "general";
  const flavor = frame?.flavor;
  const authority_in_personal = !!(frame as { authority_enabled_in_personal?: boolean } | null)
    ?.authority_enabled_in_personal;

  const has_root_question = frame_version?.nodes.some((n) => n.type === "RootQuestion") ?? false;

  const visible = visible_types_override
    ? visible_types_override
    : visibleNodeTypesForPalette(mode, flavor, authority_in_personal, has_root_question);

  function handleClick(node_type: NodeType) {
    if (!frame_version) return;
    const defaults = buildNodeDefaults(node_type, generateId, now());
    frame_store.getState().applyPatch({ kind: "node_added", node: defaults });
  }

  function handleDragStart(node_type: NodeType) {
    return (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.setData(
        "application/argmap-palette-node",
        JSON.stringify({ kind: "palette_node_type", node_type }),
      );
      e.dataTransfer.effectAllowed = "copy";
    };
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-2, 8px) 0",
      }}
      aria-label="Node palette"
    >
      {visible.map((node_type) => {
        const is_root_disabled = node_type === "RootQuestion" && has_root_question;
        return (
          <PaletteItem
            key={node_type}
            node_type={node_type}
            disabled={is_root_disabled}
            disabled_reason={
              is_root_disabled ? "A frame can have only one Root Question (V-FR-1)." : undefined
            }
            on_click={() => handleClick(node_type)}
            on_drag_start={handleDragStart(node_type)}
          />
        );
      })}
    </div>
  );
}
