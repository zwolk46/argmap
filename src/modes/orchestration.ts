import type { Frame, FrameVersion, ArgumentSession, NodeRef, NodeType } from "@/schema";
import type { FrameId, FrameVersionId, SessionId, SessionVersionId } from "@/schema";
import type { ArgumentSessionVersion } from "@/schema";
import type { Repository, OrphanResolution } from "@/persistence";

export interface OrphanCandidate {
  carrier_kind: "checkpoint_response" | "interpretation_selection" | "argument_edge";
  carrier_id: string;
  source_node_id: NodeRef;
  display_summary: string;
  suggested_kind: "discard" | "reattach" | "no_op";
  suggested_target_node_id?: NodeRef;
}

export async function createFrameFromTemplate(
  repo: Repository,
  template_frame_id: FrameId,
  new_title: string,
): Promise<Frame> {
  return repo.createFrameFromTemplate(template_frame_id, new_title);
}

export async function migrateSession(
  repo: Repository,
  session_id: SessionId,
  target_frame_version_id: FrameVersionId,
  resolutions: OrphanResolution[],
): Promise<ArgumentSessionVersion> {
  return repo.migrateSession(session_id, target_frame_version_id, resolutions);
}

export async function restoreFrameVersion(
  repo: Repository,
  frame_id: FrameId,
  ancestor_version_id: FrameVersionId,
): Promise<FrameVersion> {
  return repo.restoreFrameVersion(frame_id, ancestor_version_id);
}

export async function restoreSessionVersion(
  repo: Repository,
  session_id: SessionId,
  ancestor_version_id: SessionVersionId,
): Promise<ArgumentSessionVersion> {
  return repo.restoreSessionVersion(session_id, ancestor_version_id);
}

// ---- Internal helpers ----

const PARENT_EDGE_TYPES = new Set(["DECOMPOSES_INTO", "INTERPRETED_AS", "TURNS_ON"]);

function buildInboundParentMap(fv: FrameVersion): Map<NodeRef, NodeRef> {
  const parent = new Map<NodeRef, NodeRef>();
  for (const e of fv.edges) {
    if (PARENT_EDGE_TYPES.has(e.type)) {
      parent.set(e.target, e.source);
    }
  }
  return parent;
}

function parentOf(node_id: NodeRef, parent_map: Map<NodeRef, NodeRef>): NodeRef | undefined {
  return parent_map.get(node_id);
}

function suggestReattach(
  source_node_id: NodeRef,
  required_type: NodeType,
  prior_snapshot: FrameVersion,
  target: FrameVersion,
): { kind: "reattach"; target_node_id: NodeRef } | { kind: "discard" } {
  const prior_parent_map = buildInboundParentMap(prior_snapshot);
  const target_parent_map = buildInboundParentMap(target);

  const orphan_parent = parentOf(source_node_id, prior_parent_map);
  if (!orphan_parent) return { kind: "discard" };

  const candidates = target.nodes
    .filter((n) => n.type === required_type && parentOf(n.id, target_parent_map) === orphan_parent)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (candidates.length === 1) {
    return { kind: "reattach", target_node_id: candidates[0]!.id };
  }
  return { kind: "discard" };
}

// ---- Main exported function ----

