import * as React from "react";
import type { NodeRef, FrameVersion, ArgumentSession, NodeStatus } from "@/schema";
import { FrameCanvas, type FrameCanvasHandle, type ArgumentOverlay } from "@/ui";
import { useLayoutResult } from "@/ui";

export interface PathOverlayTabProps {
  frame_version: FrameVersion;
  status_map: Readonly<Record<string, NodeStatus>>;
  session: ArgumentSession;
  on_node_clicked: (node_id: NodeRef) => void;
  canvas_ref?: React.Ref<FrameCanvasHandle>;
  /** P0-17: primary-path sequence from compute_result.output.primary_path. */
  primary_path_node_ids?: ReadonlyArray<NodeRef>;
  /** P0-17: compute_result.active_set. */
  active_set?: ReadonlySet<NodeRef> | ReadonlyArray<NodeRef>;
  /** P0-17: stable hash of primary_path_node_ids; changes → trace replays. */
  path_fingerprint?: string;
  /** Recommended-next node id; flips that node's pulse-recommended keyframe on. */
  recommended_next_id?: NodeRef | null;
}

export function buildArgumentOverlayProjection(session: ArgumentSession): ArgumentOverlay {
  const overlay_edges: Array<{
    id: string;
    type: "ANSWERS" | "SUPPORTS" | "CONTRADICTS";
    source: string;
    target: string;
  }> = [];
  for (const e of session.argument_edges) {
    if (e.type === "ANSWERS" || e.type === "SUPPORTS" || e.type === "CONTRADICTS") {
      overlay_edges.push({
        id: e.id,
        type: e.type,
        source: e.source,
        target: e.target,
      });
    }
  }
  return {
    edges: overlay_edges.sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function PathOverlayTab(props: PathOverlayTabProps): React.ReactElement {
  const {
    frame_version,
    status_map,
    session,
    on_node_clicked,
    canvas_ref,
    primary_path_node_ids,
    active_set,
    path_fingerprint,
    recommended_next_id,
  } = props;
  const layout_status = useLayoutResult(frame_version);
  const layout_result =
    layout_status.kind === "ready"
      ? layout_status.result
      : layout_status.kind === "computing" || layout_status.kind === "error"
        ? layout_status.previous_result
        : null;

  const overlay = React.useMemo(() => buildArgumentOverlayProjection(session), [session]);

  return (
    <div data-testid="path-overlay-tab" className="h-full w-full">
      <FrameCanvas
        frame_version={frame_version}
        layout_result={layout_result}
        operating_mode="argument_running"
        status_map={status_map}
        argument_overlay={overlay}
        onSelectionChange={(ids) => {
          if (ids.length > 0) on_node_clicked(ids[0]!);
        }}
        handle={canvas_ref}
        primary_path_node_ids={primary_path_node_ids}
        active_set={active_set}
        path_fingerprint={path_fingerprint}
        recommended_next_id={recommended_next_id}
      />
    </div>
  );
}
