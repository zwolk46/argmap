import type { ReactElement } from "react";
import { Pill, Tooltip } from "../primitives";
import { UIcon } from "../primitives/uicon";
import type { AnySummary } from "./version-tree-shape";

export interface VersionTreeRowProps {
  summary: AnySummary;
  depth: number;
  is_current: boolean;
  is_milestone: boolean;
  is_authored_against: boolean;
  is_selected: boolean;
  on_select: (version_id: string) => void;
}

function relativeTime(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const delta_s = Math.floor((Date.now() - t) / 1000);
  if (delta_s < 60) return `${delta_s}s ago`;
  if (delta_s < 3600) return `${Math.floor(delta_s / 60)}m ago`;
  if (delta_s < 86400) return `${Math.floor(delta_s / 3600)}h ago`;
  return `${Math.floor(delta_s / 86400)}d ago`;
}

export function VersionTreeRow(props: VersionTreeRowProps): ReactElement {
  const { summary, depth, is_current, is_milestone, is_authored_against, is_selected, on_select } =
    props;

  const marker_color = is_current
    ? "var(--color-mode-current-accent, #1d4ed8)"
    : is_milestone
      ? "var(--color-milestone-star, #d97706)"
      : "var(--color-text-tertiary, #9ca3af)";
  const marker_glyph = is_milestone ? "★" : "●";
  const change_summary_text = summary.change_summary;
  const is_autosave = !change_summary_text;
  const rel = relativeTime(summary.created_at);

  return (
    // KEEP RAW: tree-row button with depth-indented padding, multiple inline children, and selected-state styling.
    <button
      type="button"
      data-testid="version-tree-row"
      data-version-id={summary.id}
      data-is-current={is_current}
      data-is-milestone={is_milestone}
      data-is-authored-against={is_authored_against}
      aria-pressed={is_selected}
      onClick={() => on_select(summary.id)}
      className="argmap-row-hover"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        width: "100%",
        padding: "var(--space-2) var(--space-3)",
        paddingLeft: `calc(var(--space-3) + ${depth} * var(--space-4))`,
        background: is_selected
          ? "var(--color-surface-selected)"
          : is_current && is_milestone
            ? "var(--color-mode-current-accent-bg)"
            : "transparent",
        border: "none",
        borderLeft: depth > 0 ? "var(--border-hairline) solid var(--color-border-subtle)" : "none",
        textAlign: "left",
        cursor: "pointer",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-primary)",
        position: "relative",
        borderRadius: "var(--radius-sm)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          color: marker_color,
          flexShrink: 0,
        }}
      >
        {is_milestone ? <UIcon name="star" size={12} /> : <UIcon name="circle-small" size={12} />}
        <span
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            margin: -1,
            padding: 0,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {marker_glyph}
        </span>
      </span>
      <span
        style={{
          fontWeight: "var(--font-weight-medium)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-primary)",
        }}
      >
        v{summary.version_number}
      </span>
      <Tooltip content={summary.created_at}>
        <span
          style={{
            color: "var(--color-text-tertiary)",
            fontSize: "var(--font-size-xs)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {rel}
        </span>
      </Tooltip>
      <span
        style={{
          flex: 1,
          color: is_autosave ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
          fontStyle: is_autosave ? "italic" : "normal",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {change_summary_text ?? "auto-save"}
      </span>
      {is_authored_against ? (
        <Pill variant="mode_accent" size="xs">
          <span data-testid="authored-against-pill">session here</span>
        </Pill>
      ) : null}
    </button>
  );
}
