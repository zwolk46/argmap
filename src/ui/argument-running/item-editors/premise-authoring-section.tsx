import * as React from "react";
import type { NodeRef, Premise, PremiseKind } from "@/schema";
import { useSessionStore, useRepository } from "@/state";
import { useAiSuggestion } from "@/ui";
import { AiSparkle } from "../../primitives";
import { Button } from "#components/ui/button";
import { Label } from "#components/ui/label";
import { Textarea } from "#components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#components/ui/select";
import { cn } from "#lib/utils";
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

const PREMISE_KIND_LABELS: Readonly<Record<PremiseKind, string>> = {
  stipulated: "Stipulated (agreed by parties)",
  found: "Found (by fact-finder)",
  disputed: "Disputed",
  procedural: "Procedural",
  empirical: "Empirical (factual)",
  definitional: "Definitional",
  normative: "Normative (value-based)",
  observation: "Observation",
  value: "Value judgment",
  assumption: "Assumption",
};

// Stable fallback so the Zustand selector never returns a fresh array,
// which would trip React's "getSnapshot must be cached" infinite-loop.
const EMPTY_PREMISES: ReadonlyArray<Premise> = [];

export function PremiseAuthoringSection(props: PremiseAuthoringSectionProps): React.ReactElement {
  const { value, on_change, default_kind = "found", reuse_context, enable_g11 } = props;
  const { now, generateId } = useRepository();
  const premises = useSessionStore((s) => s.session?.premises ?? EMPTY_PREMISES);
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
  // H9: surface "Required" only after the user has touched the field. Without
  // a touched gate, the field renders error-styled on first paint.
  const [touched, setTouched] = React.useState(false);
  const show_required = touched && !reused_id && statement.trim().length === 0;
  // P1: stabilize Premise.id + created_at across keystrokes. Without this,
  // every keystroke minted a fresh id and a fresh timestamp, producing
  // churn (parent re-renders) and a created_at that reflected the last
  // keystroke rather than the original draft. We seed the first non-empty
  // statement and reuse those values for the lifetime of the draft.
  const draft_meta_ref = React.useRef<{ id: string; created_at: string } | null>(null);

  function emit_new(next_statement: string, next_kind: PremiseKind): void {
    if (next_statement.trim().length === 0) {
      on_change(null);
      // Reset the draft seed when the draft is cleared.
      draft_meta_ref.current = null;
      return;
    }
    if (!draft_meta_ref.current) {
      draft_meta_ref.current = { id: generateId(), created_at: now() };
    }
    const premise: Premise = {
      id: draft_meta_ref.current.id,
      type: "Premise",
      layer: "argument",
      statement: next_statement,
      kind: next_kind,
      created_at: draft_meta_ref.current.created_at,
      updated_at: now(),
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

  const display_statement = reused_id
    ? (premises.find((p) => p.id === reused_id)?.statement ?? "")
    : statement;
  const display_kind = reused_id ? (premises.find((p) => p.id === reused_id)?.kind ?? kind) : kind;

  return (
    <div data-testid="premise-authoring-section" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="premise-statement" className="text-xs text-muted-foreground">
          Premise statement
        </Label>
        <Textarea
          id="premise-statement"
          data-testid="premise-statement"
          value={display_statement}
          disabled={!!reused_id}
          placeholder="What does this premise assert?"
          onBlur={() => setTouched(true)}
          onChange={(e) => on_statement_change(e.target.value)}
          aria-invalid={show_required || undefined}
          aria-describedby={show_required ? "premise-statement-required" : undefined}
          className={cn("text-xs", reused_id && "bg-muted", show_required && "border-destructive")}
          style={{ minHeight: 56 }}
        />
        {show_required && (
          <span
            id="premise-statement-required"
            data-testid="premise-statement-required"
            className="mt-0.5 block text-[10px] text-destructive"
          >
            Required
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="premise-kind" className="text-xs text-muted-foreground">
          Kind
        </Label>
        <Select
          value={display_kind}
          disabled={!!reused_id}
          onValueChange={(v) => on_kind_change(v as PremiseKind)}
        >
          <SelectTrigger
            id="premise-kind"
            data-testid="premise-kind"
            className={cn("w-full text-xs", reused_id && "bg-muted")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PREMISE_KIND_OPTIONS.map((k) => (
              <SelectItem key={k} value={k}>
                {PREMISE_KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {reused_id ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="premise-clear-reuse"
          onClick={on_clear_reuse}
          className="self-start"
        >
          Create new instead
        </Button>
      ) : (
        <PremiseReuseSuggestions
          draft_text={statement}
          context={reuse_context}
          premises={premises}
          on_select={on_select_reuse}
        />
      )}
      {enable_g11 && aiSuggestion.enabled ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          data-testid="premise-draft-from-fact-pattern"
          onClick={() => aiSuggestion.invoke("G11", { context: reuse_context })}
          disabled={aiSuggestion.status === "invoking"}
          className="self-start"
        >
          <AiSparkle />
          Draft from fact pattern
        </Button>
      ) : null}
    </div>
  );
}
