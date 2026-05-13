import * as React from "react";
import type { ReactElement } from "react";
import type { NodeType, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { PaletteItem } from "./palette-item";

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
  const { frame_store } = useRepository();

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
    const generateId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
    const id = generateId();
    const defaults = buildNodeDefaults(node_type, id);
    frame_store.getState().applyPatch({ kind: "node_added", node: defaults as unknown as Node });
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

function buildNodeDefaults(node_type: NodeType, id: string) {
  const base = { id, type: node_type, notes: "" };
  switch (node_type) {
    case "RootQuestion":
    case "SubQuestion":
      return { ...base, statement: "" };
    case "Term":
      return { ...base, name: "", order: 0, dispositive: false };
    case "Interpretation":
      return { ...base, text: "" };
    case "Checkpoint":
      return {
        ...base,
        question: "",
        answer_type: "boolean" as const,
        options: [
          { id: `${id}-yes`, label: "Yes", satisfies: true, target_node_id: undefined },
          { id: `${id}-no`, label: "No", satisfies: false, target_node_id: undefined },
        ],
      };
    case "LogicalGate":
      return { ...base, gate_type: "AND" as const, inputs: [] };
    case "Conclusion":
      return {
        ...base,
        statement: "",
        direction: { kind: "legal" as const, value: "affirm" as const },
        tags: [],
      };
    case "Authority":
      return { ...base, name: "", citation: "" };
    default:
      return base;
  }
}
