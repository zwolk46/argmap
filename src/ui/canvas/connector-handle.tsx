import * as React from "react";
import type { ReactElement } from "react";
import type { NodeRef } from "@/schema";

export interface EdgeDragEvent {
  source: NodeRef;
  initial_position: { x: number; y: number };
}

export interface ConnectorHandleProps {
  node_id: NodeRef;
  enabled: boolean;
  onEdgeStart: (event: EdgeDragEvent) => void;
  onTargetCandidate: (event: { source: NodeRef; target: NodeRef | null; valid: boolean }) => void;
  onEdgeRelease: (event: {
    source: NodeRef;
    target: NodeRef | null;
    drop_position: { x: number; y: number };
  }) => void;
}

export function ConnectorHandle({
  node_id,
  enabled,
  onEdgeStart,
  onTargetCandidate,
  onEdgeRelease,
}: ConnectorHandleProps): ReactElement | null {
  if (!enabled) return null;

  function handleMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    onEdgeStart({
      source: node_id,
      initial_position: { x: e.clientX, y: e.clientY },
    });

    function handleMouseMove(ev: MouseEvent) {
      const target_el = document.elementFromPoint(ev.clientX, ev.clientY);
      const target_node_id = target_el
        ?.closest("[data-node-id]")
        ?.getAttribute("data-node-id") as NodeRef | null;
      onTargetCandidate({
        source: node_id,
        target: target_node_id,
        valid: target_node_id !== null && target_node_id !== node_id,
      });
    }

    function handleMouseUp(ev: MouseEvent) {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      const target_el = document.elementFromPoint(ev.clientX, ev.clientY);
      const target_node_id = target_el
        ?.closest("[data-node-id]")
        ?.getAttribute("data-node-id") as NodeRef | null;
      onEdgeRelease({
        source: node_id,
        target: target_node_id,
        drop_position: { x: ev.clientX, y: ev.clientY },
      });
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  return (
    <div
      data-testid={`connector-handle-${node_id}`}
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        bottom: "-6px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: "var(--color-mode-current-accent)",
        border: "2px solid var(--color-surface-elevated)",
        cursor: "crosshair",
        zIndex: 10,
      }}
    />
  );
}
