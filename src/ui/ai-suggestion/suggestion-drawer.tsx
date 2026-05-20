import * as React from "react";
import type { ReactElement } from "react";
import type {
  SuggestionResult,
  ConfirmationDecision,
  CommitPlan,
  FrameFieldWrite,
} from "@/llm-hooks";
import { AiSparkle, hookShortName } from "../primitives";
import { Button } from "#components/ui/button";
import { Textarea } from "#components/ui/textarea";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "#components/ui/sheet";
import { cn } from "#lib/utils";
import { useAiSuggestion } from "../hooks/use-ai-suggestion";

// §12 F-18: render a CommitPlan as a human-readable summary so users see
// the writes that Accept would persist (e.g., a G2 interpretation
// suggestion that quietly creates 3 Authority nodes + 3 CITES edges in
// legal mode). Constitution Art III § 2 — practitioners need to know
// what they're signing off on.
function commitPlanSummary(
  plan: CommitPlan | null,
): { label: string; items: ReadonlyArray<string> }[] {
  if (!plan || plan.writes.length === 0) return [];
  const order: string[] = [];
  const groups = new Map<string, FrameFieldWrite[]>();
  for (const w of plan.writes) {
    const value_type =
      typeof w.value === "object" && w.value !== null
        ? ((w.value as { type?: unknown }).type ?? null)
        : null;
    const key = `${w.op}:${typeof value_type === "string" ? value_type : "·"}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(w);
  }
  return order.map((key) => {
    const writes = groups.get(key)!;
    const [op, type] = key.split(":", 2);
    const count = writes.length;
    const has_type = type && type !== "·";
    let label: string;
    if (op === "create_node") {
      label = has_type
        ? `Create ${count} ${type} node${count === 1 ? "" : "s"}`
        : `Create ${count} node${count === 1 ? "" : "s"}`;
    } else if (op === "create_edge") {
      label = has_type
        ? `Create ${count} ${type} edge${count === 1 ? "" : "s"}`
        : `Create ${count} edge${count === 1 ? "" : "s"}`;
    } else if (op === "set") {
      label = `Update ${count} field${count === 1 ? "" : "s"}`;
    } else {
      label = `Append to ${count} field${count === 1 ? "" : "s"}`;
    }
    const items = writes.map(formatCommitWrite).filter((s) => s.length > 0);
    return { label, items };
  });
}

// §12 F-21: hooks that emit arrays of statements (G2 interpretations, G9
// authorities, G11 gate clauses) cram into a 420px drawer with long lines
// truncating mid-sentence. Widen them; everything else keeps the default.
// Declared here rather than on HookContract because src/ui/ may only
// type-import from @/llm-hooks — same pattern as `hookShortName` in
// src/ui/primitives.
const WIDE_DRAWER_HOOK_IDS: ReadonlySet<string> = new Set(["G2", "G9", "G11"]);

export function suggestionDrawerWidth(hook_id: string): string {
  return WIDE_DRAWER_HOOK_IDS.has(hook_id) ? "min(640px, 100vw)" : "min(420px, 100vw)";
}

// §12 F-10: render a small subtitle in the drawer body when G6 is the active
// suggestion, naming the baseline the rewrite was generated against. Reads
// from SuggestionResult.echo_input — the structured snapshot of buildInput's
// output — which carries baseline_kind as of the F-10 fix. Other hooks render
// nothing.
function renderG6BaselineSubtitle(result: SuggestionResult<unknown>): React.ReactElement | null {
  if (result.hook_id !== "G6") return null;
  const echo = result.echo_input as { baseline_kind?: unknown } | undefined;
  const kind = echo?.baseline_kind;
  if (kind !== "rewrite" && kind !== "canonical") return null;
  const label = kind === "rewrite" ? "Refining your previous rewrite" : "Rewriting from canonical";
  return (
    <p data-testid="g6-baseline-subtitle" className="m-0 mb-3 text-xs italic text-muted-foreground">
      {label}
    </p>
  );
}

function formatCommitWrite(w: FrameFieldWrite): string {
  if (w.op === "set" || w.op === "append") {
    const target = w.target_node_id ?? w.target_edge_id;
    return target ? `${target} · ${w.field_path}` : w.field_path;
  }
  const v = w.value;
  if (typeof v !== "object" || v === null) return String(v);
  const human = v as { statement?: unknown; name?: unknown; label?: unknown };
  if (typeof human.statement === "string") return human.statement;
  if (typeof human.name === "string") return human.name;
  if (typeof human.label === "string") return human.label;
  return "";
}

// F-17: previous preview was a raw JSON.stringify dump for any structured
// suggestion. Render arrays as a bullet list and objects as a key: value
// pair list so non-technical users see human structure instead of JSON
// punctuation. The textarea-edit path still uses pretty-printed JSON so
// power users can hand-tune fields.
function formatPreview(value: unknown): React.ReactNode {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return <em>(empty)</em>;
    return (
      <ul className="m-0 list-disc pl-4">
        {value.map((item, i) => (
          <li key={i} className="mb-1">
            {formatPreview(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <em>(empty)</em>;
    return (
      <dl className="m-0">
        {entries.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {k}
            </dt>
            <dd className="m-0 ml-3">{formatPreview(v)}</dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }
  return String(value);
}

export interface SuggestionDrawerProps {
  store_kind: "frame" | "session";
}

export function SuggestionDrawer({ store_kind }: SuggestionDrawerProps): ReactElement | null {
  const { pending, status, resolve, previewCommit } = useAiSuggestion(store_kind);
  const [editing, setEditing] = React.useState(false);
  // For structured (non-string) suggestions we hold the textarea's JSON
  // string here while the user edits. On commit we parse it back into the
  // original shape so we never hand the raw string into hook.commit (which
  // would crash any hook that expects a structured payload).
  const [edit_text, setEditText] = React.useState<string>("");
  const [parse_error, setParseError] = React.useState<string | null>(null);
  // §12 F-20: record which button triggered the applying state so the other
  // disabled buttons read as "operation in flight" rather than "broken".
  const [inflight, setInflight] = React.useState<"accepted" | "edited" | "rejected" | null>(null);

  const is_open = pending !== null;
  const is_applying = status === "applying";

  React.useEffect(() => {
    if (!is_open) {
      setEditing(false);
      setEditText("");
      setParseError(null);
      setInflight(null);
    }
  }, [is_open]);

  React.useEffect(() => {
    if (!is_applying) setInflight(null);
  }, [is_applying]);

  if (!is_open) return null;

  async function handleAccept() {
    const result = pending as SuggestionResult<unknown>;
    setInflight("accepted");
    await resolve({ kind: "accepted", final: result.parsed } as ConfirmationDecision<unknown>);
  }

  async function handleEdit() {
    const result = pending as SuggestionResult<unknown>;
    const is_string = typeof result.parsed === "string";
    if (!editing) {
      setEditText(is_string ? (result.parsed as string) : JSON.stringify(result.parsed, null, 2));
      setParseError(null);
      setEditing(true);
      return;
    }
    let final: unknown;
    if (is_string) {
      final = edit_text;
    } else {
      try {
        final = JSON.parse(edit_text);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Invalid JSON.");
        return;
      }
    }
    setInflight("edited");
    await resolve({ kind: "edited", final } as ConfirmationDecision<unknown>);
  }

  async function handleReject() {
    setInflight("rejected");
    await resolve({ kind: "rejected" } as ConfirmationDecision<unknown>);
  }

  const result = pending as SuggestionResult<unknown>;
  const sheet_width = suggestionDrawerWidth(result.hook_id);
  const is_string = typeof result.parsed === "string";

  // §12 F-18: derive a hypothetical decision matching the user's current
  // state (raw suggestion or in-progress edit) so we can preview the writes
  // hook.commit() will produce. Edit with a parse error has no previewable
  // value — leave commit_plan null in that branch so the section hides.
  const preview_decision: ConfirmationDecision<unknown> | null = (() => {
    if (!editing) return { kind: "accepted", final: result.parsed };
    if (parse_error !== null) return null;
    if (is_string) return { kind: "edited", final: edit_text };
    try {
      return { kind: "edited", final: JSON.parse(edit_text) };
    } catch {
      return null;
    }
  })();
  const commit_plan: CommitPlan | null = preview_decision ? previewCommit(preview_decision) : null;
  const commit_summary = commitPlanSummary(commit_plan);

  // F-16: treat Sheet's escape/outside-click as "Reject" so the keyboard-only
  // flow matches every other dismissible overlay. While applying, the Sheet
  // resists dismissal (Sheet's open prop is controlled, and we intercept).
  return (
    <Sheet
      open={is_open}
      onOpenChange={(next) => {
        if (next) return;
        if (is_applying) return;
        void handleReject();
      }}
    >
      <SheetContent
        data-testid="drawer"
        side="right"
        showCloseButton={false}
        aria-label="AI suggestion review"
        // shadcn Sheet hardcodes sm:max-w-sm; force override with !max-width.
        // Apply both width AND max-width so the wider G2/G9/G11 case respects
        // the wider min(640px, 100vw) cap on small viewports.
        className="!max-w-none flex flex-col p-0 sm:!max-w-none"
        style={{ width: sheet_width, maxWidth: sheet_width }}
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b px-5 py-4">
          <SheetTitle className="inline-flex items-center gap-2 text-base font-semibold">
            <AiSparkle />
            AI suggestion
          </SheetTitle>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-px text-[10px] font-medium uppercase tracking-wide"
            style={{
              background: "var(--color-ai-accent-bg)",
              color: "var(--color-ai-accent)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {/* §12 F-28: prefer the human short name ("checkpoint", "interp")
                over the bare hook id ("G1"). Matches AiAttributionChip
                elsewhere. */}
            {hookShortName(result.hook_id)}
          </span>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* §12 F-10: surface the baseline the rewrite was run against. */}
          {renderG6BaselineSubtitle(result)}
          {editing ? (
            <>
              <Textarea
                data-testid="suggestion-edit-textarea"
                value={edit_text}
                onChange={(e) => {
                  setEditText(e.target.value);
                  if (parse_error) setParseError(null);
                }}
                className={cn("min-h-[160px] resize-y leading-normal", !is_string && "font-mono")}
              />
              {parse_error ? (
                <p
                  data-testid="suggestion-edit-parse-error"
                  className="mt-2 text-sm"
                  style={{ color: "var(--color-severity-error)" }}
                >
                  Couldn't parse edit as JSON: {parse_error}
                </p>
              ) : null}
            </>
          ) : (
            <div
              data-testid="suggestion-preview"
              className={cn(
                "whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-normal text-foreground",
                !is_string && "font-mono",
              )}
            >
              {formatPreview(result.parsed)}
            </div>
          )}
          {commit_plan ? (
            <section
              data-testid="commit-plan-preview"
              aria-label="Changes that will be applied"
              className="mt-3 rounded-md border bg-muted/30 p-3"
            >
              <header className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Changes that will be applied
              </header>
              {commit_summary.length === 0 ? (
                <p
                  data-testid="commit-plan-empty"
                  className="m-0 text-sm italic text-muted-foreground"
                >
                  No structural changes — this is an advisory only.
                </p>
              ) : (
                <ul
                  data-testid="commit-plan-groups"
                  className="m-0 list-disc pl-4 text-sm text-foreground"
                >
                  {commit_summary.map((group, gi) => (
                    <li key={gi} className="mb-1">
                      <span className="font-medium">{group.label}</span>
                      {group.items.length > 0 ? (
                        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                          {group.items.slice(0, 6).map((item, ii) => (
                            <li key={ii}>{item}</li>
                          ))}
                          {group.items.length > 6 ? (
                            <li className="italic">…and {group.items.length - 6} more</li>
                          ) : null}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {commit_plan.versioned && commit_plan.writes.length > 0 ? (
                <p
                  data-testid="commit-plan-versioned"
                  className="m-0 mt-2 text-xs text-muted-foreground/80"
                >
                  A new version will be saved.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
        {/* §12 F-20: when an action is in flight all three buttons disable.
            Show specific in-flight copy on the triggering button and a
            neutral "Working…" on the others; aria-busy signals state to
            assistive tech. */}
        <SheetFooter className="flex flex-row justify-end gap-2 border-t px-5 py-3">
          <span
            data-testid="suggestion-footer-buttons"
            aria-busy={is_applying || undefined}
            className="contents"
          >
            <Button
              variant="ghost"
              data-testid="suggestion-reject"
              onClick={handleReject}
              disabled={is_applying}
            >
              {is_applying ? (inflight === "rejected" ? "Cancelling…" : "Working…") : "Reject"}
            </Button>
            <Button
              variant="outline"
              data-testid="suggestion-edit"
              onClick={handleEdit}
              disabled={is_applying}
            >
              {is_applying
                ? inflight === "edited"
                  ? "Saving…"
                  : "Working…"
                : editing
                  ? "Confirm edit"
                  : "Edit"}
            </Button>
            <Button
              variant="default"
              data-testid="suggestion-accept"
              onClick={handleAccept}
              disabled={is_applying}
            >
              {is_applying ? (inflight === "accepted" ? "Applying…" : "Working…") : "Accept"}
            </Button>
          </span>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
