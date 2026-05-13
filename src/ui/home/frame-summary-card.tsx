import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { ModeFlavorChip } from "../chrome";

export interface FrameSummary {
  id: FrameId;
  title: string;
  mode: "legal" | "general";
  flavor?: "personal" | "academic";
  pinned: boolean;
  updated_at: string;
  last_opened_at?: string;
}

export interface FrameSummaryCardProps {
  summary: FrameSummary;
  onOpen: (frame_id: FrameId) => void;
  onTogglePin: (frame_id: FrameId, pinned: boolean) => void;
}

export function relativeTime(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const delta_s = Math.floor((Date.now() - t) / 1000);
  if (delta_s < 60) return `${delta_s}s ago`;
  if (delta_s < 3600) return `${Math.floor(delta_s / 60)}m ago`;
  if (delta_s < 86400) return `${Math.floor(delta_s / 3600)}h ago`;
  return `${Math.floor(delta_s / 86400)}d ago`;
}

export function FrameSummaryCard(props: FrameSummaryCardProps): ReactElement {
  const { summary, onOpen, onTogglePin } = props;
  return (
    <article
      data-testid="frame-summary-card"
      data-frame-id={summary.id}
      style={{
        padding: "var(--space-4, 16px)",
        borderRadius: "var(--radius-md, 6px)",
        border: "var(--border-thin, 1px) solid var(--color-border-default, #e5e7eb)",
        background: "var(--color-surface-elevated, #ffffff)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2, 8px)",
        minWidth: 220,
      }}
    >
      <header style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2, 8px)" }}>
        <button
          type="button"
          data-testid="frame-card-open"
          onClick={() => onOpen(summary.id)}
          style={{
            flex: 1,
            textAlign: "left",
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: "var(--font-size-base, 14px)",
            fontWeight: 500,
            color: "var(--color-text-primary, #111827)",
          }}
        >
          {summary.title}
        </button>
        <button
          type="button"
          data-testid="frame-card-pin"
          aria-pressed={summary.pinned}
          onClick={() => onTogglePin(summary.id, !summary.pinned)}
          title={summary.pinned ? "Unpin" : "Pin"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: summary.pinned
              ? "var(--color-milestone-star, #d97706)"
              : "var(--color-text-tertiary, #9ca3af)",
          }}
        >
          {summary.pinned ? "★" : "☆"}
        </button>
      </header>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)" }}>
        <ModeFlavorChip mode={summary.mode} flavor={summary.flavor} />
        <span
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          {relativeTime(summary.updated_at)}
        </span>
      </div>
    </article>
  );
}
