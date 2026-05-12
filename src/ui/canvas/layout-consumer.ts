import * as React from "react";
import { layout } from "@/layout";
import type { LayoutResult, LayoutOptions } from "@/layout";
import type { FrameVersion } from "@/schema";

export type LayoutConsumerStatus =
  | { kind: "idle" }
  | { kind: "computing" }
  | { kind: "ready"; result: LayoutResult }
  | { kind: "error"; error: Error; previous_result: LayoutResult | null };

function structuralHash(frame_version: FrameVersion, opts: LayoutOptions): string {
  const node_ids = [...frame_version.nodes.map((n) => n.id)].sort().join(",");
  const edge_ids = [...frame_version.edges.map((e) => `${e.source}-${e.type}-${e.target}`)].sort().join(",");
  return `${node_ids}|${edge_ids}|${opts.direction}|${opts.honor_user_anchors}|${opts.collapse_subquestions}`;
}

export function useLayoutResult(
  frame_version: FrameVersion,
  opts: Partial<LayoutOptions> = {},
): LayoutConsumerStatus {
  const direction = opts.direction ?? "DOWN";
  const honor_user_anchors = opts.honor_user_anchors ?? true;
  const collapse_subquestions = opts.collapse_subquestions ?? true;

  const merged_opts: LayoutOptions = React.useMemo(
    () => ({ direction, honor_user_anchors, collapse_subquestions }),
    [direction, honor_user_anchors, collapse_subquestions],
  );

  const hash = structuralHash(frame_version, merged_opts);

  const [status, setStatus] = React.useState<LayoutConsumerStatus>({ kind: "idle" });
  const lastHashRef = React.useRef<string | null>(null);
  const lastResultRef = React.useRef<LayoutResult | null>(null);
  const frame_version_ref = React.useRef(frame_version);
  frame_version_ref.current = frame_version;
  const merged_opts_ref = React.useRef(merged_opts);
  merged_opts_ref.current = merged_opts;

  React.useEffect(() => {
    if (hash === lastHashRef.current) return;

    lastHashRef.current = hash;
    setStatus({ kind: "computing" });

    let cancelled = false;
    layout(frame_version_ref.current, merged_opts_ref.current).then(
      (result) => {
        if (cancelled) return;
        lastResultRef.current = result;
        setStatus({ kind: "ready", result });
      },
      (error) => {
        if (cancelled) return;
        setStatus({ kind: "error", error: error as Error, previous_result: lastResultRef.current });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [hash]);

  return status;
}
