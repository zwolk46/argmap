// F5 stub for v1. Per current_state.html and Stream F: the court hierarchy
// database is a substantial sub-project deferred to its own wire-in session.
// v1 ships F6-v1 (manual override + string-match heuristic in
// authority-binding.ts) with F5's module slot here so the wire-in session has
// a place to plug in without restructuring.

export const F5_AVAILABLE = false;

/**
 * v1 stub: always returns undefined. Caller falls through to the string-match
 * heuristic in authority-binding.ts.
 */
export function queryF5Binding(
  _authority_court_id: string,
  _target_court_id: string,
): { binding: boolean; reasoning?: string; database_version?: string } | undefined {
  return undefined;
}
