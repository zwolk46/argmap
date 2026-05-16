import * as React from "react";
import type { ReactElement, ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeRef, NodeType } from "@/schema";
import type { NodeStatus } from "@/schema";
import type { HookInvocationRecord } from "@/llm-hooks";
import { UIcon } from "../../primitives/uicon";
import { AiAttributionChip } from "../../primitives/ai-attribution-chip";
import type { NodeFrameVariant, NodeDisplayFlags } from "./types";

export type { NodeFrameVariant, NodeDisplayFlags };

export interface NodeFrameProps {
  node_id: NodeRef;
  /** PascalCase NodeType from the schema. Used for eyebrow label only. */
  node_type: NodeType | "premise_pill";
  status?: NodeStatus;
  attributions?: ReadonlyArray<HookInvocationRecord>;
  primary_text: string;
  variant: NodeFrameVariant;
  display: NodeDisplayFlags;
  enable_connector_handle: boolean;
  legal_mode: boolean;
  /**
   * Explicit subflag override. Authority nodes pass this directly; for all
   * other kinds we derive the subflag from `status.via` so the legal-mode
   * via_binding_authority / via_persuasive_authority sub-flags surface in
   * the .cn-status header without a per-renderer wiring change.
   */
  subflag?: "binding" | "persuasive";
  children?: ReactNode;
}

// ────────────────────────────────────────────────────────────────────
// Status glyph + label mapping for the .cn-status header strip.
// Bold-rounded glyphs for satisfied/contested/foreclosed/not_applicable
// — they read as headline-scale signals at 11px. `open` uses regular
// rounded because UICONS Bold Rounded doesn't ship a circle glyph and
// a soft outlined circle reads correctly as "unstarted" anyway.
// ────────────────────────────────────────────────────────────────────
type StatusKey = NodeStatus["status"];
const STATUS_GLYPH: Record<StatusKey, { name: string; iconStyle: "rr" | "br"; label: string }> = {
  satisfied: { name: "check", iconStyle: "br", label: "Satisfied" },
  open: { name: "circle", iconStyle: "rr", label: "Open" },
  contested: { name: "exclamation", iconStyle: "br", label: "Contested" },
  foreclosed: { name: "cross", iconStyle: "br", label: "Foreclosed" },
  not_applicable: { name: "minus", iconStyle: "br", label: "Not applicable" },
};

// ────────────────────────────────────────────────────────────────────
// Per-kind eyebrow label + icon (TypeIcon equivalents). Matches the
// Argmap Components reference: rootQuestion=interrogation,
// checkpoint=diamond, term=hashtag, authority=scale, conclusion=flag,
// logicalGate=rhombus.
// ────────────────────────────────────────────────────────────────────
const KIND_EYEBROW: Record<NodeFrameVariant, { label: string; icon: string } | null> = {
  root_question: { label: "Root question", icon: "interrogation" },
  sub_question: { label: "Sub-question", icon: "interrogation" },
  term: { label: "Term", icon: "hashtag" },
  interpretation: { label: "Interpretation", icon: "chart-tree" },
  checkpoint: { label: "Checkpoint", icon: "diamond" },
  logical_gate: null, // gate is its own visual — no eyebrow
  conclusion: { label: "Conclusion", icon: "flag" },
  authority: { label: "Authority", icon: "scale" },
  premise_pill: null, // pill renders inline — no eyebrow
};

