import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeRef, NodeType } from "@/schema";
import type { NodeStatus } from "@/schema";
import type { HookInvocationRecord } from "@/llm-hooks";
import { TypeIcon } from "../../primitives/type-icon";
import { AiAttributionChip } from "../../primitives/ai-attribution-chip";
import { StatusBadgeOverlay } from "../status-badge-overlay";
import type { NodeFrameVariant, NodeDisplayFlags } from "./types";

export type { NodeFrameVariant, NodeDisplayFlags };

export interface NodeFrameProps {
  node_id: NodeRef;
  node_type: NodeType | "premise_pill";
  status?: NodeStatus;
  attributions?: ReadonlyArray<HookInvocationRecord>;
  primary_text: string;
  variant: NodeFrameVariant;
  display: NodeDisplayFlags;
  enable_connector_handle: boolean;
  legal_mode: boolean;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<NodeFrameVariant, React.CSSProperties> = {
  root_question: {
    border: "var(--border-medium) solid var(--color-border-strong)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-md)",
    fontWeight: "var(--font-weight-semibold)",
  },
  sub_question: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
  },
  term: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
  },
  interpretation: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
    borderLeft: "3px solid var(--color-edge-structural)",
  },
  checkpoint: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    // clipPath would cut off the status badge; render outer hex shadow instead.
  },
  logical_gate: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
  },
  conclusion: {
    border: "var(--border-thin) solid var(--color-border-strong)",
    borderRadius: "var(--radius-md)",
    // Double-border: outer ring rendered via box-shadow with the gap.
    boxShadow:
      "0 0 0 3px var(--color-surface-canvas), 0 0 0 calc(3px + var(--border-thick)) var(--color-border-strong), var(--shadow-sm)",
    fontSize: "var(--font-size-md)",
    fontWeight: "var(--font-weight-semibold)",
  },
  authority: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
  },
  premise_pill: {
    border: "var(--border-thin) solid var(--color-border-subtle)",
    borderRadius: "var(--radius-pill)",
    background: "var(--color-status-open-bg)",
    fontSize: "var(--font-size-sm)",
  },
};

