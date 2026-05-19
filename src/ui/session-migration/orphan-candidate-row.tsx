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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        padding: "var(--space-2) var(--space-3)",
        borderTop: "var(--border-hairline) solid var(--color-border-subtle)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span
          data-testid="candidate-display-summary"
          style={{ flex: 1, fontSize: "var(--font-size-sm)" }}
        >
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
          className="argmap-input"
          style={{ alignSelf: "flex-end", width: "auto", fontSize: "var(--font-size-sm)" }}
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
