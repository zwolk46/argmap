import type { ReactElement } from "react";
import type { FrameVersionId, SessionVersionId } from "@/schema";
import { Button } from "../primitives";

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
        gap: "var(--space-2)",
        width: "100%",
      }}
    >
      <span
        data-testid="selection-label"
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-secondary)",
          marginRight: "auto",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {no_selection ? "Select a version" : `Selected: v${selected_version_number ?? "?"}`}
      </span>
      <Button
        variant="ghost"
        size="sm"
        data-testid="footer-preview"
        disabled={preview_disabled}
        onClick={on_preview_clicked}
        title={same_as_current ? "This is the current version" : "Preview"}
      >
        Preview
      </Button>
      <Button
        variant="secondary"
        size="sm"
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
      >
        Restore
      </Button>
      <Button
        variant="primary"
        size="sm"
        data-testid="footer-compare"
        disabled={compare_disabled}
        onClick={on_compare_clicked}
        title="Compare"
      >
        Compare to v{current_version_number ?? "?"}
      </Button>
    </div>
  );
}
