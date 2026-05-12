/// <reference lib="webworker" />
import { runLayoutSync } from "./run";
import type { FrameVersion } from "@/schema";
import type { LayoutOptions, LayoutResult } from "./types";

export interface LayoutWorkerRequest {
  kind: "layout_request";
  request_id: string;
  frame: FrameVersion;
  opts?: Partial<LayoutOptions>;
  computed_at: string;
}

export interface LayoutWorkerResponse {
  kind: "layout_response";
  request_id: string;
  result?: LayoutResult;
  error?: { message: string; name: string };
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<LayoutWorkerRequest>) => {
  const req = event.data;
  if (!req || req.kind !== "layout_request") return;
  try {
    const result = await runLayoutSync(req.frame, req.opts, { now: () => req.computed_at });
    const response: LayoutWorkerResponse = {
      kind: "layout_response",
      request_id: req.request_id,
      result,
    };
    ctx.postMessage(response);
  } catch (err) {
    const response: LayoutWorkerResponse = {
      kind: "layout_response",
      request_id: req.request_id,
      error: {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : "UnknownError",
      },
    };
    ctx.postMessage(response);
  }
};
