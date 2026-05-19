import * as React from "react";
import type { ReactElement } from "react";
import type {
  SuggestionResult,
  ConfirmationDecision,
  CommitPlan,
  FrameFieldWrite,
} from "@/llm-hooks";
import {
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  AiSparkle,
  hookShortName,
} from "../primitives";
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
      <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
        {value.map((item, i) => (
          <li key={i} style={{ marginBottom: "var(--space-1)" }}>
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
      <dl style={{ margin: 0 }}>
        {entries.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt
              style={{
                fontWeight: "var(--font-weight-semibold)",
                marginTop: "var(--space-1)",
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-xs)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wide)",
              }}
            >
              {k}
            </dt>
            <dd style={{ margin: 0, marginLeft: "var(--space-3)" }}>{formatPreview(v)}</dd>
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

  // §12 F-18: derive a hypothetical decision matching the user's current
  // state (raw suggestion or in-progress edit) so we can preview the writes
  // hook.commit() will produce. Edit with a parse error has no previewable
  // value — leave commit_plan null in that branch so the section hides.
  const preview_decision: ConfirmationDecision<unknown> | null = (() => {
    if (!editing) return { kind: "accepted", final: result.parsed };
    if (parse_error !== null) return null;
    const is_string = typeof result.parsed === "string";
    if (is_string) return { kind: "edited", final: edit_text };
    try {
      return { kind: "edited", final: JSON.parse(edit_text) };
    } catch {
      return null;
    }
  })();
  const commit_plan: CommitPlan | null = preview_decision ? previewCommit(preview_decision) : null;
  const commit_summary = commitPlanSummary(commit_plan);

  // F-16: Drawer Escape was a no-op for AI suggestions because no onClose
  // handler was wired. Treat Escape as "Reject" so the keyboard-only flow
  // matches every other dismissible overlay in the app.
  return (
    <Drawer
      open={is_open}
      width="min(420px, 100vw)"
      aria_label="AI suggestion review"
      onClose={is_applying ? undefined : handleReject}
    >
      <DrawerHeader>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <AiSparkle />
          AI suggestion
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "1px var(--space-2)",
            borderRadius: "var(--radius-pill)",
            background: "var(--color-ai-accent-bg)",
            color: "var(--color-ai-accent)",
            fontSize: "var(--font-size-2xs)",
            fontWeight: "var(--font-weight-medium)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "var(--letter-spacing-wide)",
            textTransform: "uppercase",
          }}
        >
          {/* §12 F-28: prefer the human short name ("checkpoint", "interp")
              over the bare hook id ("G1"). Matches AiAttributionChip
              elsewhere. The chip styling still uppercase-monospaces the
              label, which reads as a category tag rather than a code. */}
          {hookShortName(result.hook_id)}
        </span>
      </DrawerHeader>
      <DrawerBody>
        {editing ? (
          <>
            <textarea
              data-testid="suggestion-edit-textarea"
              value={edit_text}
              onChange={(e) => {
                setEditText(e.target.value);
                if (parse_error) setParseError(null);
              }}
              className="argmap-input"
              style={{
                minHeight: "160px",
                resize: "vertical",
                lineHeight: "var(--line-height-normal)",
                fontFamily:
                  typeof result.parsed === "string" ? "var(--font-sans)" : "var(--font-mono)",
              }}
            />
            {parse_error ? (
              <p
                data-testid="suggestion-edit-parse-error"
                style={{
                  marginTop: "var(--space-2)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-severity-error)",
                }}
              >
                Couldn't parse edit as JSON: {parse_error}
              </p>
            ) : null}
          </>
        ) : (
          <div
            data-testid="suggestion-preview"
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-primary)",
              lineHeight: "var(--line-height-normal)",
              whiteSpace: "pre-wrap",
              fontFamily:
                typeof result.parsed === "string" ? "var(--font-sans)" : "var(--font-mono)",
              fontSizeAdjust: "0.5",
              padding: "var(--space-3)",
              background: "var(--color-surface-pane)",
              borderRadius: "var(--radius-md)",
              border: "var(--border-hairline) solid var(--color-border-subtle)",
            }}
          >
            {formatPreview(result.parsed)}
          </div>
        )}
        {commit_plan ? (
          <section
            data-testid="commit-plan-preview"
            aria-label="Changes that will be applied"
            style={{
              marginTop: "var(--space-3)",
              padding: "var(--space-3)",
              background: "var(--color-surface-pane)",
              borderRadius: "var(--radius-md)",
              border: "var(--border-hairline) solid var(--color-border-subtle)",
            }}
          >
            <header
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wide)",
                marginBottom: "var(--space-2)",
              }}
            >
              Changes that will be applied
            </header>
            {commit_summary.length === 0 ? (
              <p
                data-testid="commit-plan-empty"
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  fontStyle: "italic",
                }}
              >
                No structural changes — this is an advisory only.
              </p>
            ) : (
              <ul
                data-testid="commit-plan-groups"
                style={{
                  margin: 0,
                  paddingLeft: "var(--space-4)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-primary)",
                }}
              >
                {commit_summary.map((group, gi) => (
                  <li key={gi} style={{ marginBottom: "var(--space-1)" }}>
                    <span style={{ fontWeight: "var(--font-weight-medium)" }}>{group.label}</span>
                    {group.items.length > 0 ? (
                      <ul
                        style={{
                          margin: "var(--space-1) 0 0",
                          paddingLeft: "var(--space-4)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {group.items.slice(0, 6).map((item, ii) => (
                          <li key={ii}>{item}</li>
                        ))}
                        {group.items.length > 6 ? (
                          <li style={{ fontStyle: "italic" }}>
                            …and {group.items.length - 6} more
                          </li>
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
                style={{
                  margin: "var(--space-2) 0 0",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                A new version will be saved.
              </p>
            ) : null}
          </section>
        ) : null}
      </DrawerBody>
      {/* §12 F-20: when an action is in flight all three buttons disable.
          Previously only Accept's label changed to "Applying…", so Reject
          and Edit looked broken. Show specific in-flight copy on the
          triggering button and a neutral "Working…" on the others; the
          aria-busy wrapper signals state to assistive tech without
          changing the visual layout. */}
      <DrawerFooter>
        <span
          data-testid="suggestion-footer-buttons"
          aria-busy={is_applying || undefined}
          style={{ display: "contents" }}
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
            variant="secondary"
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
            variant="primary"
            data-testid="suggestion-accept"
            onClick={handleAccept}
            disabled={is_applying}
          >
            {is_applying ? (inflight === "accepted" ? "Applying…" : "Working…") : "Accept"}
          </Button>
        </span>
      </DrawerFooter>
    </Drawer>
  );
}
