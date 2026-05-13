import type { ReactElement } from "react";
import { useVersionHistoryPreview } from "./preview-context";

export interface PreviewBannerProps {
  version_number: number;
  kind: "frame" | "session";
}

export function PreviewBanner({ version_number, kind }: PreviewBannerProps): ReactElement {
  const preview = useVersionHistoryPreview();
  const message =
    kind === "frame"
      ? `Previewing version ${version_number} (read-only)`
      : `Previewing session version ${version_number} (read-only)`;

  return (
    <div
      data-testid="preview-banner"
      data-kind={kind}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-3, 12px) var(--space-4, 16px)",
        background: "var(--color-status-not-applicable-bg, #f3f4f6)",
        borderBottom: "var(--border-hairline, 1px) solid var(--color-border-subtle, #e5e7eb)",
        fontSize: "var(--font-size-sm, 13px)",
        color: "var(--color-text-secondary, #6b7280)",
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        data-testid="preview-banner-exit"
        onClick={preview.exit}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--color-mode-current-accent, #1d4ed8)",
          fontSize: "var(--font-size-sm, 13px)",
          fontWeight: 500,
        }}
      >
        Exit preview
      </button>
    </div>
  );
}
