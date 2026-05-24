import * as React from "react";
import type { ReactElement } from "react";
import type { Edge, Node, NodeRef, FrameVersion } from "@/schema";
import { useRepository, useSessionStore } from "@/state";
import { Button } from "#components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#components/ui/popover";
import { LinkSimple } from "@phosphor-icons/react";
import { statementPreviewFor } from "../interview-pane/interview-row";

type AttachableEdgeType = "ANSWERS" | "SUPPORTS" | "CONTRADICTS";

interface CandidateEdge {
  node: Node;
  edge_type: AttachableEdgeType;
  selected_option_id?: string;
  option_label?: string;
}

const EMPTY_EDGES: ReadonlyArray<Edge> = [];

function candidatesFor(
  premise_id: string,
  frame_version: FrameVersion,
  existing_edges: ReadonlyArray<Edge>,
): ReadonlyArray<CandidateEdge> {
  // Already-attached (premise_id, target, type, option) tuples → suppress.
  const taken = new Set<string>();
  for (const e of existing_edges) {
    if (e.source !== premise_id) continue;
    if (e.type === "ANSWERS") {
      taken.add(`${e.target}|ANSWERS|${e.selected_option_id ?? ""}`);
    } else if (e.type === "SUPPORTS" || e.type === "CONTRADICTS") {
      taken.add(`${e.target}|${e.type}|`);
    }
  }

  const out: CandidateEdge[] = [];
  // Sort by id so the list is deterministic across renders.
  const sorted_nodes = [...frame_version.nodes].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const node of sorted_nodes) {
    if (node.type === "Checkpoint") {
      // ANSWERS: one entry per option (each option is a distinct edge target).
      for (const opt of node.options) {
        const key = `${node.id}|ANSWERS|${opt.id}`;
        if (taken.has(key)) continue;
        out.push({
          node,
          edge_type: "ANSWERS",
          selected_option_id: opt.id,
          option_label: opt.label,
        });
      }
      const cKey = `${node.id}|CONTRADICTS|`;
      if (!taken.has(cKey)) {
        out.push({ node, edge_type: "CONTRADICTS" });
      }
    } else if (node.type === "Interpretation" || node.type === "Conclusion") {
      const sKey = `${node.id}|SUPPORTS|`;
      if (!taken.has(sKey)) out.push({ node, edge_type: "SUPPORTS" });
      const cKey = `${node.id}|CONTRADICTS|`;
      if (!taken.has(cKey)) out.push({ node, edge_type: "CONTRADICTS" });
    }
  }
  return out;
}

export interface PremiseAttachPickerProps {
  premise_id: string;
}

export function PremiseAttachPicker(
  props: PremiseAttachPickerProps,
): ReactElement {
  const { premise_id } = props;
  const { session_store, now, generateId } = useRepository();
  const frame_version = useSessionStore(
    (s) => s.session?.frame_version_snapshot ?? null,
  );
  const argument_edges = useSessionStore(
    (s) => s.session?.argument_edges ?? EMPTY_EDGES,
  );
  const [open, setOpen] = React.useState(false);

  const candidates = React.useMemo(
    () =>
      frame_version
        ? candidatesFor(premise_id, frame_version, argument_edges)
        : [],
    [premise_id, frame_version, argument_edges],
  );

  function on_attach(c: CandidateEdge): void {
    const ts = now();
    const id = generateId();
    let edge: Edge;
    if (c.edge_type === "ANSWERS") {
      edge = {
        id,
        type: "ANSWERS",
        layer: "argument",
        source: premise_id as NodeRef,
        target: c.node.id,
        selected_option_id: c.selected_option_id!,
        created_at: ts,
        updated_at: ts,
      };
    } else if (c.edge_type === "SUPPORTS") {
      edge = {
        id,
        type: "SUPPORTS",
        layer: "argument",
        source: premise_id as NodeRef,
        target: c.node.id,
        created_at: ts,
        updated_at: ts,
      };
    } else {
      edge = {
        id,
        type: "CONTRADICTS",
        layer: "argument",
        source: premise_id as NodeRef,
        target: c.node.id,
        created_at: ts,
        updated_at: ts,
      };
    }
    session_store.getState().applyPatch({ kind: "argument_edge_added", edge });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Attach to node"
          title="Attach to node"
          data-testid={`premise-attach-${premise_id}`}
        >
          <LinkSimple size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={4}>
        <div className="border-b p-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Attach premise to…
          </span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {!frame_version ? (
            <div className="p-3 text-xs text-muted-foreground">
              Frame snapshot unavailable.
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              No more attachment targets available — this premise is attached to
              every eligible node.
            </div>
          ) : (
            <ul className="flex flex-col" role="listbox">
              {candidates.map((c, i) => (
                <li
                  key={`${c.node.id}-${c.edge_type}-${c.selected_option_id ?? ""}-${i}`}
                  className="border-b last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => on_attach(c)}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                    data-testid={`premise-attach-target-${c.node.id}-${c.edge_type}-${c.selected_option_id ?? ""}`}
                  >
                    <span className="line-clamp-2 text-foreground">
                      {statementPreviewFor(c.node) || c.node.id}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.node.type}
                      {" · "}
                      {c.edge_type.toLowerCase()}
                      {c.option_label ? ` "${c.option_label}"` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
