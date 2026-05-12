import {
  type FrameVersion,
  type ArgumentSessionVersion,
  type NodeRef,
  type EdgeRef,
} from "@/schema";
import {
  type StructuralDiff,
  type SessionStructuralDiff,
  type NodeEditEntry,
  type EdgeEditEntry,
  type MetadataChange,
  type PremiseEditEntry,
  type ArgumentEdgeEditEntry,
  type CheckpointResponseEditEntry,
  type AuthorityEditEntry,
  type InterpretationSelectionEditEntry,
  LAYOUT_ONLY_FIELDS,
} from "./repository";

export function diffFrameVersions(a: FrameVersion, b: FrameVersion): StructuralDiff {
  const nodes_a = new Map(a.nodes.map((n) => [n.id, n]));
  const nodes_b = new Map(b.nodes.map((n) => [n.id, n]));
  const edges_a = new Map(a.edges.map((e) => [e.id, e]));
  const edges_b = new Map(b.edges.map((e) => [e.id, e]));

  const node_added: NodeRef[] = [];
  const node_removed: NodeRef[] = [];
  const node_edited: NodeEditEntry[] = [];
  let layout_changed_count = 0;
  for (const [id, after] of nodes_b) {
    const before = nodes_a.get(id);
    if (!before) {
      node_added.push(id);
      continue;
    }
    const all_changes = diffFields(before, after);
    if (all_changes.length === 0) continue;
    const non_layout = all_changes.filter((f) => !LAYOUT_ONLY_FIELDS.includes(f as never));
    if (non_layout.length === 0) {
      layout_changed_count++;
    } else {
      node_edited.push({ id, fields_changed: non_layout });
    }
  }
  for (const id of nodes_a.keys()) {
    if (!nodes_b.has(id)) node_removed.push(id);
  }

  const edge_added: EdgeRef[] = [];
  const edge_removed: EdgeRef[] = [];
  const edge_edited: EdgeEditEntry[] = [];
  for (const [id, after] of edges_b) {
    const before = edges_a.get(id);
    if (!before) {
      edge_added.push(id);
      continue;
    }
    const changes = diffFields(before, after);
    if (changes.length > 0) edge_edited.push({ id, fields_changed: changes });
  }
  for (const id of edges_a.keys()) {
    if (!edges_b.has(id)) edge_removed.push(id);
  }

  const metadata_changed = diffFrameVersionMetadata(a, b);

  const layout_only =
    node_added.length === 0 &&
    node_removed.length === 0 &&
    node_edited.length === 0 &&
    edge_added.length === 0 &&
    edge_removed.length === 0 &&
    edge_edited.length === 0 &&
    metadata_changed.length === 0 &&
    layout_changed_count > 0;

  return {
    nodes: {
      added: node_added.sort(),
      removed: node_removed.sort(),
      edited: node_edited.sort((x, y) => x.id.localeCompare(y.id)),
    },
    edges: {
      added: edge_added.sort(),
      removed: edge_removed.sort(),
      edited: edge_edited.sort((x, y) => x.id.localeCompare(y.id)),
    },
    metadata: { changed_fields: metadata_changed },
    layout_only,
    layout_changed_count,
  };
}

