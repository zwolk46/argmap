import type { ReactElement } from "react";
import type { FrameId } from "@/schema";
import { ModeFlavorChip } from "../chrome";
import { Button, IconButton, Spinner, relativeTime } from "../primitives";
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

  const display_title = summary.title || "Untitled frame";
  return (
    <article
      data-testid="frame-summary-card"
      data-frame-id={summary.id}
      className="frame-card argmap-card"
      aria-label={display_title}
      onClick={(e) => {
        // Card is clickable for mouse users (large click target). Keyboard
        // users tab to the title-button, pin, and run-argument controls
        // directly — the card no longer carries role="button" / tabIndex
        // because WAI-ARIA forbids interactive descendants of a button.
        const target = e.target as HTMLElement;
        if (target.closest("button")) return;
        onOpen(summary.id);
      }}
      style={{ minWidth: 220, position: "relative", cursor: "pointer" }}
    >
      <header className="frame-card-head" style={{ minHeight: "44px" }}>
        <h3
          className="frame-card-title"
          style={{
            flex: 1,
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            // Modern overflow-wrap so a single very long word (e.g., a
            // pasted URL used as a frame title) breaks instead of pushing
            // the card layout off-screen.
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          <button
            type="button"
            data-testid="frame-card-open"
            className="frame-card-title-button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(summary.id);
            }}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "inline",
              font: "inherit",
              color: "inherit",
              textAlign: "left",
            }}
          >
            {display_title}
          </button>
        </h3>
        <IconButton
          data-testid="frame-card-pin"
          active={is_pinned}
          aria-label={is_pinned ? "Unpin frame" : "Pin frame"}
          onClick={() => onTogglePin(summary.id, !is_pinned)}
          size="sm"
        >
          {is_pinned ? (
            <UIcon name="star" size={14} />
          ) : (
            <UIcon name="star" size={14} style={{ opacity: 0.35 }} />
          )}
          {/* §13 #16: aria-pressed on IconButton already carries the state;
              the literal-glyph sr-only span double-announced "★" and was
              aria-hidden anyway. Removed — keep one carrier (aria-pressed). */}
        </IconButton>
      </header>
      <footer className="frame-card-foot">
        <ModeFlavorChip mode={summary.mode} flavor={summary.flavor} />
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {onRunArgument ? (
            <Button
              size="sm"
              variant="ghost"
              data-testid="frame-card-run-argument"
              disabled={run_argument_pending}
              onClick={(e) => {
                e.stopPropagation();
                if (run_argument_pending) return;
                onRunArgument(summary.id);
              }}
              aria-label="Open an argument session for this frame"
              aria-busy={run_argument_pending ? "true" : undefined}
              leading={run_argument_pending ? <Spinner size={12} /> : undefined}
              trailing={run_argument_pending ? undefined : <UIcon name="arrow-right" size={12} />}
            >
              {run_argument_pending ? "Opening…" : "Run argument"}
            </Button>
          ) : null}
          <span
            className="argmap-number-meta"
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {relativeTime(summary.updated_at)}
          </span>
        </div>
      </footer>
    </article>
  );
}