function deriveSubflag(
  explicit: NodeFrameProps["subflag"],
  status: NodeStatus | undefined,
): "binding" | "persuasive" | undefined {
  if (explicit) return explicit;
  const via = status?.via;
  if (!via) return undefined;
  if (via.includes("binding_authority")) return "binding";
  if (via.includes("persuasive_authority")) return "persuasive";
  return undefined;
}

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
  subflag,
  children,
}: NodeFrameProps): ReactElement {
  const [hovered, setHovered] = React.useState(false);

  const dataState =
    [
      display.selected && "selected",
      (hovered || display.hovered) && "hovered",
      display.not_applicable_dim && "not-applicable",
      display.foreclosed_strikethrough && "foreclosed",
      display.recommended_next_pulse && "recommended-next",
      display.on_primary_path && "on-primary-path",
      display.off_active_set && "off-active-set",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  // P0-17: when a node is outside compute_result.active_set, the resolving
  // path doesn't go through it — desaturate so the on-path nodes stand out.
  const nodeFrameClassName =
    display.off_active_set && !display.on_primary_path
      ? "argmap-node-frame--off-active"
      : undefined;

  const isGate = variant === "logical_gate";
  const isPremisePill = variant === "premise_pill";
  const statusKey: StatusKey = status?.status ?? "open";
  const statusGlyph = STATUS_GLYPH[statusKey];
  const effectiveSubflag = legal_mode ? deriveSubflag(subflag, status) : undefined;
  const eyebrow = KIND_EYEBROW[variant];
  const failures = status?.failed_conditions;
  const hasAi = (attributions && attributions.length > 0) || false;

  // ────────────────────────────────────────────────────────────────
  // Premise pill — keep the existing minimal pill render. The
  // whole-node treatment is overkill for a premise floating in the
  // pool; the pill belongs in inline contexts (premise rows, edge
  // labels) where its job is to read as an identifier, not a node.
  // ────────────────────────────────────────────────────────────────
  if (isPremisePill) {
    return (
      <div
        data-node-id={node_id}
        data-node-type={node_type}
        data-state={dataState}
        className={nodeFrameClassName}
        title={primary_text}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "4px 10px",
          border: "var(--border-thin) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-pill)",
          background: display.selected
            ? "var(--color-surface-selected)"
            : "var(--color-status-open-bg)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
          cursor: "grab",
          opacity: display.not_applicable_dim ? 0.3 : 1,
          boxShadow: display.selected
            ? "0 0 0 var(--border-medium) var(--color-mode-current-accent)"
            : "var(--shadow-sm)",
        }}
      >
        {children}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "200px",
          }}
        >
          {primary_text}
        </span>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Connection handles. React Flow positions these relative to the
  // node-renderer wrapper. We render the target handle hidden (the
  // edge-creation gesture starts from the source handle below) and
  // the source handle as a small accent dot that appears on hover.
  // ────────────────────────────────────────────────────────────────
  const handleTarget = enable_connector_handle ? (
    <Handle
      type="target"
      position={Position.Top}
      style={handleTargetStyle}
      isConnectableStart={false}
    />
  ) : null;
  const handleSource = enable_connector_handle ? (
    <Handle
      type="source"
      position={Position.Bottom}
      style={handleSourceStyle((hovered || display.hovered) ?? false)}
      data-testid="connector-handle-indicator"
      isConnectableEnd={false}
    />
  ) : null;

  // ────────────────────────────────────────────────────────────────
  // Logical gate — no header strip, just the gate text. Status is
  // conveyed via the --state-rail color set by data-status, plus the
  // dashed border on `open`. We render children (gate glyph) inside
  // .cn-body if provided, else fall back to primary_text.
  // ────────────────────────────────────────────────────────────────
  if (isGate) {
    return (
      <div
        data-node-id={node_id}
        data-node-type={node_type}
        data-state={dataState}
        className={nodeFrameClassName}
        title={primary_text}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          animation: display.recommended_next_pulse
            ? "pulse-recommended var(--duration-pulse) var(--ease-soft) infinite"
            : undefined,
          opacity: display.not_applicable_dim
            ? 0.4
            : display.foreclosed_strikethrough
              ? 0.55
              : 1,
        }}
      >
        {handleTarget}
        <div
          className="canvas-node"
          data-kind="logical_gate"
          data-status={statusKey}
          data-selected={display.selected ? "true" : undefined}
          style={display.indeterminate_gate_dashed ? { borderStyle: "dashed" } : undefined}
        >
          <div className="cn-body">
            <div className="cn-title">{children ?? primary_text}</div>
          </div>
        </div>
        {handleSource}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Default: whole-node treatment with status header strip, eyebrow,
  // title, optional sub, optional failures list, optional children
  // (for renderer-specific decoration like the legacy Authority
  // binding pill — most renderers can stop passing children now that
  // the .cn-subflag chip surfaces in the header).
  // ────────────────────────────────────────────────────────────────
  return (
    <div
      data-node-id={node_id}
      data-node-type={node_type}
      data-state={dataState}
      className={nodeFrameClassName}
      title={primary_text}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        animation: display.recommended_next_pulse
          ? "pulse-recommended var(--duration-pulse) var(--ease-soft) infinite"
          : undefined,
        opacity: display.not_applicable_dim
          ? 0.4
          : display.foreclosed_strikethrough
            ? 0.55
            : 1,
      }}
    >
      {handleTarget}
      <div
        className="canvas-node"
        data-kind={variant}
        data-status={statusKey}
        data-selected={display.selected ? "true" : undefined}
      >
        <div className="cn-status">
          <span className="cn-status-left">
            <UIcon
              name={statusGlyph.name}
              iconStyle={statusGlyph.iconStyle}
              size={11}
            />
            {statusGlyph.label}
          </span>
          <span className="cn-status-right">
            {effectiveSubflag && (
              <span className="cn-subflag" data-flag={effectiveSubflag}>
                <UIcon name="scale" iconStyle="rr" size={9} />
                {effectiveSubflag === "binding" ? "B" : "P"}
              </span>
            )}
          </span>
        </div>
        <div className="cn-body">
          {eyebrow && (
            <span className="cn-eyebrow">
              <UIcon name={eyebrow.icon} iconStyle="rr" size={10} />
              {eyebrow.label}
            </span>
          )}
          <div className="cn-title">{primary_text}</div>
          {failures && failures.length > 0 && (
            <ul className="cn-failures">
              {failures.map((f, i) => (
                <li key={`${i}-${f}`} className="cn-failure">
                  {f}
                </li>
              ))}
            </ul>
          )}
          {children}
          {hasAi && (
            <div
              style={{
                marginTop: 4,
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
              }}
            >
              {attributions!.map((rec, i) => (
                <AiAttributionChip key={rec.id ?? `${i}`} record={rec} />
              ))}
            </div>
          )}
        </div>
      </div>
      {handleSource}
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
