import type { HookInvocationRecord } from "@/llm-hooks";
import type { NodeRef } from "@/schema";
import { useFrameStore } from "@/state";

export function fieldAttributionPath(
  invocations: ReadonlyArray<HookInvocationRecord>,
  node_id: NodeRef,
  field_path: string,
): HookInvocationRecord | null {
  for (let i = invocations.length - 1; i >= 0; i--) {
    const rec = invocations[i];
    if (rec.decision !== "accepted" && rec.decision !== "edited") continue;
    if (!rec.target_node_ids?.includes(node_id)) continue;
    if (!rec.target_field_paths?.includes(field_path)) continue;
    return rec;
  }
  return null;
}

// Module-level singleton fallback. Zustand selectors must return a stable
// reference when nothing has changed: returning a fresh `[]` inside the
// selector triggers React's "result of getSnapshot should be cached"
// invariant and (in dev) "Maximum update depth exceeded" loops, because
// useSyncExternalStore considers every render's snapshot different and
// schedules a forced re-render. The component this hook is used in
// (FieldAttributionDecoration) mounts when the inspector is open and was
// the source of an infinite loop the moment a node was selected.
const EMPTY_INVOCATIONS: ReadonlyArray<HookInvocationRecord> = [];

export function useFieldAttribution(
  node_id: NodeRef,
  field_path: string,
): HookInvocationRecord | null {
  const invocations = useFrameStore((s) => s.frame?.llm_settings?.invocations ?? EMPTY_INVOCATIONS);
  return fieldAttributionPath(invocations, node_id, field_path);
}
