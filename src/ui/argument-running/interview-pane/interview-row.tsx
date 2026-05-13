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
        gap: "2px",
        padding: "var(--space-2, 8px)",
        width: "100%",
        textAlign: "left",
        border: "none",
        background: selected
          ? "var(--color-background-accent, #dbeafe)"
          : recommended_next
            ? "var(--color-background-secondary, #f3f4f6)"
            : "transparent",
        cursor: "pointer",
        borderBottom: "var(--border-thin) solid var(--color-border-tertiary)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1, 4px)",
          fontSize: "var(--font-size-sm, 13px)",
          color: "var(--color-text-primary, #111827)",
          fontWeight: recommended_next ? 500 : 400,
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
        {recommended_next ? (
          <span
            data-testid="recommended-next-pill"
            style={{
              fontSize: "10px",
              padding: "1px 6px",
              borderRadius: "999px",
              background: "var(--color-background-accent, #dbeafe)",
              color: "var(--color-text-accent, #1d4ed8)",
            }}
          >
            recommended next
          </span>
        ) : null}
      </div>
      {breadcrumb ? (
        <span
          style={{
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-tertiary, #9ca3af)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {breadcrumb}
        </span>
      ) : null}
      <span
        style={{
          fontSize: "10px",
          color: "var(--color-text-tertiary, #9ca3af)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {item.reason}
      </span>
    </button>
  );
}
