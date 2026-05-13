import type { ReactElement } from "react";
import type { OrphanCandidate, OrphanResolution } from "@/state";
import { OrphanCandidateGroup } from "./orphan-candidate-group";

const CARRIER_KIND_ORDER: OrphanCandidate["carrier_kind"][] = [
  "checkpoint_answer",
  "interpretation_selection",
  "argument_edge",
  "premise",
  "session_authority",
];

export type MigrationBodyPhase =
  | { kind: "loading" }
  | {
      kind: "loaded";
      candidates: OrphanCandidate[];
      resolutions: ReadonlyMap<string, OrphanResolution>;
    }
  | { kind: "loaded_empty" }
  | { kind: "failed"; error: { kind: string; message: string } };

export interface MigrationDialogBodyProps {
  phase: MigrationBodyPhase;
  onResolutionChanged: (carrier_id: string, resolution: OrphanResolution) => void;
  onRetry?: () => void;
}

export function partitionByKind(
  candidates: OrphanCandidate[],
): Map<OrphanCandidate["carrier_kind"], OrphanCandidate[]> {
  const buckets = new Map<OrphanCandidate["carrier_kind"], OrphanCandidate[]>();
  for (const c of candidates) {
    const arr = buckets.get(c.carrier_kind) ?? [];
    arr.push(c);
    buckets.set(c.carrier_kind, arr);
  }
  return buckets;
}

export function MigrationDialogBody(props: MigrationDialogBodyProps): ReactElement {
  const { phase } = props;

  if (phase.kind === "loading") {
    return (
      <div
        data-testid="migration-loading"
        style={{
          padding: "var(--space-4, 16px)",
          textAlign: "center",
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        Computing orphan candidates…
      </div>
    );
  }

  if (phase.kind === "loaded_empty") {
    return (
      <div
        data-testid="migration-empty"
        style={{
          padding: "var(--space-4, 16px)",
          textAlign: "center",
          color: "var(--color-text-secondary, #6b7280)",
          fontSize: "var(--font-size-sm, 13px)",
        }}
      >
        This session has no orphans. Migrating is safe.
      </div>
    );
  }

  if (phase.kind === "failed") {
    return (
      <div data-testid="migration-failed" style={{ padding: "var(--space-4, 16px)" }}>
        <div
          style={{
            color: "var(--color-severity-error, #dc2626)",
            fontSize: "var(--font-size-sm, 13px)",
          }}
        >
          {phase.error.message}
        </div>
        {props.onRetry ? (
          <button
            type="button"
            data-testid="migration-retry"
            onClick={props.onRetry}
            style={{ marginTop: "var(--space-2, 8px)" }}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const buckets = partitionByKind(phase.candidates);
  return (
    <div data-testid="migration-loaded">
      {CARRIER_KIND_ORDER.map((kind) => {
        const arr = buckets.get(kind);
        if (!arr || arr.length === 0) return null;
        return (
          <OrphanCandidateGroup
            key={kind}
            carrier_kind={kind}
            candidates={arr}
            resolutions={phase.resolutions}
            onResolutionChanged={props.onResolutionChanged}
          />
        );
      })}
    </div>
  );
}
