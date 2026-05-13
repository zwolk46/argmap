import type { FrameVersion, Node, NodeRef, EdgeType } from "@/schema";

export interface OutlineNode {
  node_id: NodeRef;
  node_type: Node["type"];
  primary_text: string;
  children: ReadonlyArray<OutlineNode>;
  initially_collapsed: boolean;
}

// Edge-type priority for the outline walk. Lower index = higher priority.
export const OUTLINE_EDGE_PRIORITY: ReadonlyArray<EdgeType | "checkpoint_option" | "gate_input"> = [
  "DECOMPOSES_INTO",
  "TURNS_ON",
  "INTERPRETED_AS",
  "LEADS_TO",
  "GATES",
  "checkpoint_option",
  "gate_input",
  "CITES",
  "FORECLOSES",
  "DISTINGUISHED_BY",
] as const;

const EDGE_PRIORITY_MAP: Record<string, number> = Object.fromEntries(
  OUTLINE_EDGE_PRIORITY.map((t, i) => [t, i]),
);

function priorityOf(t: string): number {
  return EDGE_PRIORITY_MAP[t] ?? OUTLINE_EDGE_PRIORITY.length;
}

function primaryText(node: Node): string {
  switch (node.type) {
    case "RootQuestion":
    case "SubQuestion":
      return (node as { statement?: string }).statement ?? "(no statement)";
    case "Term":
      return (node as { name?: string }).name ?? "(no name)";
    case "Interpretation":
      return (
        (node as { text?: string; statement?: string }).text ??
        (node as { statement?: string }).statement ??
        "(no text)"
      );
    case "Checkpoint":
      return (node as { question?: string }).question ?? "(no question)";
    case "LogicalGate": {
      const g = node as { gate_type?: string; inputs?: unknown[] };
      const n = g.inputs?.length ?? 0;
      return `${g.gate_type ?? "?"} gate (${n} input${n !== 1 ? "s" : ""})`;
    }
    case "Conclusion":
      return (node as { statement?: string }).statement ?? "(no statement)";
    case "Authority":
      return (node as { name?: string }).name ?? "(no name)";
    case "Premise":
      return (node as { statement?: string }).statement ?? "(no statement)";
    default:
      return (node as { id?: string }).id ?? "unknown";
  }
}

function isCollapsed(node: Node): boolean {
  const p = (node as { presentation?: { collapsed?: boolean } }).presentation;
  return p?.collapsed === true;
}

export function buildOutlineShape(frame_version: FrameVersion): OutlineNode | null {
  const root = frame_version.nodes.find((n) => n.type === "RootQuestion");
  if (!root) return null;

  const nodeById = new Map<string, Node>();
  for (const n of frame_version.nodes) nodeById.set(n.id, n);

  // Build adjacency: parent_id → sorted children descriptors
  interface ChildDesc {
    child_id: string;
    edge_priority: number;
    edge_id: string;
  }
  const adj = new Map<string, ChildDesc[]>();

  const addChild = (parent: string, child: string, etype: string, eid: string) => {
    const arr = adj.get(parent) ?? [];
    arr.push({ child_id: child, edge_priority: priorityOf(etype), edge_id: eid });
    adj.set(parent, arr);
  };

  for (const e of frame_version.edges) {
    if (
      e.type === "DECOMPOSES_INTO" ||
      e.type === "TURNS_ON" ||
      e.type === "INTERPRETED_AS" ||
      e.type === "LEADS_TO" ||
      e.type === "GATES"
    ) {
      addChild(e.source, e.target, e.type, e.id);
    }
  }

  // Checkpoint options as virtual children
  for (const n of frame_version.nodes) {
    if (n.type !== "Checkpoint") continue;
    const cp = n as { options?: Array<{ id: string; target_node_id?: string }> };
    if (!cp.options) continue;
    for (const opt of cp.options) {
      if (opt.target_node_id) {
        addChild(n.id, opt.target_node_id, "checkpoint_option", `opt:${opt.id}`);
      }
    }
  }

  // Gate inputs as virtual children
  for (const n of frame_version.nodes) {
    if (n.type !== "LogicalGate") continue;
    const g = n as {
      inputs?: NodeRef[];
      input?: NodeRef;
      antecedent?: NodeRef;
      consequent?: NodeRef;
      main?: NodeRef;
      exception?: NodeRef;
    };
    const refs: string[] = [];
    if (g.inputs) refs.push(...g.inputs);
    if (g.input) refs.push(g.input);
    if (g.antecedent) refs.push(g.antecedent);
    if (g.consequent) refs.push(g.consequent);
    if (g.main) refs.push(g.main);
    if (g.exception) refs.push(g.exception);
    for (const ref of refs) {
      addChild(n.id, ref, "gate_input", `gate_input:${n.id}:${ref}`);
    }
  }

  // Sort children: by edge_priority then edge_id for determinism
  for (const [, children] of adj) {
    children.sort((a, b) => {
      if (a.edge_priority !== b.edge_priority) return a.edge_priority - b.edge_priority;
      return a.edge_id.localeCompare(b.edge_id);
    });
  }

  // Walk BFS to build outline, tracking visited to avoid cycles
  const visited = new Set<string>();

  function buildNode(node_id: string): OutlineNode {
    visited.add(node_id);
    const node = nodeById.get(node_id);
    if (!node) {
      return {
        node_id,
        node_type: "RootQuestion",
        primary_text: `(missing node ${node_id})`,
        children: [],
        initially_collapsed: false,
      };
    }
    const rawChildren = adj.get(node_id) ?? [];
    const children: OutlineNode[] = [];
    for (const { child_id } of rawChildren) {
      if (!visited.has(child_id)) {
        children.push(buildNode(child_id));
      }
    }
    return {
      node_id,
      node_type: node.type,
      primary_text: primaryText(node),
      children,
      initially_collapsed: isCollapsed(node),
    };
  }

  return buildNode(root.id);
}
