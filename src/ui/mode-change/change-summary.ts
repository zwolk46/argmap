import type { Mode, Flavor } from "@/schema";

export function buildModeChangeSummary(
  current_mode: Mode,
  current_flavor: Flavor | undefined,
  target_mode: Mode,
  target_flavor: Flavor | undefined,
): string {
  const left =
    current_mode === "legal" ? "legal" : `general (${current_flavor ?? "personal"})`;
  const right =
    target_mode === "legal" ? "legal" : `general (${target_flavor ?? "personal"})`;
  return `mode changed: ${left} → ${right}`;
}