export function diffSessionVersions(
  a: ArgumentSessionVersion,
  b: ArgumentSessionVersion,
): SessionStructuralDiff {
  // premises keyed by id
  const premises_a = new Map((a.premises ?? []).map((p) => [p.id, p]));
  const premises_b = new Map((b.premises ?? []).map((p) => [p.id, p]));
  const premises_added: NodeRef[] = [];
  const premises_removed: NodeRef[] = [];
  const premises_edited: PremiseEditEntry[] = [];
  for (const [id, after] of premises_b) {
    const before = premises_a.get(id);
    if (!before) {
      premises_added.push(id);
      continue;
    }
    const changes = diffFields(before, after);
    if (changes.length > 0) premises_edited.push({ id, fields_changed: changes });
  }
  for (const id of premises_a.keys()) {
    if (!premises_b.has(id)) premises_removed.push(id);
  }

  // argument_edges keyed by id
  const arg_edges_a = new Map((a.argument_edges ?? []).map((e) => [e.id, e]));
  const arg_edges_b = new Map((b.argument_edges ?? []).map((e) => [e.id, e]));
  const arg_edges_added: EdgeRef[] = [];
  const arg_edges_removed: EdgeRef[] = [];
  const arg_edges_edited: ArgumentEdgeEditEntry[] = [];
  for (const [id, after] of arg_edges_b) {
    const before = arg_edges_a.get(id);
    if (!before) {
      arg_edges_added.push(id);
      continue;
    }
    const changes = diffFields(before, after);
    if (changes.length > 0) arg_edges_edited.push({ id, fields_changed: changes });
  }
  for (const id of arg_edges_a.keys()) {
    if (!arg_edges_b.has(id)) arg_edges_removed.push(id);
  }

  // checkpoint_responses keyed by checkpoint_id
  const cr_a = new Map((a.checkpoint_responses ?? []).map((r) => [r.checkpoint_id, r]));
  const cr_b = new Map((b.checkpoint_responses ?? []).map((r) => [r.checkpoint_id, r]));
  const cr_added: NodeRef[] = [];
  const cr_removed: NodeRef[] = [];
  const cr_edited: CheckpointResponseEditEntry[] = [];
  for (const [checkpoint_id, after] of cr_b) {
    const before = cr_a.get(checkpoint_id);
    if (!before) {
      cr_added.push(checkpoint_id);
      continue;
    }
    const changes = diffFields(before, after);
    if (changes.length > 0) cr_edited.push({ checkpoint_id, fields_changed: changes });
  }
  for (const checkpoint_id of cr_a.keys()) {
    if (!cr_b.has(checkpoint_id)) cr_removed.push(checkpoint_id);
  }

  // session_authorities keyed by id
  const sa_a = new Map((a.session_authorities ?? []).map((auth) => [auth.id, auth]));
  const sa_b = new Map((b.session_authorities ?? []).map((auth) => [auth.id, auth]));
  const sa_added: NodeRef[] = [];
  const sa_removed: NodeRef[] = [];
  const sa_edited: AuthorityEditEntry[] = [];
  for (const [id, after] of sa_b) {
    const before = sa_a.get(id);
    if (!before) {
      sa_added.push(id);
      continue;
    }
    const changes = diffFields(before, after);
    if (changes.length > 0) sa_edited.push({ id, fields_changed: changes });
  }
  for (const id of sa_a.keys()) {
    if (!sa_b.has(id)) sa_removed.push(id);
  }

  // interpretation_selections keyed by term_id
  const is_a = new Map((a.interpretation_selections ?? []).map((s) => [s.term_id, s]));
  const is_b = new Map((b.interpretation_selections ?? []).map((s) => [s.term_id, s]));
  const is_added: NodeRef[] = [];
  const is_removed: NodeRef[] = [];
  const is_edited: InterpretationSelectionEditEntry[] = [];
  for (const [term_id, after] of is_b) {
    const before = is_a.get(term_id);
    if (!before) {
      is_added.push(term_id);
      continue;
    }
    const changes = diffFields(before, after);
    if (changes.length > 0) is_edited.push({ term_id, fields_changed: changes });
  }
  for (const term_id of is_a.keys()) {
    if (!is_b.has(term_id)) is_removed.push(term_id);
  }

  const metadata_changed = diffSessionVersionMetadata(a, b);

  return {
    premises: {
      added: premises_added.sort(),
      removed: premises_removed.sort(),
      edited: premises_edited.sort((x, y) => x.id.localeCompare(y.id)),
    },
    argument_edges: {
      added: arg_edges_added.sort(),
      removed: arg_edges_removed.sort(),
      edited: arg_edges_edited.sort((x, y) => x.id.localeCompare(y.id)),
    },
    checkpoint_responses: {
      added: cr_added.sort(),
      removed: cr_removed.sort(),
      edited: cr_edited.sort((x, y) => x.checkpoint_id.localeCompare(y.checkpoint_id)),
    },
    session_authorities: {
      added: sa_added.sort(),
      removed: sa_removed.sort(),
      edited: sa_edited.sort((x, y) => x.id.localeCompare(y.id)),
    },
    interpretation_selections: {
      added: is_added.sort(),
      removed: is_removed.sort(),
      edited: is_edited.sort((x, y) => x.term_id.localeCompare(y.term_id)),
    },
    metadata: { changed_fields: metadata_changed },
  };
}

function diffFields<T extends object>(before: T, after: T): string[] {
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const k of keys) {
    const bv = (before as Record<string, unknown>)[k];
    const av = (after as Record<string, unknown>)[k];
    if (!deepEqual(bv, av)) out.push(k);
  }
  return out.sort();
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return b === null || b === undefined;
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffFrameVersionMetadata(a: FrameVersion, b: FrameVersion): MetadataChange[] {
  const fields_to_check = [
    "version_number",
    "parent_version_id",
    "is_milestone",
    "change_summary",
    "llm_settings_snapshot",
  ] as const;
  return fields_to_check.filter((f) => !deepEqual(a[f], b[f])).map((field) => ({ field }));
}

function diffSessionVersionMetadata(
  a: ArgumentSessionVersion,
  b: ArgumentSessionVersion,
): MetadataChange[] {
  const fields_to_check = [
    "version_number",
    "parent_version_id",
    "is_milestone",
    "change_summary",
    "output_overrides",
  ] as const;
  return fields_to_check.filter((f) => !deepEqual(a[f], b[f])).map((field) => ({ field }));
}
