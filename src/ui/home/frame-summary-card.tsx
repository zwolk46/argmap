import type { ReactElement, KeyboardEvent } from "react";
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
  /**
   * Authoritative pin state for the visual. P0-14: `is_pinned` reads
   * `Frame.pinned` (always false in this codebase — pinFrame writes to
   * AppState.pinned[] only). The home page computes `is_pinned` from
   * `pinned_set.has(frame.id)` and passes it explicitly so the star icon
   * never desyncs from the actual pin state.
   */
  is_pinned: boolean;
  onOpen: (frame_id: FrameId) => void;
  onTogglePin: (frame_id: FrameId, pinned: boolean) => void;
}

export function relativeTime(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  // P2: clamp at zero so clock-skewed timestamps don't render "-5s ago".
  const delta_s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (delta_s < 60) return `${delta_s}s ago`;
  if (delta_s < 3600) return `${Math.floor(delta_s / 60)}m ago`;
  if (delta_s < 86400) return `${Math.floor(delta_s / 3600)}h ago`;
  return `${Math.floor(delta_s / 86400)}d ago`;
}

export function FrameSummaryCard(props: FrameSummaryCardProps): ReactElement {
  const { summary, is_pinned, onOpen, onTogglePin } = props;

  function handleKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(summary.id);
    }
  }

  return (
    <article
      data-testid="frame-summary-card"
      data-frame-id={summary.id}
      className="argmap-card"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Ignore clicks on the pin button child.
        const target = e.target as HTMLElement;
        if (target.closest('[data-testid="frame-card-pin"]')) return;
        onOpen(summary.id);
      }}
      onKeyDown={handleKey}
      style={{
        padding: "var(--space-4)",
        borderRadius: "var(--radius-md)",
        border: "var(--border-thin) solid var(--color-border-subtle)",
        background: "var(--color-surface-elevated)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        minWidth: 220,
        boxShadow: "var(--shadow-sm)",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-2)",
          minHeight: "44px",
        }}
      >
        <h3
          data-testid="frame-card-open"
          style={{
            flex: 1,
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-primary)",
            margin: 0,
            lineHeight: "var(--line-height-snug)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          {summary.title || "Untitled frame"}
        </h3>
        <button
          type="button"
          data-testid="frame-card-pin"
          aria-pressed={is_pinned}
          aria-label={is_pinned ? "Unpin frame" : "Pin frame"}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(summary.id, !is_pinned);
          }}
          title={is_pinned ? "Unpin" : "Pin"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "26px",
            height: "26px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: is_pinned ? "var(--color-milestone-star)" : "var(--color-text-tertiary)",
            borderRadius: "var(--radius-md)",
            transition: "background-color var(--duration-fast) var(--ease-standard)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)")
          }
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          {is_pinned ? (
            <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 1.5l1.7 4 4.3.4-3.3 2.9.9 4.2L8 10.8l-3.6 2.2.9-4.2-3.3-2.9 4.3-.4z" />
            </svg>
          ) : (
            <svg
              width={14}
              height={14}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M8 1.5l1.7 4 4.3.4-3.3 2.9.9 4.2L8 10.8l-3.6 2.2.9-4.2-3.3-2.9 4.3-.4z" />
            </svg>
          )}
          <span
            aria-hidden="true"
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
            {is_pinned ? "★" : "☆"}
          </span>
        </button>
      </header>
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          marginTop: "auto",
          paddingTop: "var(--space-1)",
          borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
        }}
      >
        <ModeFlavorChip mode={summary.mode} flavor={summary.flavor} />
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-tertiary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {relativeTime(summary.updated_at)}
        </span>
      </footer>
    </article>
  );
}
