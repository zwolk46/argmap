import type { ReactElement } from "react";
import { Pill, Tooltip } from "../primitives";
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
  const {
    summary,
    depth,
    is_current,
    is_milestone,
    is_authored_against,
    is_selected,
    on_select,
  } = props;

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
    <button
      type="button"
      data-testid="version-tree-row"
      data-version-id={summary.id}
      data-is-current={is_current}
      data-is-milestone={is_milestone}
      data-is-authored-against={is_authored_against}
      aria-pressed={is_selected}
      onClick={() => on_select(summary.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2, 8px)",
        width: "100%",
        padding: "var(--space-2, 8px) var(--space-3, 12px)",
        paddingLeft: `calc(var(--space-3, 12px) + ${depth} * var(--space-4, 16px))`,
        background: is_selected
          ? "var(--color-surface-selected, #eef2ff)"
          : is_current && is_milestone
            ? "var(--color-mode-current-accent-bg, #dbeafe)"
            : "transparent",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        fontSize: "var(--font-size-sm, 13px)",
        color: "var(--color-text-primary, #111827)",
        position: "relative",
      }}
    >
      <span aria-hidden="true" style={{ color: marker_color, width: "1em" }}>
        {marker_glyph}
      </span>
      <span style={{ fontWeight: 500 }}>v{summary.version_number}</span>
      <Tooltip content={summary.created_at}>
        <span style={{ color: "var(--color-text-secondary, #6b7280)", fontSize: "11px" }}>
          {rel}
        </span>
      </Tooltip>
      <span
        style={{
          flex: 1,
          color: is_autosave
            ? "var(--color-text-tertiary, #9ca3af)"
            : "var(--color-text-secondary, #6b7280)",
          fontStyle: is_autosave ? "italic" : "normal",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {change_summary_text ?? "auto-save"}
      </span>
      {is_authored_against ? (
        <Pill>
          <span data-testid="authored-against-pill">session was authored here</span>
        </Pill>
      ) : null}
    </button>
  );
}
