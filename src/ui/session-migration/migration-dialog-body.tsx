import type { ReactElement } from "react";
import type { OrphanCandidate, OrphanResolution } from "@/state";
import { Button, InlineEmpty, InlineLoading } from "../primitives";
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
    return <InlineLoading testId="migration-loading" label="Checking what changed…" />;
  }

  if (phase.kind === "loaded_empty") {
    return (
      <InlineEmpty testId="migration-empty">
        Nothing in this session points at frame nodes that have moved or been removed. Migrating is
        safe — no manual decisions needed.
      </InlineEmpty>
    );
  }

  if (phase.kind === "failed") {
    return (
      <div data-testid="migration-failed" style={{ padding: "var(--space-4)" }}>
        <div
          style={{
            color: "var(--color-severity-error)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          {phase.error.message}
        </div>
        {props.onRetry ? (
          <Button
            variant="secondary"
            size="md"
            data-testid="migration-retry"
            onClick={props.onRetry}
            style={{ marginTop: "var(--space-2)" }}
          >
            Retry
          </Button>
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
