import * as React from "react";
import type {
  FrameVersionId,
  SessionVersionId,
  FrameVersion,
  ArgumentSessionVersion,
} from "@/schema";
import { useRepository } from "@/state";

export type VersionFullLoadArg =
  | { kind: "frame"; version_id: FrameVersionId }
  | { kind: "session"; version_id: SessionVersionId };

export interface VersionFullLoadResult {
  status: "loading" | "ready" | "error";
  version: FrameVersion | ArgumentSessionVersion | null;
  error?: Error;
}

const MAX_CACHE = 8;
const cache: Map<string, FrameVersion | ArgumentSessionVersion> = new Map();
const in_flight: Map<string, Promise<FrameVersion | ArgumentSessionVersion>> = new Map();

function cacheKey(arg: VersionFullLoadArg): string {
  return `${arg.kind}:${arg.version_id}`;
}

function rememberInCache(key: string, value: FrameVersion | ArgumentSessionVersion): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_CACHE) {
    const first_key = cache.keys().next().value;
    if (first_key === undefined) break;
    cache.delete(first_key);
  }
}

export function __resetVersionFullLoadCacheForTests(): void {
  cache.clear();
  in_flight.clear();
}

export function useVersionFullLoad(arg: VersionFullLoadArg): VersionFullLoadResult {
  const { repository } = useRepository();
  const key = cacheKey(arg);
  const cached = cache.get(key);

  const [result, setResult] = React.useState<VersionFullLoadResult>(() =>
    cached
      ? { status: "ready", version: cached }
      : { status: "loading", version: null },
  );

  React.useEffect(() => {
    let cancelled = false;
    const hit = cache.get(key);
    if (hit) {
      setResult({ status: "ready", version: hit });
      return () => {
        cancelled = true;
      };
    }
    setResult({ status: "loading", version: null });

    let promise = in_flight.get(key);
    if (!promise) {
      promise =
        arg.kind === "frame"
          ? repository.loadFrameVersion(arg.version_id)
          : repository.loadSessionVersion(arg.version_id);
      in_flight.set(key, promise);
    }
    promise
      .then((version) => {
        in_flight.delete(key);
        rememberInCache(key, version);
        if (cancelled) return;
        setResult({ status: "ready", version });
      })
      .catch((e: unknown) => {
        in_flight.delete(key);
        if (cancelled) return;
        setResult({
          status: "error",
          version: null,
          error: e instanceof Error ? e : new Error(String(e)),
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, repository]);

  return result;
}
