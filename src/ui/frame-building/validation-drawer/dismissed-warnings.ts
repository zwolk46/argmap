import type { ValidationResult } from "@/schema";

// frame_id should be passed by callers who have it; defaults to the literal "frame"
// when called with only the result (spec signature is kept for test compatibility).
export function dismissalKeyFor(result: ValidationResult, frame_id = "frame"): string {
  return `${frame_id}::${result.rule_id}::${result.node_id ?? "frame"}`;
}

export function partitionByDismissal(
  warnings: ReadonlyArray<ValidationResult>,
  dismissed_keys: ReadonlySet<string>,
): {
  active: ReadonlyArray<ValidationResult>;
  dismissed: ReadonlyArray<ValidationResult>;
} {
  const active: ValidationResult[] = [];
  const dismissed: ValidationResult[] = [];
  for (const w of warnings) {
    const key = dismissalKeyFor(w);
    if (dismissed_keys.has(key)) {
      dismissed.push(w);
    } else {
      active.push(w);
    }
  }
  return { active, dismissed };
}
