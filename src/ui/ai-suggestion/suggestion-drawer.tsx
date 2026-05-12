import * as React from "react";
import type { ReactElement } from "react";
import type { SuggestionResult, ConfirmationDecision } from "@/llm-hooks";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from "../primitives/drawer";
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
    <Drawer open={is_open} width="400px">
      <DrawerHeader>
        <span>AI Suggestion</span>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-ai-accent)",
            fontFamily: "var(--font-mono)",
          }}
        >
          ✦ {result.hook_id}
        </span>
      </DrawerHeader>
      <DrawerBody>
        {editing ? (
          <textarea
            data-testid="suggestion-edit-textarea"
            value={typeof edited_value === "string" ? edited_value : JSON.stringify(edited_value)}
            onChange={(e) => setEditedValue(e.target.value)}
            style={{
              width: "100%",
              minHeight: "120px",
              padding: "var(--space-2)",
              border: "var(--border-thin) solid var(--color-border-default)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-sans)",
              resize: "vertical",
            }}
          />
        ) : (
          <div
            data-testid="suggestion-preview"
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-normal)",
            }}
          >
            {typeof result.parsed === "string"
              ? result.parsed
              : JSON.stringify(result.parsed, null, 2)}
          </div>
        )}
      </DrawerBody>
      <DrawerFooter>
        <button
          data-testid="suggestion-reject"
          onClick={handleReject}
          disabled={is_applying}
          style={{
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--font-size-sm)",
            background: "transparent",
            border: "var(--border-thin) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            cursor: is_applying ? "default" : "pointer",
            opacity: is_applying ? 0.5 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          Reject
        </button>
        <button
          data-testid="suggestion-edit"
          onClick={handleEdit}
          disabled={is_applying}
          style={{
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--font-size-sm)",
            background: "var(--color-surface-pane)",
            border: "var(--border-thin) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            cursor: is_applying ? "default" : "pointer",
            opacity: is_applying ? 0.5 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          {editing ? "Confirm edit" : "Edit"}
        </button>
        <button
          data-testid="suggestion-accept"
          onClick={handleAccept}
          disabled={is_applying}
          style={{
            padding: "var(--space-2) var(--space-3)",
            fontSize: "var(--font-size-sm)",
            background: "var(--color-mode-current-accent)",
            color: "var(--color-text-on-accent)",
            border: "none",
            borderRadius: "var(--radius-md)",
            cursor: is_applying ? "default" : "pointer",
            opacity: is_applying ? 0.5 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          {is_applying ? "Applying…" : "Accept"}
        </button>
      </DrawerFooter>
    </Drawer>
  );
}
