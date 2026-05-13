import * as React from "react";
import type { ReactElement } from "react";
import type {
  SessionId,
  SessionVersionId,
  ArgumentSessionVersion,
  FrameVersion,
  NodeRef,
} from "@/schema";
import { useSessionStore } from "@/state";
import { FrameCanvas, useLayoutResult } from "../canvas";
import type { ArgumentOverlay } from "../canvas";
import { PreviewBanner } from "./preview-banner";
import { useVersionFullLoad } from "./use-version-full-load";
import { useVersionHistoryPreview } from "./preview-context";

export interface SessionPreviewViewProps {
  session_id: SessionId;
  version_id: SessionVersionId;
  version_number: number;
}

const EMPTY_VERSION: FrameVersion = {
  id: "__empty__",
  frame_id: "__empty__",
  version_number: 0,
  created_at: "",
  nodes: [],
  edges: [],
  is_milestone: false,
};

export function buildArgumentOverlayFromSessionVersion(
  v: ArgumentSessionVersion | null,
): ArgumentOverlay {
  if (!v) return { edges: [] };
  type OverlayEdge = ArgumentOverlay["edges"][number];
  const out: OverlayEdge[] = [];
  for (const ae of v.argument_edges ?? []) {
    if (ae.type === "ANSWERS" || ae.type === "SUPPORTS" || ae.type === "CONTRADICTS") {
      out.push({
        id: ae.id,
        type: ae.type,
        source: ae.source,
        target: ae.target,
      });
    }
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { edges: out };
}

export function SessionPreviewView(props: SessionPreviewViewProps): ReactElement {
  const { version_id, version_number } = props;
  const result = useVersionFullLoad({ kind: "session", version_id });
  const preview = useVersionHistoryPreview();
  const frame_version_snapshot = useSessionStore((s) => s.session?.frame_version_snapshot ?? null);
  const [selected, setSelected] = React.useState<ReadonlyArray<NodeRef>>([]);

  const session_version =
    result.status === "ready" && result.version && "premises" in result.version
      ? (result.version as ArgumentSessionVersion)
      : null;

  const argument_overlay = React.useMemo(
    () => buildArgumentOverlayFromSessionVersion(session_version),
    [session_version],
  );

  const frame_for_canvas: FrameVersion = frame_version_snapshot ?? EMPTY_VERSION;
  const layout_status = useLayoutResult(frame_for_canvas);
  const layout_result =
    layout_status.kind === "ready"
      ? layout_status.result
      : layout_status.kind === "error"
        ? layout_status.previous_result
        : null;

  return (
    <div
      data-testid="session-preview-view"
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      <PreviewBanner version_number={version_number} kind="session" />
      {result.status === "loading" ? (
        <div
          data-testid="session-preview-loading"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            color: "var(--color-text-secondary, #6b7280)",
            fontSize: "var(--font-size-sm, 13px)",
          }}
        >
          Loading session version {version_number}…
        </div>
      ) : result.status === "error" ? (
        <div
          data-testid="session-preview-error"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: 8,
          }}
        >
          <div style={{ color: "var(--color-severity-error, #dc2626)" }}>
            {result.error?.message ?? "Failed to load version"}
          </div>
          <button type="button" onClick={preview.exit}>
            Return to working version
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, position: "relative" }}>
          <FrameCanvas
            frame_version={frame_for_canvas}
            layout_result={layout_result}
            operating_mode="argument_running"
            read_only={true}
            argument_overlay={argument_overlay}
            selection={selected}
            onSelectionChange={setSelected}
          />
        </div>
      )}
    </div>
  );
}
