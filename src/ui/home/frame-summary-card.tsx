import type { ReactElement } from "react";
import { Star, ArrowRight } from "@phosphor-icons/react";
import type { FrameId } from "@/schema";
import { ModeFlavorChip } from "../chrome";
import { IconButton, Spinner, relativeTime } from "../primitives";
import { Button } from "#components/ui/button";

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
   * frame (auto-creating one if none exists).
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
      className="relative flex min-w-[220px] cursor-pointer flex-col gap-3 rounded-2xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/30"
    >
      <header className="flex min-h-[44px] items-start justify-between gap-2">
        <h3 className="m-0 line-clamp-2 flex-1 break-words text-sm font-medium leading-snug [overflow-wrap:anywhere]">
          <button
            type="button"
            data-testid="frame-card-open"
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
          <Star
            size={14}
            weight={is_pinned ? "fill" : "regular"}
            className={is_pinned ? undefined : "opacity-35"}
          />
        </IconButton>
      </header>
      <footer className="flex items-center justify-between gap-2">
        {/* min-w-0 lets a long mode/flavor label shrink and truncate so it
            doesn't push the timestamp + run-argument cluster off the card. */}
        <div className="min-w-0 overflow-hidden">
          <ModeFlavorChip mode={summary.mode} flavor={summary.flavor} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            >
              {run_argument_pending ? <Spinner size={12} decorative /> : null}
              {run_argument_pending ? "Opening…" : "Run argument"}
              {run_argument_pending ? null : <ArrowRight size={12} data-icon="inline-end" />}
            </Button>
          ) : null}
          <span className="text-xs tabular-nums text-[var(--color-text-tertiary)]">
            {relativeTime(summary.updated_at)}
          </span>
        </div>
      </footer>
    </article>
  );
}