export function NodeFrame({
  node_id,
  node_type,
  status,
  attributions,
  primary_text,
  variant,
  display,
  enable_connector_handle,
  legal_mode,
  children,
}: NodeFrameProps): ReactElement {
  const [hovered, setHovered] = React.useState(false);

  const variantStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.sub_question;

  const dataState =
    [
      display.selected && "selected",
      (hovered || display.hovered) && "hovered",
      display.not_applicable_dim && "not-applicable",
      display.foreclosed_strikethrough && "foreclosed",
      display.recommended_next_pulse && "recommended-next",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const isGate = variant === "logical_gate";
  const isCheckpoint = variant === "checkpoint";

  // Selection outline as box-shadow so it composes with variant box-shadow (e.g. Conclusion double-border).
  const selectionShadow = display.selected
    ? "0 0 0 var(--border-medium) var(--color-mode-current-accent), var(--shadow-md)"
    : null;

  const fontSize = (variantStyle.fontSize as string | undefined) ?? "var(--font-size-base)";
  const fontWeight =
    (variantStyle.fontWeight as string | undefined) ?? "var(--font-weight-medium)";

  // Build the inner card. For gate variants we counter-rotate the content
  // so labels remain upright while the box is rotated 45°.
  const cardStyle: React.CSSProperties = {
    position: "relative",
    minWidth: isGate ? "64px" : "140px",
    padding: isGate ? "var(--space-3)" : "var(--space-3) var(--space-4)",
    background: display.selected
      ? "var(--color-surface-selected)"
      : hovered || display.hovered
        ? "var(--color-surface-hover)"
        : "var(--color-surface-elevated)",
    cursor: "grab",
    opacity: display.not_applicable_dim ? 0.3 : display.foreclosed_strikethrough ? 0.45 : 1,
    animation: display.recommended_next_pulse
      ? "pulse-recommended var(--duration-pulse) var(--ease-soft) infinite"
      : undefined,
    transition:
      "opacity var(--duration-base) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)",
    ...variantStyle,
    ...(isGate ? { transform: "rotate(45deg)", width: "60px", height: "60px" } : {}),
    ...(selectionShadow ? { boxShadow: selectionShadow } : {}),
    ...(isGate && display.indeterminate_gate_dashed ? { borderStyle: "dashed" } : {}),
  };

  // Inner content (label area). For gates, counter-rotate to keep upright.
  const innerContent = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-1)",
          marginBottom: primary_text ? "var(--space-1)" : 0,
        }}
      >
        <TypeIcon node_type={node_type} size={12} />
        {attributions && attributions.length > 0 && <AiAttributionChip record={attributions[0]} />}
      </div>
      <div
        style={{
          color: "var(--color-text-primary)",
          lineHeight: "var(--line-height-snug)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          textDecoration: display.foreclosed_strikethrough ? "line-through" : undefined,
          fontSize,
          fontWeight,
        }}
      >
        {isGate ? children : primary_text}
      </div>
      {!isGate && children}
    </>
  );

  // Wrap with a non-clipping outer for Checkpoint so the status badge isn't cut off.
  if (isCheckpoint) {
    return (
      <div
        data-node-id={node_id}
        data-state={dataState}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: "relative", display: "inline-block" }}
      >
        {enable_connector_handle && (
          <Handle
            type="target"
            position={Position.Top}
            style={handleTargetStyle}
            isConnectableStart={false}
          />
        )}
        <div
          style={{
            ...cardStyle,
            clipPath:
              "polygon(10px 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0% 50%)",
            boxShadow: display.selected
              ? "0 0 0 var(--border-medium) var(--color-mode-current-accent), var(--shadow-md)"
              : "var(--shadow-sm)",
          }}
        >
          {innerContent}
        </div>
        {status && (
          <div style={{ position: "absolute", top: "-8px", right: "-8px" }}>
            <StatusBadgeOverlay status={status} legal_mode={legal_mode} />
          </div>
        )}
        {enable_connector_handle && (
          <Handle
            type="source"
            position={Position.Bottom}
            style={handleSourceStyle((hovered || display.hovered) ?? false)}
            data-testid="connector-handle-indicator"
            isConnectableEnd={false}
          />
        )}
      </div>
    );
  }

  // Gate: rotated card + counter-rotated content so glyph reads upright.
  if (isGate) {
    return (
      <div
        data-node-id={node_id}
        data-state={dataState}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          width: "60px",
          height: "60px",
          display: "inline-block",
        }}
      >
        {enable_connector_handle && (
          <Handle
            type="target"
            position={Position.Top}
            style={handleTargetStyle}
            isConnectableStart={false}
          />
        )}
        <div style={cardStyle}>
          <div
            style={{
              transform: "rotate(-45deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            {innerContent}
          </div>
        </div>
        {status && (
          <div style={{ position: "absolute", top: "-8px", right: "-8px" }}>
            <StatusBadgeOverlay status={status} legal_mode={legal_mode} />
          </div>
        )}
        {enable_connector_handle && (
          <Handle
            type="source"
            position={Position.Bottom}
            style={handleSourceStyle((hovered || display.hovered) ?? false)}
            data-testid="connector-handle-indicator"
            isConnectableEnd={false}
          />
        )}
      </div>
    );
  }

  // Default path
  return (
    <div
      data-node-id={node_id}
      data-state={dataState}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...cardStyle,
        boxShadow: display.selected
          ? selectionShadow ?? "var(--shadow-md)"
          : (variantStyle.boxShadow as string | undefined) ?? "var(--shadow-sm)",
      }}
    >
      {enable_connector_handle && (
        <Handle
          type="target"
          position={Position.Top}
          style={handleTargetStyle}
          isConnectableStart={false}
        />
      )}
      {innerContent}
      {status && (
        <div style={{ position: "absolute", top: "-8px", right: "-8px" }}>
          <StatusBadgeOverlay status={status} legal_mode={legal_mode} />
        </div>
      )}
      {enable_connector_handle && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={handleSourceStyle((hovered || display.hovered) ?? false)}
          data-testid="connector-handle-indicator"
          isConnectableEnd={false}
        />
      )}
    </div>
  );
}

const handleTargetStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  background: "var(--color-surface-elevated)",
  border: "2px solid var(--color-border-default)",
  opacity: 0,
  transition: "opacity var(--duration-fast) var(--ease-standard)",
};

function handleSourceStyle(visible: boolean): React.CSSProperties {
  return {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "var(--color-mode-current-accent)",
    border: "2px solid var(--color-surface-elevated)",
    boxShadow: "var(--shadow-sm)",
    cursor: "crosshair",
    opacity: visible ? 1 : 0,
    transition: "opacity var(--duration-fast) var(--ease-standard)",
  };
}
