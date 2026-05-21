import type { ReactElement, ReactNode } from "react";
import type { NodeStatus, NodeType } from "@/schema";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "#components/ui/hover-card";
import { humanizeNodeType, StatusBadge } from "../../primitives";

export interface CanvasNodeHoverCardProps {
  node_type: NodeType | "premise_pill" | "Premise";
  primary_text?: string;
  status?: NodeStatus;
  children: ReactNode;
}

/**
 * Hover preview surface for canvas nodes. Most useful when the canvas is
 * zoomed out and a node's primary text is visually truncated — the hover
 * card shows the full text plus type + status without the user needing
 * to click into the inspector. Composes cleanly with the right-click
 * ContextMenu (different events, different surfaces).
 */
export function CanvasNodeHoverCard(props: CanvasNodeHoverCardProps): ReactElement {
  const { node_type, primary_text, status, children } = props;

  // Don't render the hover card if there's nothing useful to show beyond
  // what the visible node card already says.
  if (!primary_text && !status) {
    return <>{children}</>;
  }

  const type_label = node_type === "premise_pill" ? "Premise" : humanizeNodeType(node_type);

  return (
    <HoverCard openDelay={500} closeDelay={120}>
      <HoverCardTrigger asChild>
        <div>{children}</div>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72 p-3 text-sm">
        <div className="flex items-center justify-between gap-2 pb-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {type_label}
          </span>
          {status ? <StatusBadge status={status} /> : null}
        </div>
        {primary_text ? (
          <p className="m-0 break-words text-sm leading-snug text-foreground">{primary_text}</p>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
