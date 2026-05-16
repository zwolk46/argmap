import * as React from "react";
import type { ReactElement } from "react";
import type { SuggestionResult, ConfirmationDecision } from "@/llm-hooks";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter, Button, AiSparkle } from "../primitives";
import { useAiSuggestion } from "../hooks/use-ai-suggestion";

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
  const { pending, status, resolve } = useAiSuggestion(store_kind);
  const [editing, setEditing] = React.useState(false);
  // For structured (non-string) suggestions we hold the textarea's JSON
  // string here while the user edits. On commit we parse it back into the
  // original shape so we never hand the raw string into hook.commit (which
  // would crash any hook that expects a structured payload).
  const [edit_text, setEditText] = React.useState<string>("");
  const [parse_error, setParseError] = React.useState<string | null>(null);

  const is_open = pending !== null;
  const is_applying = status === "applying";

  React.useEffect(() => {
    if (!is_open) {
      setEditing(false);
      setEditText("");
      setParseError(null);
    }
  }, [is_open]);

  if (!is_open) return null;

  async function handleAccept() {
    const result = pending as SuggestionResult<unknown>;
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
    await resolve({ kind: "edited", final } as ConfirmationDecision<unknown>);
  }

  async function handleReject() {
    await resolve({ kind: "rejected" } as ConfirmationDecision<unknown>);
  }

  const result = pending as SuggestionResult<unknown>;

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
          {result.hook_id}
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
      </DrawerBody>
      <DrawerFooter>
        <Button
          variant="ghost"
          data-testid="suggestion-reject"
          onClick={handleReject}
          disabled={is_applying}
        >
          Reject
        </Button>
        <Button
          variant="secondary"
          data-testid="suggestion-edit"
          onClick={handleEdit}
          disabled={is_applying}
        >
          {editing ? "Confirm edit" : "Edit"}
        </Button>
        <Button
          variant="primary"
          data-testid="suggestion-accept"
          onClick={handleAccept}
          disabled={is_applying}
        >
          {is_applying ? "Applying…" : "Accept"}
        </Button>
      </DrawerFooter>
    </Drawer>
  );
}
