import type { ReactElement } from "react";
import { useVersionHistoryPreview } from "./preview-context";
import { Button, Z } from "../primitives";
import { UIcon } from "../primitives/uicon";

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
        zIndex: Z.banner,
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
        <UIcon name="eye" size={14} />
        {message}
      </span>
      <Button
        variant="secondary"
        size="sm"
        data-testid="preview-banner-exit"
        onClick={preview.exit}
      >
        Exit preview
      </Button>
    </div>
  );
}
