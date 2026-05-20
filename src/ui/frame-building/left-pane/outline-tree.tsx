import * as React from "react";
import type { ReactElement } from "react";
import { useFrameStore } from "@/state";
import { buildOutlineShape } from "./outline-tree-shape";
import type { OutlineNode } from "./outline-tree-shape";
import { OutlineTreeRow } from "./outline-tree-row";
import type { InspectorSelection } from "../right-pane/inspector";

export interface OutlineTreeProps {
  selection: InspectorSelection;
  on_selection_change: (next: InspectorSelection) => void;
}

interface FlatRow {
  outline_node: OutlineNode;
  depth: number;
  parent_id: string | null;
}

function flatten(
  node: OutlineNode,
  depth: number,
  expanded_set: Set<string>,
  out: FlatRow[],
  parent_id: string | null,
) {
  out.push({ outline_node: node, depth, parent_id });
  if (expanded_set.has(node.node_id) && node.children.length > 0) {
    for (const child of node.children) {
      flatten(child, depth + 1, expanded_set, out, node.node_id);
    }
  }
}

function seedExpanded(root: OutlineNode | null): Set<string> {
  if (!root) return new Set();
  const exp = new Set<string>();
  (function seed(node: OutlineNode) {
    if (!node.initially_collapsed) exp.add(node.node_id);
    for (const c of node.children) seed(c);
  })(root);
  return exp;
}

export function OutlineTree(props: OutlineTreeProps): ReactElement {
  const { selection, on_selection_change } = props;
  const frame_version = useFrameStore((s) => s.frame_version);

  const root = React.useMemo(
    () => (frame_version ? buildOutlineShape(frame_version) : null),
    [frame_version],
  );

  // Seed expanded state: expand all by default unless initially_collapsed
  const [expanded, set_expanded] = React.useState<Set<string>>(() => seedExpanded(root));

  const [focused_id, set_focused_id] = React.useState<string | null>(null);

  // P0-5: when the user switches frames, the previous frame's expansion set
  // is stale — its node ids don't exist in the new outline. Re-seed from
  // the new root and clear focus so the tree opens in a predictable state.
  const frame_id = frame_version?.frame_id;
  React.useEffect(() => {
    set_expanded(seedExpanded(root));
    set_focused_id(null);
    // root is the outline derived from the current frame_version; using
    // frame_id as a discriminator means we don't re-seed on every save of
    // the same frame (which would clobber the user's expand/collapse state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame_id]);

  const rows = React.useMemo<FlatRow[]>(() => {
    if (!root) return [];
    const out: FlatRow[] = [];
    flatten(root, 0, expanded, out, null);
    return out;
  }, [root, expanded]);

  const selected_id = selection.kind === "node" ? selection.node_id : null;

  function toggle(node_id: string) {
    set_expanded((prev) => {
      const next = new Set(prev);
      if (next.has(node_id)) next.delete(node_id);
      else next.add(node_id);
      return next;
    });
  }

  function handleSelect(node_id: string, e: React.MouseEvent) {
    if (e.shiftKey && selection.kind === "node" && selection.node_id !== node_id) {
      on_selection_change({
        kind: "multi",
        node_ids: [selection.node_id, node_id],
        edge_ids: [],
      });
    } else if (e.shiftKey && selection.kind === "multi") {
      const existing = selection.node_ids;
      const already = existing.includes(node_id);
      const next = already ? existing.filter((id) => id !== node_id) : [...existing, node_id];
      on_selection_change(
        next.length === 0
          ? { kind: "empty" }
          : next.length === 1
            ? { kind: "node", node_id: next[0] }
            : { kind: "multi", node_ids: next, edge_ids: selection.edge_ids },
      );
    } else {
      on_selection_change({ kind: "node", node_id });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const idx = rows.findIndex((r) => r.outline_node.node_id === focused_id);
    const current = rows[idx];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = rows[idx + 1];
      if (next) set_focused_id(next.outline_node.node_id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = rows[idx - 1];
      if (prev) set_focused_id(prev.outline_node.node_id);
    } else if (e.key === "Home") {
      e.preventDefault();
      if (rows[0]) set_focused_id(rows[0].outline_node.node_id);
    } else if (e.key === "End") {
      e.preventDefault();
      const last = rows[rows.length - 1];
      if (last) set_focused_id(last.outline_node.node_id);
    } else if (e.key === "ArrowRight") {
      // WAI-ARIA tree pattern: Right expands (or moves to first child if
      // already expanded); for our simpler tree we just expand.
      if (
        current &&
        current.outline_node.children.length > 0 &&
        !expanded.has(current.outline_node.node_id)
      ) {
        e.preventDefault();
        toggle(current.outline_node.node_id);
      }
    } else if (e.key === "ArrowLeft") {
      // Left collapses (or moves to parent if already collapsed); we just
      // collapse here. Parents are reachable via ArrowUp.
      if (
        current &&
        current.outline_node.children.length > 0 &&
        expanded.has(current.outline_node.node_id)
      ) {
        e.preventDefault();
        toggle(current.outline_node.node_id);
      }
    }
  }

  if (!root) {
    return <div className="p-4 text-sm text-muted-foreground">No frame loaded.</div>;
  }

  // Empty-outline state. Without this the OutlineTree silently rendered
  // nothing for a freshly-created frame; the left pane felt blank.
  if (rows.length === 0) {
    return (
      <div
        data-testid="outline-empty"
        className="px-3 py-4 text-xs leading-relaxed text-muted-foreground/80"
      >
        Outline appears here once nodes exist. Add a Root Question from the palette above.
      </div>
    );
  }

  return (
    <div role="tree" aria-label="Frame outline" onKeyDown={handleKeyDown} className="outline-none">
      {rows.map(({ outline_node, depth }) => (
        <OutlineTreeRow
          key={outline_node.node_id}
          outline_node={outline_node}
          depth={depth}
          selected={selected_id === outline_node.node_id}
          focused={focused_id === outline_node.node_id}
          expanded={expanded.has(outline_node.node_id)}
          has_children={outline_node.children.length > 0}
          on_select={(modifiers) =>
            handleSelect(outline_node.node_id, {
              shiftKey: modifiers.shift_key,
              metaKey: modifiers.meta_key,
              ctrlKey: modifiers.meta_key,
            } as React.MouseEvent)
          }
          on_toggle_expanded={() => toggle(outline_node.node_id)}
          on_focus={() => set_focused_id(outline_node.node_id)}
        />
      ))}
    </div>
  );
}
