import * as React from "react";
import type { NodeRef, Premise, PremiseKind } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { useAiSuggestion } from "@/ui";
import { PremiseReuseSuggestions } from "./premise-reuse-suggestions";

export type PremiseAuthoringResult =
  | { kind: "new"; premise: Premise }
  | { kind: "reused"; premise_id: NodeRef };

export interface PremiseAuthoringSectionProps {
  value: PremiseAuthoringResult | null;
  on_change: (next: PremiseAuthoringResult | null) => void;
  default_kind?: PremiseKind;
  reuse_context?: string;
  enable_g11?: boolean;
}

const PREMISE_KIND_OPTIONS: ReadonlyArray<PremiseKind> = [
  "stipulated",
  "found",
  "disputed",
  "procedural",
  "empirical",
  "definitional",
  "normative",
  "observation",
  "value",
  "assumption",
];

export function PremiseAuthoringSection(props: PremiseAuthoringSectionProps): React.ReactElement {
  const { value, on_change, default_kind = "found", reuse_context, enable_g11 } = props;
  const { now, generateId } = useRepository();
  const premises = useSessionStore((s) => s.session?.premises ?? []);
  const aiSuggestion = useAiSuggestion("session");

  const [statement, setStatement] = React.useState(
    value && value.kind === "new" ? value.premise.statement : "",
  );
  const [kind, setKind] = React.useState<PremiseKind>(
    value && value.kind === "new" ? value.premise.kind : default_kind,
  );
  const [reused_id, setReusedId] = React.useState<NodeRef | null>(
    value && value.kind === "reused" ? value.premise_id : null,
  );

  function emit_new(next_statement: string, next_kind: PremiseKind): void {
    if (next_statement.trim().length === 0) {
      on_change(null);
      return;
    }
    const ts = now();
    const premise: Premise = {
      id: generateId(),
      type: "Premise",
      layer: "argument",
      statement: next_statement,
      kind: next_kind,
      created_at: ts,
      updated_at: ts,
    };
    on_change({ kind: "new", premise });
  }

  function on_statement_change(next: string): void {
    setStatement(next);
    if (reused_id) return;
    emit_new(next, kind);
  }

  function on_kind_change(next: PremiseKind): void {
    setKind(next);
    if (reused_id) return;
    emit_new(statement, next);
  }

  function on_select_reuse(id: string): void {
    setReusedId(id);
    on_change({ kind: "reused", premise_id: id });
  }

  function on_clear_reuse(): void {
    setReusedId(null);
    emit_new(statement, kind);
  }

  return (
    <div
      data-testid="premise-authoring-section"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2, 8px)",
      }}
    >
      <label
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        Premise statement
        <textarea
          data-testid="premise-statement"
          value={
            reused_id ? (premises.find((p) => p.id === reused_id)?.statement ?? "") : statement
          }
          disabled={!!reused_id}
          placeholder="What does this premise assert?"
          onChange={(e) => on_statement_change(e.target.value)}
          style={{
            width: "100%",
            minHeight: 56,
            padding: "6px 8px",
            border: "var(--border-thin) solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md, 6px)",
            fontSize: "var(--font-size-xs, 11px)",
            fontFamily: "inherit",
            background: reused_id
              ? "var(--color-surface-pane-secondary, #fafafa)"
              : "var(--color-surface-elevated, #ffffff)",
          }}
        />
      </label>
      <label
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
        }}
      >
        Kind
        <select
          data-testid="premise-kind"
          value={reused_id ? (premises.find((p) => p.id === reused_id)?.kind ?? kind) : kind}
          disabled={!!reused_id}
          onChange={(e) => on_kind_change(e.target.value as PremiseKind)}
          style={{
            width: "100%",
            padding: "4px 6px",
            border: "var(--border-thin) solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md, 6px)",
            fontSize: "var(--font-size-xs, 11px)",
            background: reused_id
              ? "var(--color-surface-pane-secondary, #fafafa)"
              : "var(--color-surface-elevated, #ffffff)",
          }}
        >
          {PREMISE_KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      {reused_id ? (
        <button
          type="button"
          data-testid="premise-clear-reuse"
          onClick={on_clear_reuse}
          style={{
            background: "transparent",
            border: "var(--border-thin) solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 11px)",
            padding: "2px 8px",
            alignSelf: "flex-start",
            color: "var(--color-text-secondary, #6b7280)",
          }}
        >
          Create new instead
        </button>
      ) : (
        <PremiseReuseSuggestions
          draft_text={statement}
          context={reuse_context}
          premises={premises}
          on_select={on_select_reuse}
        />
      )}
      {enable_g11 ? (
        <button
          type="button"
          data-testid="premise-draft-from-fact-pattern"
          onClick={() => aiSuggestion.invoke("G11", { context: reuse_context })}
          disabled={aiSuggestion.status === "invoking"}
          style={{
            background: "var(--color-background-accent, #dbeafe)",
            color: "var(--color-text-accent, #1d4ed8)",
            border: "none",
            borderRadius: "var(--border-radius-md, 6px)",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 11px)",
            padding: "4px 8px",
            alignSelf: "flex-start",
          }}
        >
          ✦ Draft from fact pattern
        </button>
      ) : null}
    </div>
  );
}
