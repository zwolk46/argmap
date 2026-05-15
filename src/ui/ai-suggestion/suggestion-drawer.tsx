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
  const [edited_value, setEditedValue] = React.useState<unknown>(null);

  const is_open = pending !== null;
  const is_applying = status === "applying";

  React.useEffect(() => {
    if (!is_open) setEditing(false);
  }, [is_open]);

  if (!is_open) return null;

  async function handleAccept() {
    const result = pending as SuggestionResult<unknown>;
    await resolve({ kind: "accepted", final: result.parsed } as ConfirmationDecision<unknown>);
  }

  async function handleEdit() {
    if (!editing) {
      const result = pending as SuggestionResult<unknown>;
      setEditedValue(result.parsed);
      setEditing(true);
    } else {
      await resolve({ kind: "edited", final: edited_value } as ConfirmationDecision<unknown>);
    }
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
          <textarea
            data-testid="suggestion-edit-textarea"
            value={typeof edited_value === "string" ? edited_value : JSON.stringify(edited_value)}
            onChange={(e) => setEditedValue(e.target.value)}
            className="argmap-input"
            style={{
              minHeight: "160px",
              resize: "vertical",
              lineHeight: "var(--line-height-normal)",
            }}
          />
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
