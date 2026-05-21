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
      className="mb-3"
    >
      <h3 className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {header} · {props.candidates.length}
      </h3>
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
