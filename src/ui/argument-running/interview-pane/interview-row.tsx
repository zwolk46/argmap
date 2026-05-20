import * as React from "react";
import type { ReactElement } from "react";
import type { NodeRef, FrameVersion, Node } from "@/schema";
import type { InterviewItem } from "@/state";
import { TypeIcon } from "@/ui";
import { cn } from "#lib/utils";

const STRUCTURAL_PARENT_EDGES: ReadonlyArray<string> = [
  "DECOMPOSES_INTO",
  "TURNS_ON",
  "INTERPRETED_AS",
  "LEADS_TO",
  "GATES",
];

export interface InterviewRowProps {
  item: InterviewItem;
  selected: boolean;
  recommended_next: boolean;
  on_click: () => void;
  frame_version: FrameVersion;
}

export function statementPreviewFor(node: Node): string {
  if (node.type === "Checkpoint") return node.question;
  if (node.type === "Term") return node.name;
  if (node.type === "Interpretation") return node.statement;
  if (node.type === "SubQuestion" || node.type === "RootQuestion") return node.statement;
  if (node.type === "Conclusion") return node.statement;
  if (node.type === "Premise") return node.statement;
  return node.id;
}

export function buildBreadcrumb(frame_version: FrameVersion, node_id: NodeRef): string {
  const parent_of = new Map<NodeRef, NodeRef>();
  for (const e of frame_version.edges) {
    if (STRUCTURAL_PARENT_EDGES.includes(e.type)) {
      parent_of.set(e.target, e.source);
    }
  }
  const by_id = new Map<NodeRef, Node>(frame_version.nodes.map((n) => [n.id, n]));
  const labels: string[] = [];
  let cur = parent_of.get(node_id);
  const seen = new Set<NodeRef>([node_id]);
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const n = by_id.get(cur);
    if (n) labels.unshift(statementPreviewFor(n));
    cur = parent_of.get(cur);
  }
  return labels.join(" → ");
}

// Wrapped in React.memo because the interview-pane parent re-renders on
// every session patch (premise edit, status recompute) but most rows
// haven't changed. Props are largely id-stable; the only thing that
// changes per-edit is `selected` / `recommended_next` for at most two
// rows. Without memo, every premise keystroke re-renders every row.
export const InterviewRow = React.memo(InterviewRowImpl);

function InterviewRowImpl(props: InterviewRowProps): ReactElement {
  const { item, selected, recommended_next, on_click, frame_version } = props;
  const node = frame_version.nodes.find((n) => n.id === item.node_id);
  const statement = node ? statementPreviewFor(node) : item.node_id;
  const breadcrumb = buildBreadcrumb(frame_version, item.node_id);

  // KEEP RAW: interview list row — full-width clickable row with custom
  // selected/recommended states driven by domain mode-current-accent token.
  return (
    <button
      type="button"
      data-testid={`interview-row-${item.node_id}`}
      data-selected={selected ? "true" : "false"}
      data-recommended={recommended_next ? "true" : "false"}
      data-reason={item.reason}
      onClick={on_click}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-1 border-0 border-b px-4 py-2 text-left transition-colors",
        !selected && !recommended_next && "hover:bg-muted/50",
      )}
      style={{
        background: selected
          ? "var(--color-surface-selected)"
          : recommended_next
            ? "var(--color-mode-current-accent-bg)"
            : "transparent",
        borderLeft:
          selected || recommended_next
            ? "var(--border-medium) solid var(--color-mode-current-accent)"
            : "var(--border-medium) solid transparent",
      }}
    >
      {recommended_next ? (
        <span
          data-testid="recommended-next-pill"
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-mode-current-accent)" }}
        >
          Recommended next
        </span>
      ) : null}
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-foreground",
          recommended_next ? "font-semibold" : "font-normal",
        )}
      >
        {node ? <TypeIcon node_type={node.type} size={12} /> : null}
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{statement}</span>
      </div>
      {breadcrumb ? (
        <span
          className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground/80"
          style={{ paddingLeft: "calc(12px + var(--space-2))" }}
        >
          {breadcrumb}
        </span>
      ) : null}
    </button>
  );
}
