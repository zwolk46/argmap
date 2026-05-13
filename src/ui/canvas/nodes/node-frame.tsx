import * as React from "react";
import type { ReactElement, ReactNode } from "react";
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
    borderRadius: "2px",
  },
  interpretation: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
    borderLeft: "3px solid var(--color-edge-structural)",
  },
  checkpoint: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    clipPath:
      "polygon(10px 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0% 50%)",
  },
  logical_gate: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "4px",
    transform: "rotate(45deg)",
  },
  conclusion: {
    border: "var(--border-thick) solid var(--color-border-strong)",
    borderRadius: "var(--radius-md)",
    outline: "var(--border-thin) solid var(--color-border-strong)",
    outlineOffset: "3px",
    fontSize: "var(--font-size-md)",
    fontWeight: "var(--font-weight-semibold)",
  },
  authority: {
    border: "var(--border-thin) solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
  },
  premise_pill: {
    border: "none",
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

  return (
    <div
      data-node-id={node_id}
      data-state={dataState}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        minWidth: isGate ? "60px" : "120px",
        padding: isGate ? "var(--space-3)" : "var(--space-3) var(--space-4)",
        background: display.selected
          ? "var(--color-surface-selected)"
          : hovered || display.hovered
            ? "var(--color-surface-hover)"
            : "var(--color-surface-elevated)",
        boxShadow: display.selected ? "var(--shadow-md)" : "var(--shadow-sm)",
        cursor: "default",
        opacity: display.not_applicable_dim ? 0.3 : display.foreclosed_strikethrough ? 0.45 : 1,
        animation: display.recommended_next_pulse
          ? `pulse-recommended var(--duration-pulse) var(--ease-soft) infinite`
          : undefined,
        transition: `opacity var(--duration-base) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)`,
        ...variantStyle,
        ...(display.selected
          ? { outline: "var(--border-medium) solid var(--color-mode-current-accent)" }
          : {}),
        ...(isGate && display.indeterminate_gate_dashed ? { borderStyle: "dashed" } : {}),
      }}
    >
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
          ...variantStyle,
          border: "none",
          background: "none",
          boxShadow: "none",
          borderRadius: "none",
          outline: "none",
          outlineOffset: "unset",
          padding: 0,
          minWidth: "unset",
          fontSize: (variantStyle.fontSize as string | undefined) ?? "var(--font-size-base)",
          fontWeight:
            (variantStyle.fontWeight as string | undefined) ?? "var(--font-weight-medium)",
        }}
      >
        {isGate ? children : primary_text}
      </div>
      {!isGate && children}
      {status && (
        <div
          style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
          }}
        >
          <StatusBadgeOverlay status={status} legal_mode={legal_mode} />
        </div>
      )}
      {enable_connector_handle && (hovered || display.hovered) && (
        <div
          data-testid="connector-handle-indicator"
          style={{
            position: "absolute",
            bottom: "-5px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "var(--color-mode-current-accent)",
            border: "2px solid var(--color-surface-elevated)",
          }}
        />
      )}
    </div>
  );
}
