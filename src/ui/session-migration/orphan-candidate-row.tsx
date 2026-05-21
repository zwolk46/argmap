import type { ReactElement } from "react";
import type { NodeRef } from "@/schema";
import type { OrphanCandidate, OrphanResolution } from "@/state";
import { ResolutionPicker } from "./resolution-picker";

export interface OrphanCandidateRowProps {
  candidate: OrphanCandidate;
  resolution: OrphanResolution;
  onResolutionChanged: (resolution: OrphanResolution) => void;
}

function defaultReattachTarget(candidate: OrphanCandidate): NodeRef | undefined {
  return candidate.reattach_candidates && candidate.reattach_candidates.length > 0
    ? (candidate.reattach_candidates[0].target_node_id as NodeRef)
    : undefined;
}

export function OrphanCandidateRow(props: OrphanCandidateRowProps): ReactElement {
  const { candidate, resolution, onResolutionChanged } = props;

  function handleKindChange(kind: OrphanResolution["kind"]): void {
    if (kind === "reattach") {
      onResolutionChanged({
        kind: "reattach",
        source_node_id: candidate.source_node_id,
        target_node_id: defaultReattachTarget(candidate),
      });
    } else {
      onResolutionChanged({ kind, source_node_id: candidate.source_node_id });
    }
  }

  function handleTargetChange(target_node_id: NodeRef): void {
    onResolutionChanged({
      kind: "reattach",
      source_node_id: candidate.source_node_id,
      target_node_id,
    });
  }

  return (
    <div
      data-testid="orphan-candidate-row"
      data-carrier-id={candidate.carrier_id}
      className="flex flex-col gap-1 border-t px-3 py-2"
    >
      <div className="flex items-center gap-3">
        <span data-testid="candidate-display-summary" className="flex-1 text-sm">
          {candidate.display_summary}
        </span>
        <ResolutionPicker
          value={resolution.kind}
          onChange={handleKindChange}
          reattach_available={(candidate.reattach_candidates?.length ?? 0) > 0}
        />
      </div>
      {resolution.kind === "reattach" &&
      candidate.reattach_candidates &&
      candidate.reattach_candidates.length > 1 ? (
        <select
          data-testid="reattach-target-select"
          value={resolution.target_node_id ?? ""}
          onChange={(e) => handleTargetChange(e.target.value as NodeRef)}
          className="self-end h-8 w-auto rounded-md border border-input bg-input/30 px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {candidate.reattach_candidates.map((c) => (
            <option key={c.target_node_id} value={c.target_node_id}>
              {c.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
