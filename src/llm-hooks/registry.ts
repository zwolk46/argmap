import type { HookContract, HookId } from "./types";
import { ALL_HOOKS } from "./hooks";
import { sortedIter } from "@/runtime/iteration-helpers";

const REGISTRY: ReadonlyMap<HookId, HookContract<unknown, unknown>> = new Map(
  [...ALL_HOOKS]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((h): [HookId, HookContract<unknown, unknown>] => [h.id, h]),
);

export function getHook(id: HookId): HookContract<unknown, unknown> {
  const hook = REGISTRY.get(id);
  if (!hook) throw new Error(`Unknown hook id: ${id}`);
  return hook;
}

export function listHooks(): HookContract<unknown, unknown>[] {
  return sortedIter(REGISTRY);
}

export function listHooksForMode(
  mode: "legal" | "general",
  flavor?: "personal" | "academic",
): HookContract<unknown, unknown>[] {
  return listHooks().filter((h) => {
    const mv = h.mode_visibility;
    if (mode === "legal") return mv.legal;
    if (!flavor) return mv.general.personal || mv.general.academic;
    return mv.general[flavor];
  });
}

export { REGISTRY as HOOK_REGISTRY };
