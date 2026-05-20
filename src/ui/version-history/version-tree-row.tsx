import * as React from "react";
import type { ReactElement } from "react";
import { Star } from "@phosphor-icons/react";
import { Badge } from "#components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "#components/ui/tooltip";
import { cn } from "#lib/utils";
import { relativeTime } from "../primitives";
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

export const VersionTreeRow = React.memo(VersionTreeRowImpl);

function VersionTreeRowImpl(props: VersionTreeRowProps): ReactElement {
  const { summary, depth, is_current, is_milestone, is_authored_against, is_selected, on_select } =
    props;

  const marker_color = is_current
    ? "var(--color-mode-current-accent)"
    : is_milestone
      ? "var(--color-milestone-star)"
      : "var(--color-text-tertiary)";
  const marker_glyph = is_milestone ? "★" : "●";
  const change_summary_text = summary.change_summary;
  const is_autosave = !change_summary_text;
  const rel = relativeTime(summary.created_at);

  // Inline style for depth padding + selected/current background. Depth is a
  // runtime value (DFS-derived) that Tailwind cannot express; the other
  // visual treatments fall through Tailwind classes.
  const rowStyle: React.CSSProperties = {
    paddingLeft: `calc(var(--space-3) + ${depth} * var(--space-4))`,
  };
  if (is_selected) {
    rowStyle.background = "var(--color-surface-selected)";
  } else if (is_current && is_milestone) {
    rowStyle.background = "var(--color-mode-current-accent-bg)";
  }
  if (depth > 0) {
    rowStyle.borderLeft = "var(--border-hairline) solid var(--color-border-subtle)";
  }

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
      className={cn(
        "relative flex w-full items-center gap-2 rounded-md border-0 px-3 py-2 text-left text-sm text-foreground transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
      style={rowStyle}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
        style={{ color: marker_color }}
      >
        {is_milestone ? (
          <Star weight="fill" size={12} />
        ) : (
          <span className="inline-block size-1.5 rounded-full bg-current" />
        )}
        <span className="sr-only">{marker_glyph}</span>
      </span>
      <span className="font-mono text-xs font-medium text-foreground">
        v{summary.version_number}
      </span>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground/80">
              {rel}
            </span>
          </TooltipTrigger>
          <TooltipContent>{summary.created_at}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span
        className={cn(
          "flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
          is_autosave ? "italic text-muted-foreground/80" : "text-muted-foreground",
        )}
      >
        {change_summary_text ?? "auto-save"}
      </span>
      {is_authored_against ? (
        <Badge
          variant="secondary"
          className="px-1 py-px text-[10px]"
          style={{
            background: "var(--color-mode-current-accent-bg)",
            color: "var(--color-mode-current-accent)",
          }}
        >
          <span data-testid="authored-against-pill">session here</span>
        </Badge>
      ) : null}
    </button>
  );
}
