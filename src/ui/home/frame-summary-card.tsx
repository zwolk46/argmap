import type { ReactElement, KeyboardEvent } from "react";
import type { FrameId } from "@/schema";
import { ModeFlavorChip } from "../chrome";
import { IconButton, relativeTime } from "../primitives";
import { UIcon } from "../primitives/uicon";

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
  /**
   * Optional "Run argument" sub-action. When supplied, the card grows a
   * secondary action that opens the most-recent argument session for this
   * frame (auto-creating one if none exists). Without this, the only path
   * to a session is via Frame Building's mode toggle, which is two clicks
   * away — and the previous "Sessions are managed from the Home page"
   * dialog was a flat lie because Home had no sessions UI at all.
   */
  onRunArgument?: (frame_id: FrameId) => void;
  /**
   * Owner signals an in-flight Run argument call so the button can show a
   * disabled / pending state and the user can't kick off duplicate
   * Supabase writes by clicking twice.
   */
  run_argument_pending?: boolean;
}

export { relativeTime };

export function FrameSummaryCard(props: FrameSummaryCardProps): ReactElement {
  const { summary, is_pinned, onOpen, onTogglePin, onRunArgument, run_argument_pending } = props;

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
        // Ignore clicks on either nested action button.
        const target = e.target as HTMLElement;
        if (target.closest('[data-testid="frame-card-pin"]')) return;
        if (target.closest('[data-testid="frame-card-run-argument"]')) return;
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
        <IconButton
          data-testid="frame-card-pin"
          active={is_pinned}
          aria-label={is_pinned ? "Unpin frame" : "Pin frame"}
          onClick={() => onTogglePin(summary.id, !is_pinned)}
          title={is_pinned ? "Unpin" : "Pin"}
          size="sm"
        >
          {is_pinned ? (
            <UIcon name="star" size={14} />
          ) : (
            <UIcon name="star" size={14} style={{ opacity: 0.35 }} />
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
        </IconButton>
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
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {onRunArgument ? (
            <button
              type="button"
              data-testid="frame-card-run-argument"
              disabled={run_argument_pending}
              onClick={(e) => {
                e.stopPropagation();
                if (run_argument_pending) return;
                onRunArgument(summary.id);
              }}
              aria-label="Open an argument session for this frame"
              aria-busy={run_argument_pending ? "true" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-1)",
                padding: "2px var(--space-2)",
                background: "transparent",
                border: "var(--border-thin) solid var(--color-border-subtle)",
                borderRadius: "var(--radius-pill)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
                cursor: run_argument_pending ? "default" : "pointer",
                opacity: run_argument_pending ? 0.6 : 1,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {run_argument_pending ? "Opening…" : "Run argument"}{" "}
              <UIcon name="arrow-right" size={12} />
            </button>
          ) : null}
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {relativeTime(summary.updated_at)}
          </span>
        </div>
      </footer>
    </article>
  );
}
