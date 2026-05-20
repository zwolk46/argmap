import type { ReactElement } from "react";
import { Eye } from "@phosphor-icons/react";
import { Alert } from "#components/ui/alert";
import { Button } from "#components/ui/button";
import { useVersionHistoryPreview } from "./preview-context";
import { Z } from "../primitives";

export interface PreviewBannerProps {
  version_number: number;
  kind: "frame" | "session";
}

/**
 * Sticky banner shown over the canvas while the user is viewing a historical
 * version. Uses the not-applicable wash so the surface reads as a paused /
 * read-only state without competing with the canvas for color. Earlier
 * iterations used the warning gold to maximize discoverability; the task
 * spec walked that back to the calmer not-applicable tone.
 */
export function PreviewBanner({ version_number, kind }: PreviewBannerProps): ReactElement {
  const preview = useVersionHistoryPreview();
  const message =
    kind === "frame"
      ? `Previewing version ${version_number} (read-only)`
      : `Previewing session version ${version_number} (read-only)`;

  return (
    <Alert
      data-testid="preview-banner"
      data-kind={kind}
      className="sticky top-0 flex items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 py-2"
      style={{
        zIndex: Z.banner,
        background: "var(--color-status-not-applicable-bg)",
        borderBottomColor: "var(--color-status-not-applicable)",
        color: "var(--color-status-not-applicable)",
      }}
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <Eye aria-hidden="true" />
        {message}
      </span>
      <Button variant="outline" size="sm" data-testid="preview-banner-exit" onClick={preview.exit}>
        Exit preview
      </Button>
    </Alert>
  );
}
