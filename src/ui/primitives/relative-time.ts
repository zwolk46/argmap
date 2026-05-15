/**
 * Format a past ISO timestamp as a short "Xs/m/h/d ago" string.
 *
 * Clock-skew safety: clamps at zero so a slightly-future timestamp
 * (browser clock behind server) doesn't render "-5s ago". A future
 * timestamp by more than a minute will still appear as "0s ago" — that
 * indicates a real clock issue, not a UI bug.
 *
 * Use this everywhere the UI shows a "last updated" / "created at"
 * relative stamp. Don't reinvent the math per call site.
 */
export function relativeTime(iso: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const delta_s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (delta_s < 60) return `${delta_s}s ago`;
  if (delta_s < 3600) return `${Math.floor(delta_s / 60)}m ago`;
  if (delta_s < 86400) return `${Math.floor(delta_s / 3600)}h ago`;
  return `${Math.floor(delta_s / 86400)}d ago`;
}
