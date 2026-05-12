import type { FrameVersion } from "@/schema";
import { runLayoutSync } from "./run";
import { resolveLayoutDeps, type LayoutDeps, type LayoutOptions, type LayoutResult } from "./types";
import type { LayoutWorkerRequest, LayoutWorkerResponse } from "./elk-worker";

let workerInstance: Worker | null = null;
let nextRequestId = 1;
const inFlight = new Map<
  string,
  { resolve: (r: LayoutResult) => void; reject: (e: Error) => void }
>();

function ensureWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (workerInstance) return workerInstance;
  const w = new Worker(new URL("./elk-worker.ts", import.meta.url), { type: "module" });
  w.onmessage = (event: MessageEvent<LayoutWorkerResponse>) => {
    const res = event.data;
    if (!res || res.kind !== "layout_response") return;
    const handler = inFlight.get(res.request_id);
    if (!handler) return;
    inFlight.delete(res.request_id);
    if (res.error)
      handler.reject(Object.assign(new Error(res.error.message), { name: res.error.name }));
    else if (res.result) handler.resolve(res.result);
    else handler.reject(new Error("layout_response missing both result and error"));
  };
  w.onerror = (event: ErrorEvent) => {
    const err = new Error(event.message || "layout worker error");
    inFlight.forEach(({ reject }) => reject(err));
    inFlight.clear();
    workerInstance = null;
  };
  workerInstance = w;
  return w;
}

export function layout(
  frame: FrameVersion,
  opts?: Partial<LayoutOptions>,
  deps?: LayoutDeps,
): Promise<LayoutResult> {
  const resolvedDeps = resolveLayoutDeps(deps);
  const computed_at = resolvedDeps.now();

  const w = ensureWorker();
  if (!w) {
    return runLayoutSync(frame, opts, { now: () => computed_at });
  }

  const request_id = String(nextRequestId++);
  const promise = new Promise<LayoutResult>((resolve, reject) => {
    inFlight.set(request_id, { resolve, reject });
  });
  const req: LayoutWorkerRequest = {
    kind: "layout_request",
    request_id,
    frame,
    opts,
    computed_at,
  };
  w.postMessage(req);
  return promise;
}

export function terminate(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
  inFlight.forEach(({ reject }) => reject(new Error("layout worker terminated")));
  inFlight.clear();
  nextRequestId = 1;
}
