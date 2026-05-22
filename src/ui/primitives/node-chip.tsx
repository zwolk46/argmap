import type { ReactElement } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import type { Node, NodeRef } from "@/schema";
import { humanizeNodeType, nodeLabel } from "./humanize";
import { TypeIcon } from "./type-icon";
import { cn } from "#lib/utils";

export interface NodeChipProps {
  /** Node referenced by id. Either provide `node_id` + `node` (already
   *  resolved) or `node_id` + `nodes` (the chip resolves it itself). */
  node_id: NodeRef;
  /** Optional pre-resolved Node. */
  node?: Node;
  /** Optional resolver source — the chip looks up the id in this list. Used
   *  by editors that already have a filtered "available" list in hand. */
  nodes?: ReadonlyArray<Node>;
  /** Fires when the user clicks the chip. When provided, the chip renders
   *  as a button (with hover affordance + arrow-out icon) and announces a
   *  navigation intent. Without this, it's a static badge. */
  on_navigate?: (node_id: NodeRef) => void;
  /** Truncation limit for the displayed label. */
  max_chars?: number;
  /** Extra Tailwind classes for spacing tweaks at the call site. */
  className?: string;
}

/**
 * Compact node-reference chip used wherever a node id surfaces in the UI
 * (logical-gate slots, term linked_to, checkpoint option targets, etc.).
 *
 * Behavior:
 *  - Displays the node's type icon + a short human-readable label
 *    (see `nodeLabel` in humanize.ts).
 *  - When `on_navigate` is wired, the chip is a button: it dispatches the
 *    navigate intent on click or Enter/Space. The parent layer is
 *    responsible for selecting + zooming the canvas.
 *  - When the referenced node can't be resolved (deleted, dangling ref),
 *    the chip renders a dim "Missing node" state instead of silently
 *    swallowing the id — the user sees that something is wrong.
 *
 * Styling notes: matches the existing primary/10 chip pattern already used
 * by SlotRow / TermEditor so the swap-in is visually continuous. Hover and
 * focus-visible add a subtle outline to read as interactive. Reduced-motion
 * users get a static state — no fade-in transitions.
 */
export function NodeChip(props: NodeChipProps): ReactElement {
  const { node_id, node, nodes, on_navigate, max_chars, className } = props;
  const resolved = node ?? nodes?.find((n) => n.id === node_id);
  const label = resolved ? nodeLabel(resolved, max_chars) : "Missing node";
  const type_label = resolved ? humanizeNodeType(resolved.type) : "Missing reference";
  const is_navigable = !!on_navigate && !!resolved;

  const content = (
    <>
      {resolved ? (
        <span className="inline-flex shrink-0 items-center opacity-80">
          <TypeIcon node_type={resolved.type} />
        </span>
      ) : null}
      <span className="truncate">{label}</span>
      {is_navigable ? (
        <ArrowSquareOut
          size={12}
          aria-hidden
          className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-70 group-focus-visible:opacity-70"
        />
      ) : null}
    </>
  );

  const base =
    "inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary";

  if (is_navigable) {
    return (
      <button
        type="button"
        data-testid="node-chip"
        data-node-id={node_id}
        title={`${type_label} — click to focus on canvas`}
        aria-label={`${type_label}: ${label}. Open in canvas.`}
        onClick={(e) => {
          e.stopPropagation();
          on_navigate!(node_id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            on_navigate!(node_id);
          }
        }}
        className={cn(
          base,
          "group cursor-pointer transition-colors duration-150 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      data-testid="node-chip"
      data-node-id={node_id}
      title={type_label}
      className={cn(base, !resolved ? "bg-muted text-muted-foreground" : "", className)}
    >
      {content}
    </span>
  );
}
