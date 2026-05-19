import type { Frame, FrameVersion, Node, Edge, Position, NodeType } from "@/schema";
import type {
  FrameActionDispatchTable,
  FrameTransformResult,
  DispatchOpts,
  FramePatch,
  ConclusionDirectionResolution,
} from "@/state";
import type { NodeRef } from "@/schema";
import { computeDeletionCascade } from "./cascade";
import type { CascadeReport } from "./cascade";

// ---- Error thrown when node removal has a non-trivial cascade ----

export class CascadeConfirmationRequired extends Error {
  readonly report: CascadeReport;
  readonly target_node_id: NodeRef;

  constructor(target_node_id: NodeRef, report: CascadeReport) {
    super(
      `Node removal of "${target_node_id}" cascades to ${report.deleted_node_ids.length} nodes.`,
    );
    this.name = "CascadeConfirmationRequired";
    this.target_node_id = target_node_id;
    this.report = report;
  }
}

// ---- Internal helpers ----

function nextFrameVersion(fv: FrameVersion, nodes?: Node[], edges?: Edge[]): FrameVersion {
  return {
    ...fv,
    nodes: nodes ?? fv.nodes,
    edges: edges ?? fv.edges,
  };
}

function applyNodePartial(existing: Node, partial: Partial<Node>): Node {
  // P1: deep-merge `presentation` so a drag-stop patch that only carries
  // {x, y} doesn't wipe `collapsed` and other presentation hints. Before
  // this, dragging a collapsed SubQuestion silently un-collapsed it.
  const merged_presentation =
    "presentation" in partial && partial.presentation
      ? { ...(existing.presentation ?? {}), ...partial.presentation }
      : existing.presentation;
  return {
    ...existing,
    ...partial,
    id: existing.id,
    type: existing.type,
    presentation: merged_presentation,
  } as Node;
}

function applyEdgePartial(existing: Edge, partial: Partial<Edge>): Edge {
  return { ...existing, ...partial, id: existing.id, type: existing.type } as Edge;
}

function removeNodesAndEdges(
  fv: FrameVersion,
  node_ids: Set<NodeRef>,
  edge_ids: Set<string>,
): FrameVersion {
  const nodes = fv.nodes
    .filter((n) => !node_ids.has(n.id))
    .map((n) => {
      // Clean up CheckpointOption.target_node_id refs that pointed into deleted nodes
      if (n.type === "Checkpoint") {
        const cleaned = n.options.map((opt) =>
          opt.target_node_id && node_ids.has(opt.target_node_id)
            ? { ...opt, target_node_id: undefined }
            : opt,
        );
        return { ...n, options: cleaned };
      }
      return n;
    });

  const edges = fv.edges.filter((e) => !edge_ids.has(e.id));

  return nextFrameVersion(fv, nodes, edges);
}

function applyConclusionDirectionResolutions(
  nodes: Node[],
  resolutions: ConclusionDirectionResolution[],
): Node[] {
  if (resolutions.length === 0) return nodes;
  const resolutionMap = new Map(resolutions.map((r) => [r.node_id, r.direction]));
  return nodes.map((n) => {
    if (n.type === "Conclusion") {
      const dir = resolutionMap.get(n.id);
      if (dir !== undefined) return { ...n, direction: dir };
    }
    return n;
  });
}

// ---- Dispatch table implementation ----

