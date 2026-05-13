import type { ReactElement } from "react";
import type { FrameVersionId, SessionVersionId } from "@/schema";

export interface SelectionFooterProps {
  selected_version_id: FrameVersionId | SessionVersionId | null;
  selected_version_number: number | null;
  current_version_id: FrameVersionId | SessionVersionId | null;
  current_version_number: number | null;
  allow_restore: boolean;
  on_preview_clicked: () => void;
  on_restore_clicked: () => void;
  on_compare_clicked: () => void;
}

function btn_style(disabled: boolean): React.CSSProperties {
  return {
    padding: "var(--space-2, 8px) var(--space-3, 12px)",
    fontSize: "var(--font-size-sm, 13px)",
    background: "var(--color-surface-pane, #f9fafb)",
    color: disabled
      ? "var(--color-text-tertiary, #9ca3af)"
      : "var(--color-text-primary, #111827)",
    border: "var(--border-thin, 1px) solid var(--color-border-default, #e5e7eb)",
    borderRadius: "var(--radius-md, 6px)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export function SelectionFooter(props: SelectionFooterProps): ReactElement {
  const {
    selected_version_id,
    selected_version_number,
    current_version_id,
    current_version_number,
    allow_restore,
    on_preview_clicked,
    on_restore_clicked,
    on_compare_clicked,
  } = props;

  const no_selection = selected_version_id === null;
  const same_as_current =
    selected_version_id !== null && selected_version_id === current_version_id;
  const preview_disabled = no_selection || same_as_current;
  const restore_disabled = no_selection || same_as_current || !allow_restore;
  const compare_disabled = no_selection || same_as_current || current_version_id === null;

  return (
    <div
      data-testid="selection-footer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2, 8px)",
        width: "100%",
      }}
    >
      <span
        data-testid="selection-label"
        style={{
          fontSize: "var(--font-size-xs, 11px)",
          color: "var(--color-text-secondary, #6b7280)",
          marginRight: "auto",
        }}
      >
        {no_selection
          ? "Select a version"
          : `Selected: v${selected_version_number ?? "?"}`}
      </span>
      <button
        type="button"
        data-testid="footer-preview"
        disabled={preview_disabled}
        onClick={on_preview_clicked}
        title={same_as_current ? "This is the current version" : "Preview"}
        style={btn_style(preview_disabled)}
      >
        Preview
      </button>
      <button
        type="button"
        data-testid="footer-restore"
        disabled={restore_disabled}
        onClick={on_restore_clicked}
        title={
          !allow_restore
            ? "Restore frame versions in Frame Building"
            : same_as_current
              ? "This is the current version"
              : "Restore"
        }
        style={btn_style(restore_disabled)}
      >
        Restore
      </button>
      <button
        type="button"
        data-testid="footer-compare"
        disabled={compare_disabled}
        onClick={on_compare_clicked}
        title="Compare"
        style={btn_style(compare_disabled)}
      >
        Compare to v{current_version_number ?? "?"}
      </button>
    </div>
  );
}
