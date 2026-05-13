import type { ValidationResult } from "@/schema";

/**
 * Computes the canonical key used to record a dismissed validation result in
 * AppState.dismissed_warnings. The frame_id parameter is REQUIRED for the
 * key to match what the drawer dispatches when the user clicks the dismiss
 * affordance — without it, the partition function defaulted to the literal
 * string "frame", while the drawer's onClick handlers used the real
 * frame.id, so warnings were "dismissed" under one key and looked up under
 * another. Result: clicking × silently did nothing. (P0-20.)
 */
export function dismissalKeyFor(result: ValidationResult, frame_id: string): string {
  return `${frame_id}::${result.rule_id}::${result.node_id ?? "frame"}`;
}

export function partitionByDismissal(
  warnings: ReadonlyArray<ValidationResult>,
  dismissed_keys: ReadonlySet<string>,
  frame_id: string,
): {
  active: ReadonlyArray<ValidationResult>;
  dismissed: ReadonlyArray<ValidationResult>;
} {
  const active: ValidationResult[] = [];
  const dismissed: ValidationResult[] = [];
  for (const w of warnings) {
    const key = dismissalKeyFor(w, frame_id);
    if (dismissed_keys.has(key)) {
      dismissed.push(w);
    } else {
      active.push(w);
    }
  }
  return { active, dismissed };
}