export const frameActions: FrameActionDispatchTable = {
  node_added(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "node_added" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    return { next_version: nextFrameVersion(fv, [...fv.nodes, patch.node]) };
  },

  node_edited(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "node_edited" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    const nodes = fv.nodes.map((n) =>
      n.id === patch.node_id ? applyNodePartial(n, patch.partial) : n,
    );
    return { next_version: nextFrameVersion(fv, nodes) };
  },

  node_removed(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "node_removed" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    if (patch.cascade) {
      // Pre-confirmed list provided by caller
      const node_ids = new Set<NodeRef>([patch.node_id, ...(patch.cascade.node_ids ?? [])]);
      const edge_ids = new Set<string>(patch.cascade.edge_ids ?? []);
      return { next_version: removeNodesAndEdges(fv, node_ids, edge_ids) };
    }

    const report = computeDeletionCascade(fv, patch.node_id);

    if (report.deleted_node_ids.length > 1) {
      throw new CascadeConfirmationRequired(patch.node_id, report);
    }

    // Trivial case: only the target itself
    const node_ids = new Set<NodeRef>([patch.node_id]);
    const edge_ids = new Set<string>(report.deleted_edge_ids);
    return { next_version: removeNodesAndEdges(fv, node_ids, edge_ids) };
  },

  edge_added(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "edge_added" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    return { next_version: nextFrameVersion(fv, undefined, [...fv.edges, patch.edge]) };
  },

  edge_edited(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "edge_edited" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    const edges = fv.edges.map((e) =>
      e.id === patch.edge_id ? applyEdgePartial(e, patch.partial) : e,
    );
    return { next_version: nextFrameVersion(fv, undefined, edges) };
  },

  edge_removed(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "edge_removed" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    const edges = fv.edges.filter((e) => e.id !== patch.edge_id);
    return { next_version: nextFrameVersion(fv, undefined, edges) };
  },

  options_box_edited(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "options_box_edited" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    const nodes = fv.nodes.map((n) => {
      if (n.id !== patch.node_id) return n;
      if (patch.policy === null) {
        const { options_box: _removed, ...rest } = n as Node & { options_box?: unknown };
        return rest as Node;
      }
      return { ...n, options_box: patch.policy } as Node;
    });
    return { next_version: nextFrameVersion(fv, nodes) };
  },

  metadata_edited(
    _frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "metadata_edited" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    return {
      next_version: { ...fv },
      frame_partial: patch.partial,
    };
  },

  presentation_hints_reset_all(
    _frame: Frame,
    fv: FrameVersion,
    _patch: Extract<FramePatch, { kind: "presentation_hints_reset_all" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    const nodes = fv.nodes.map((n) => {
      if (!n.presentation) return n;
      const { presentation: _removed, ...rest } = n;
      return rest as Node;
    });
    return { next_version: nextFrameVersion(fv, nodes) };
  },

  default_policy_edited(
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "default_policy_edited" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    const updated = {
      ...frame.default_satisfaction_policies,
      [patch.node_type as NodeType]: patch.policy,
    };
    return {
      next_version: { ...fv },
      frame_partial: { default_satisfaction_policies: updated },
    };
  },

  architectural_mode_changed(
    frame: Frame,
    fv: FrameVersion,
    patch: Extract<FramePatch, { kind: "architectural_mode_changed" }>,
    _opts: DispatchOpts,
  ): FrameTransformResult {
    const nodes = applyConclusionDirectionResolutions(
      fv.nodes,
      patch.conclusion_direction_resolutions,
    );

    const frame_partial: Partial<Pick<Frame, "mode" | "flavor" | "positions">> = {
      mode: patch.target_mode,
    };
    if (patch.target_flavor !== undefined) {
      frame_partial.flavor = patch.target_flavor;
    }
    if (patch.positions_added && patch.positions_added.length > 0) {
      // Merge with existing positions instead of overwriting — otherwise a
      // user re-running the mode change with a fresh staged Position would
      // silently wipe every position already on the frame, including ones
      // referenced by current Conclusion direction choices.
      const existing = frame.positions ?? [];
      const existing_ids = new Set(existing.map((p) => p.id));
      const new_unique = patch.positions_added.filter((p) => !existing_ids.has(p.id));
      frame_partial.positions = [...existing, ...new_unique] as Position[];
    }

    return {
      next_version: nextFrameVersion(fv, nodes),
      frame_partial,
      change_summary: patch.change_summary,
    };
  },
};
