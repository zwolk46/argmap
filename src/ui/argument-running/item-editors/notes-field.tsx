import type { ReactElement } from "react";

export interface NotesFieldProps {
  value: string;
  on_change: (next: string) => void;
  placeholder?: string;
  min_height?: string;
  max_height?: string;
}

export function NotesField(props: NotesFieldProps): ReactElement {
  const { value, on_change, placeholder, min_height = "60px", max_height = "180px" } = props;
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1, 4px)",
        fontSize: "var(--font-size-xs, 11px)",
        color: "var(--color-text-secondary, #6b7280)",
      }}
    >
      <span>Notes (optional)</span>
      <textarea
        data-testid="notes-field"
        value={value}
        placeholder={placeholder ?? "Anything to record about this item…"}
        onChange={(e) => on_change(e.target.value)}
        style={{
          minHeight: min_height,
          maxHeight: max_height,
          padding: "6px 8px",
          fontSize: "var(--font-size-xs, 11px)",
          fontFamily: "inherit",
          border: "var(--border-thin) solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-md, 6px)",
          background: "var(--color-surface-elevated, #ffffff)",
          resize: "vertical",
        }}
      />
    </label>
  );
}
