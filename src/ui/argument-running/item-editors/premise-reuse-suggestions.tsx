import type { ReactElement } from "react";
import type { Premise, PremiseKind } from "@/schema";

export const REUSE_SIMILARITY_THRESHOLD = 0.2;
export const REUSE_TOP_N = 5;
const DAY_MS = 86_400_000;

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "or",
  "to",
  "in",
  "is",
  "for",
  "on",
  "with",
  "by",
  "that",
  "it",
  "this",
  "as",
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0 && !STOP_WORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersect = 0;
  for (const x of a) if (b.has(x)) intersect += 1;
  const union_size = a.size + b.size - intersect;
  return union_size === 0 ? 0 : intersect / union_size;
}

export function rankPremiseReuse(
  draft_text: string,
  premises: ReadonlyArray<Premise>,
  options?: { context?: string; expected_kind?: PremiseKind; now_ms?: number },
): ReadonlyArray<{ premise: Premise; score: number }> {
  if (draft_text.trim().length === 0) return [];
  const draft = tokenize(draft_text);
  const now = options?.now_ms ?? 0;
  const scored: { premise: Premise; score: number }[] = [];
  for (const p of premises) {
    const text = (p as { statement?: string }).statement ?? "";
    const sim = jaccard(draft, tokenize(text));
    if (sim < REUSE_SIMILARITY_THRESHOLD) continue;
    let score = sim;
    // Kind match bonus
    if (options?.expected_kind && (p as { kind?: string }).kind === options.expected_kind) {
      score += 0.05;
    }
    // Recency bonus (smaller for older premises)
    const created_ms = Date.parse((p as { created_at?: string }).created_at ?? "");
    if (Number.isFinite(created_ms) && now > 0) {
      const age_days = (now - created_ms) / DAY_MS;
      score -= Math.max(0, Math.min(0.05, age_days * 0.0005));
    }
    scored.push({ premise: p, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.premise.id.localeCompare(b.premise.id);
  });
  return scored.slice(0, REUSE_TOP_N);
}

export interface PremiseReuseSuggestionsProps {
  draft_text: string;
  context?: string;
  premises: ReadonlyArray<Premise>;
  expected_kind?: PremiseKind;
  on_select: (premise_id: string) => void;
}

export function PremiseReuseSuggestions(props: PremiseReuseSuggestionsProps): ReactElement | null {
  const ranked = rankPremiseReuse(props.draft_text, props.premises, {
    context: props.context,
    expected_kind: props.expected_kind,
  });
  if (ranked.length === 0) return null;
  return (
    <div
      data-testid="premise-reuse-suggestions"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1, 4px)",
        padding: "var(--space-2, 8px)",
        background: "var(--color-surface-pane-secondary, #fafafa)",
        borderRadius: "var(--border-radius-md, 6px)",
        border: "var(--border-thin) solid var(--color-border-tertiary)",
      }}
    >
      <span className="argmap-section-heading">Reuse existing premise</span>
      {/* KEEP RAW: dropdown menu rows (list-item buttons), not the standard Button taxonomy. */}
      {ranked.map(({ premise }) => (
        <button
          key={premise.id}
          type="button"
          data-testid={`reuse-suggestion-${premise.id}`}
          onClick={() => props.on_select(premise.id)}
          style={{
            background: "transparent",
            border: "none",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "var(--font-size-xs, 11px)",
            color: "var(--color-text-primary, #111827)",
            padding: "var(--space-1)",
            borderRadius: "var(--border-radius-md, 6px)",
          }}
        >
          {(premise as { statement?: string }).statement ?? premise.id}
        </button>
      ))}
    </div>
  );
}
