import * as React from "react";
import type { ReactElement } from "react";
import type { SuggestionResult, ConfirmationDecision } from "@/llm-hooks";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter, Button, AiSparkle } from "../primitives";
import { useAiSuggestion } from "../hooks/use-ai-suggestion";

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

  return (
    <Drawer open={is_open} width="min(420px, 100vw)" aria_label="AI suggestion review">
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
            {typeof result.parsed === "string"
              ? result.parsed
              : JSON.stringify(result.parsed, null, 2)}
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
