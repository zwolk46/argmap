import type { ReactElement } from "react";
import type { OrphanCandidate, OrphanResolution } from "@/state";
import { OrphanCandidateRow } from "./orphan-candidate-row";

export interface OrphanCandidateGroupProps {
  carrier_kind: OrphanCandidate["carrier_kind"];
  candidates: OrphanCandidate[];
  resolutions: ReadonlyMap<string, OrphanResolution>;
  onResolutionChanged: (carrier_id: string, resolution: OrphanResolution) => void;
}

const HEADER_LABELS: Record<OrphanCandidate["carrier_kind"], string> = {
  premise: "Premises",
  argument_edge: "Argument edges",
  checkpoint_answer: "Checkpoint responses",
  interpretation_selection: "Interpretation selections",
  session_authority: "Session authorities",
};

export function OrphanCandidateGroup(props: OrphanCandidateGroupProps): ReactElement {
  const header = HEADER_LABELS[props.carrier_kind];
  return (
    <section
      data-testid="orphan-candidate-group"
      data-carrier-kind={props.carrier_kind}
      style={{ marginBottom: "var(--space-3, 12px)" }}
    >
      <header
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          padding: "var(--space-2, 8px) var(--space-3, 12px)",
        }}
      >
        {header} · {props.candidates.length}
      </header>
      {props.candidates.map((c) => {
        const r = props.resolutions.get(c.carrier_id);
        if (!r) return null;
        return (
          <OrphanCandidateRow
            key={c.carrier_id}
            candidate={c}
            resolution={r}
            onResolutionChanged={(next) => props.onResolutionChanged(c.carrier_id, next)}
          />
        );
      })}
    </section>
  );
}
