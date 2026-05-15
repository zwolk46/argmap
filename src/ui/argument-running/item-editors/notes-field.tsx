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
        className="argmap-input"
        style={{
          minHeight: min_height,
          maxHeight: max_height,
          fontSize: "var(--font-size-xs, 11px)",
          resize: "vertical",
        }}
      />
    </label>
  );
}
