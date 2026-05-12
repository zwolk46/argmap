// C6 — Authority binding determination. Pure.
//
// Resolution order: manual_override → F5 hierarchy database → string_match → no_jurisdiction.
// v1 ships F5 as a stub returning undefined; the F5 wire-in session populates
// it without changing this function's signature.

import type { Authority, Jurisdiction } from "@/schema";
import { F5_AVAILABLE, queryF5Binding } from "./f5";

export type BindingSource =
  | "manual_override"
  | "hierarchy_database"
  | "string_match"
  | "no_jurisdiction";

export type BindingCertainty = "exact" | "heuristic";

export interface BindingResult {
  binding: boolean;
  source: BindingSource;
  certainty: BindingCertainty;
  /** Free-text rationale; populated by F6-v2 wire-in, optional in v1. */
  reasoning?: string;
  /** F5 database version stamp when source === "hierarchy_database". */
  database_version?: string;
}

const SCOTUS_NAMES: ReadonlyArray<string> = [
  "supreme court of the united states",
  "united states supreme court",
  "u.s. supreme court",
  "us supreme court",
];

function normalizeCourt(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function regionsMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isBinding(authority: Authority, target_jurisdiction: Jurisdiction): BindingResult {
  // 1. Manual override wins.
  if (typeof authority.is_binding === "boolean") {
    return {
      binding: authority.is_binding,
      source: "manual_override",
      certainty: "exact",
    };
  }

  // 2. F5 hierarchy database. v1 stub returns undefined; F5 wire-in session
  // replaces queryF5Binding with the real lookup without changing this branch.
  if (
    F5_AVAILABLE &&
    authority.jurisdiction?.hierarchy_node_id &&
    target_jurisdiction.hierarchy_node_id
  ) {
    const r = queryF5Binding(
      authority.jurisdiction.hierarchy_node_id,
      target_jurisdiction.hierarchy_node_id,
    );
    if (r) {
      return {
        binding: r.binding,
        source: "hierarchy_database",
        certainty: "exact",
        reasoning: r.reasoning,
        database_version: r.database_version,
      };
    }
  }

  // 3. String-match heuristic.
  const courtName = normalizeCourt(authority.court);
  if (SCOTUS_NAMES.includes(courtName)) {
    return {
      binding: true,
      source: "string_match",
      certainty: "heuristic",
      reasoning: "U.S. Supreme Court is binding everywhere in the U.S. system.",
    };
  }

  const authJur = authority.jurisdiction;
  if (authJur) {
    // 3a. Same-circuit federal: both federal, regions equal.
    if (
      authJur.level === "federal" &&
      target_jurisdiction.level === "federal" &&
      regionsMatch(authJur.region, target_jurisdiction.region)
    ) {
      return { binding: true, source: "string_match", certainty: "heuristic" };
    }
    // 3b. Same level + same region.
    if (
      authJur.level === target_jurisdiction.level &&
      regionsMatch(authJur.region, target_jurisdiction.region)
    ) {
      return { binding: true, source: "string_match", certainty: "heuristic" };
    }
  }

  // 4. No-jurisdiction terminal — neither side had enough info to match.
  if (!authJur || (!target_jurisdiction.level && !target_jurisdiction.region)) {
    return { binding: false, source: "no_jurisdiction", certainty: "exact" };
  }

  return { binding: false, source: "string_match", certainty: "heuristic" };
}
