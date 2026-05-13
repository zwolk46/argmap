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
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-4)",
        background: "var(--color-status-not-applicable-bg)",
        borderBottom: "var(--border-thin) solid var(--color-status-not-applicable)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-secondary)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          fontWeight: "var(--font-weight-medium)",
        }}
      >
        <svg
          width={14}
          height={14}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2 8c2-3.5 4.5-5 6-5s4 1.5 6 5c-2 3.5-4.5 5-6 5s-4-1.5-6-5z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
        {message}
      </span>
      <button
        type="button"
        data-testid="preview-banner-exit"
        onClick={preview.exit}
        style={{
          background: "transparent",
          border: "var(--border-thin) solid var(--color-mode-current-accent)",
          cursor: "pointer",
          color: "var(--color-mode-current-accent)",
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-medium)",
          padding: "var(--space-1) var(--space-3)",
          borderRadius: "var(--radius-md)",
          transition: "background-color var(--duration-fast) var(--ease-standard)",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            "var(--color-mode-current-accent-bg)")
        }
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        Exit preview
      </button>
    </div>
  );
}
