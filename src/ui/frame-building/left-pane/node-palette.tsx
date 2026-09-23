import * as React from "react";
import type { ReactElement } from "react";
import type { NodeType, Node } from "@/schema";
import { useFrameStore, useRepository } from "@/state";
import { PaletteItem } from "./palette-item";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "#components/ui/sidebar";

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
  /**
   * §13 #5 — fired immediately after the palette places a new node into the
   * frame. The parent can use the node id to update its selection state and
   * focus the new node on the canvas so keyboard users can immediately move
   * it with React Flow's built-in arrow-key positioning. Without this hook,
   * a palette-click drops the new node at a staggered grid position with no
   * selection and no focus indicator — invisible to keyboard users.
   */
  on_node_created?: (node_id: string) => void;
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
  const { visible_types_override, on_node_created } = props;
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

    // Compute the viewport center in flow coordinates so that new nodes spawn
    // near the center of whatever the user is currently looking at, even after
    // panning or zooming.
    //
    // NodePalette is a sibling of FrameCanvas in ThreePaneLayout, NOT a
    // descendant of ReactFlowProvider (which lives inside FrameCanvas). That
    // makes useReactFlow() unavailable here — it would throw. Instead we read
    // the ".react-flow__viewport" DOM element, which React Flow keeps updated
    // with a CSS transform of the form "matrix(zoom,0,0,zoom,tx,ty)".
    // Inverting that matrix gives us the flow-coordinate origin, and we add
    // half the container's client dimensions to get the center.
    //
    // Fall-back: if the element is not in the DOM yet (e.g. first render before
    // the canvas mounts), we use the old fixed-grid origin (200, 100).
    let center_x = 200;
    let center_y = 100;
    const viewport_el = document.querySelector<HTMLElement>(".react-flow__viewport");
    const container_el = document.querySelector<HTMLElement>(".react-flow");
    if (viewport_el && container_el) {
      const style = window.getComputedStyle(viewport_el);
      const matrix = new DOMMatrixReadOnly(style.transform);
      // matrix.a === zoom (scale), matrix.e === tx, matrix.f === ty
      const zoom = matrix.a || 1;
      const tx = matrix.e;
      const ty = matrix.f;
      const rect = container_el.getBoundingClientRect();
      // Convert screen center of the container to flow coordinates:
      // flow_x = (screen_x - tx) / zoom
      center_x = (rect.width / 2 - tx) / zoom;
      center_y = (rect.height / 2 - ty) / zoom;
    }

    // Add small stagger so multiple palette clicks don't pile up on the same
    // spot. Keep the same 3-column × 40px grid as before, but now offset from
    // the live viewport center rather than a fixed canvas origin.
    const existing_count = frame_version.nodes.length;
    const stagger_x = (existing_count % 3) * 40 - 40;
    const stagger_y = Math.floor(existing_count / 3) * 40;

    const positioned: Node = {
      ...defaults,
      presentation: {
        ...(defaults.presentation ?? {}),
        x: center_x + stagger_x,
        y: center_y + stagger_y,
      },
    } as Node;
    frame_store.getState().applyPatch({ kind: "node_added", node: positioned });
    on_node_created?.(positioned.id);
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
    <SidebarGroup aria-label="Node palette">
      <SidebarGroupLabel>Palette</SidebarGroupLabel>
      <SidebarMenu>
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
      </SidebarMenu>
    </SidebarGroup>
  );
}