export function enumerateOrphanCandidates(
  session: ArgumentSession,
  target_frame_version: FrameVersion,
): OrphanCandidate[] {
  const candidates: OrphanCandidate[] = [];
  const target_node_ids = new Set(target_frame_version.nodes.map((n) => n.id));
  const prior_snapshot = session.frame_version_snapshot;

  // Build target checkpoint option map for option-level orphan detection
  const target_checkpoint_options = new Map<NodeRef, Set<string>>();
  for (const n of target_frame_version.nodes) {
    if (n.type === "Checkpoint") {
      target_checkpoint_options.set(n.id, new Set(n.options.map((o) => o.id)));
    }
  }

  // 1. Checkpoint responses — sorted by checkpoint_id
  const sorted_responses = [...session.checkpoint_responses].sort((a, b) =>
    a.checkpoint_id.localeCompare(b.checkpoint_id),
  );
  for (const r of sorted_responses) {
    if (!target_node_ids.has(r.checkpoint_id)) {
      const suggestion = suggestReattach(
        r.checkpoint_id,
        "Checkpoint",
        prior_snapshot,
        target_frame_version,
      );
      candidates.push({
        carrier_kind: "checkpoint_response",
        carrier_id: r.checkpoint_id,
        source_node_id: r.checkpoint_id,
        display_summary: `Checkpoint response for node '${r.checkpoint_id}' — checkpoint no longer exists`,
        suggested_kind: suggestion.kind,
        ...(suggestion.kind === "reattach"
          ? { suggested_target_node_id: suggestion.target_node_id }
          : {}),
      });
    } else {
      // Option-level orphan: checkpoint exists but selected_option_id is gone
      const valid_options = target_checkpoint_options.get(r.checkpoint_id);
      if (valid_options && !valid_options.has(r.selected_option_id)) {
        candidates.push({
          carrier_kind: "checkpoint_response",
          carrier_id: r.checkpoint_id,
          source_node_id: r.checkpoint_id,
          display_summary: `Checkpoint option '${r.selected_option_id}' no longer exists in checkpoint '${r.checkpoint_id}'`,
          suggested_kind: "discard",
        });
      }
    }
  }

  // 2. Interpretation selections — sorted by term_id
  const sorted_selections = [...session.interpretation_selections].sort((a, b) =>
    a.term_id.localeCompare(b.term_id),
  );
  for (const sel of sorted_selections) {
    if (!target_node_ids.has(sel.term_id)) {
      const suggestion = suggestReattach(sel.term_id, "Term", prior_snapshot, target_frame_version);
      candidates.push({
        carrier_kind: "interpretation_selection",
        carrier_id: sel.term_id,
        source_node_id: sel.term_id,
        display_summary: `Interpretation selection for term '${sel.term_id}' — term no longer exists`,
        suggested_kind: suggestion.kind,
        ...(suggestion.kind === "reattach"
          ? { suggested_target_node_id: suggestion.target_node_id }
          : {}),
      });
    } else {
      // Check if any selected interpretation no longer exists
      for (const interp_id of [...sel.selected_interpretation_ids].sort((a, b) =>
        a.localeCompare(b),
      )) {
        if (!target_node_ids.has(interp_id)) {
          const suggestion = suggestReattach(
            interp_id,
            "Interpretation",
            prior_snapshot,
            target_frame_version,
          );
          candidates.push({
            carrier_kind: "interpretation_selection",
            carrier_id: sel.term_id,
            source_node_id: interp_id,
            display_summary: `Selected interpretation '${interp_id}' for term '${sel.term_id}' no longer exists`,
            suggested_kind: suggestion.kind,
            ...(suggestion.kind === "reattach"
              ? { suggested_target_node_id: suggestion.target_node_id }
              : {}),
          });
        }
      }
    }
  }

  // 3. Argument edges — sorted by edge id
  const sorted_edges = [...session.argument_edges].sort((a, b) => a.id.localeCompare(b.id));
  for (const e of sorted_edges) {
    const missing_source = !target_node_ids.has(e.source);
    const missing_target = !target_node_ids.has(e.target);
    if (missing_source) {
      candidates.push({
        carrier_kind: "argument_edge",
        carrier_id: e.id,
        source_node_id: e.source,
        display_summary: `Argument edge '${e.id}' source node '${e.source}' no longer exists`,
        suggested_kind: "discard",
      });
    } else if (missing_target) {
      candidates.push({
        carrier_kind: "argument_edge",
        carrier_id: e.id,
        source_node_id: e.target,
        display_summary: `Argument edge '${e.id}' target node '${e.target}' no longer exists`,
        suggested_kind: "discard",
      });
    }
  }

  // Sort by (carrier_kind, carrier_id) for determinism
  candidates.sort(
    (a, b) =>
      a.carrier_kind.localeCompare(b.carrier_kind) ||
      a.carrier_id.localeCompare(b.carrier_id) ||
      a.source_node_id.localeCompare(b.source_node_id),
  );

  return candidates;
}
