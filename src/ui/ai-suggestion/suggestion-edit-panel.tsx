import * as React from "react";
import type { ReactElement } from "react";
import type { HookId } from "@/llm-hooks";

export interface SuggestionEditPanelProps<TOut> {
  hook_id: HookId;
  current_value: TOut;
  on_change: (next: TOut) => void;
}

export function SuggestionEditPanel<TOut>({
  hook_id,
  current_value,
  on_change,
}: SuggestionEditPanelProps<TOut>): ReactElement {
  const panel = SUGGESTION_EDIT_PANELS.get(hook_id as string);
  if (panel) {
    const Panel = panel as unknown as React.ComponentType<SuggestionEditPanelProps<TOut>>;
    return <Panel hook_id={hook_id} current_value={current_value} on_change={on_change} />;
  }
  return (
    <textarea
      value={typeof current_value === "string" ? current_value : JSON.stringify(current_value)}
      onChange={(e) => on_change(e.target.value as unknown as TOut)}
      style={{
        width: "100%",
        minHeight: "80px",
        padding: "var(--space-2)",
        border: "var(--border-thin) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        fontFamily: "var(--font-sans)",
      }}
    />
  );
}

export const SUGGESTION_EDIT_PANELS: ReadonlyMap<string, React.ComponentType<SuggestionEditPanelProps<never>>> =
  new Map();
