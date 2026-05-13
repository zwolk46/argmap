import type { ReactElement } from "react";
import type { NodeRef, FrameVersion, Node } from "@/schema";
import type { InterviewItem } from "@/state";
import { TypeIcon } from "@/ui";

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

export function InterviewRow(props: InterviewRowProps): ReactElement {
  const { item, selected, recommended_next, on_click, frame_version } = props;
  const node = frame_version.nodes.find((n) => n.id === item.node_id);
  const statement = node ? statementPreviewFor(node) : item.node_id;
  const breadcrumb = buildBreadcrumb(frame_version, item.node_id);

  return (
    <button
      type="button"
      data-testid={`interview-row-${item.node_id}`}
      data-selected={selected ? "true" : "false"}
      data-recommended={recommended_next ? "true" : "false"}
      data-reason={item.reason}
      onClick={on_click}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        padding: "var(--space-2) var(--space-4)",
        width: "100%",
        textAlign: "left",
        border: "none",
        background: selected
          ? "var(--color-surface-selected)"
          : recommended_next
            ? "var(--color-mode-current-accent-bg)"
            : "transparent",
        cursor: "pointer",
        borderBottom: "var(--border-hairline) solid var(--color-border-subtle)",
        borderLeft: recommended_next
          ? "var(--border-medium) solid var(--color-mode-current-accent)"
          : "var(--border-medium) solid transparent",
        transition:
          "background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
      }}
      onMouseEnter={(e) => {
        if (!selected && !recommended_next) {
          (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected && !recommended_next) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }
      }}
    >
      {recommended_next ? (
        <span
          data-testid="recommended-next-pill"
          style={{
            fontSize: "var(--font-size-2xs)",
            color: "var(--color-mode-current-accent)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--letter-spacing-wide)",
            textTransform: "uppercase",
          }}
        >
          Recommended next
        </span>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-primary)",
          fontWeight: recommended_next
            ? "var(--font-weight-semibold)"
            : "var(--font-weight-regular)",
        }}
      >
        {node ? <TypeIcon node_type={node.type} size={12} /> : null}
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {statement}
        </span>
      </div>
      {breadcrumb ? (
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-tertiary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingLeft: "calc(12px + var(--space-2))",
          }}
        >
          {breadcrumb}
        </span>
      ) : null}
    </button>
  );
}
