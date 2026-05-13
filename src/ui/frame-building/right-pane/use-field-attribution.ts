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

export function useFieldAttribution(
  node_id: NodeRef,
  field_path: string,
): HookInvocationRecord | null {
  const invocations = useFrameStore((s) => s.frame?.llm_settings?.invocations ?? []);
  return fieldAttributionPath(invocations, node_id, field_path);
}
