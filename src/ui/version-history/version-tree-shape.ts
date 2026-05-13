import type { FrameVersionSummary, ArgumentSessionVersionSummary } from "@/state";

export type AnySummary = FrameVersionSummary | ArgumentSessionVersionSummary;

export interface VersionTreeDisplayEntry {
  summary: AnySummary;
  depth: number;
  has_branch_children: boolean;
  is_last_child_of_parent: boolean;
}

interface InternalNode {
  summary: AnySummary;
  children: InternalNode[];
}

function getParentId(s: AnySummary): string | undefined {
  return s.parent_version_id;
}

function buildAdjacency(summaries: ReadonlyArray<AnySummary>): {
  roots: InternalNode[];
  by_id: Map<string, InternalNode>;
} {
  const by_id = new Map<string, InternalNode>();
  for (const s of summaries) {
    by_id.set(s.id, { summary: s, children: [] });
  }
  const roots: InternalNode[] = [];
  for (const s of summaries) {
    const node = by_id.get(s.id)!;
    const parent_id = getParentId(s);
    if (parent_id && by_id.has(parent_id)) {
      by_id.get(parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Deterministic child ordering: version_number ascending, id tiebreak.
  const cmp = (a: InternalNode, b: InternalNode): number => {
    if (a.summary.version_number !== b.summary.version_number) {
      return a.summary.version_number - b.summary.version_number;
    }
    return a.summary.id < b.summary.id ? -1 : a.summary.id > b.summary.id ? 1 : 0;
  };
  for (const n of by_id.values()) n.children.sort(cmp);
  roots.sort(cmp);
  return { roots, by_id };
}

export function buildVersionTreeShape(
  summaries: ReadonlyArray<AnySummary>,
): ReadonlyArray<VersionTreeDisplayEntry> {
  const { roots } = buildAdjacency(summaries);
  const out: VersionTreeDisplayEntry[] = [];
  function dfs(node: InternalNode, depth: number, is_last_child: boolean): void {
    out.push({
      summary: node.summary,
      depth,
      has_branch_children: node.children.length > 0,
      is_last_child_of_parent: is_last_child,
    });
    for (let i = 0; i < node.children.length; i++) {
      dfs(node.children[i], depth + 1, i === node.children.length - 1);
    }
  }
  for (let i = 0; i < roots.length; i++) {
    dfs(roots[i], 0, i === roots.length - 1);
  }
  return out;
}

export function filterByMilestone(summaries: ReadonlyArray<AnySummary>): ReadonlyArray<AnySummary> {
  const by_id = new Map<string, AnySummary>();
  for (const s of summaries) by_id.set(s.id, s);

  function nearestRetainedAncestor(s: AnySummary): string | undefined {
    let cur_parent_id = s.parent_version_id;
    while (cur_parent_id) {
      const parent = by_id.get(cur_parent_id);
      if (!parent) return undefined;
      if (parent.is_milestone) return parent.id;
      cur_parent_id = parent.parent_version_id;
    }
    return undefined;
  }

  const out: AnySummary[] = [];
  for (const s of summaries) {
    if (!s.is_milestone) continue;
    const new_parent_id = nearestRetainedAncestor(s);
    if (new_parent_id === s.parent_version_id) {
      out.push(s);
    } else {
      // Rewrite parent_version_id to the nearest retained ancestor.
      out.push({ ...s, parent_version_id: new_parent_id } as AnySummary);
    }
  }
  return out;
}
