/**
 * Shared design utilities — single source of truth for color, badge, and formatting helpers.
 */

/** Score color: positive → emerald, negative → rose, neutral → muted */
export function getScoreColor(score: number): string {
  if (score >= 1) return "text-emerald-500";
  if (score <= -1) return "text-rose-500";
  return "text-text-muted";
}

/** Badge pill styles based on state string */
export function getBadgeStyles(state: string): string {
  const s = state.toLowerCase();

  const isPositive =
    s.includes("accel") ||
    s.includes("expan") ||
    s.includes("improv") ||
    s.includes("inflect") ||
    s.includes("elite") ||
    s.includes("strong") ||
    s.includes("compounder") ||
    s.includes("positive") ||
    s.includes("low-risk");

  const isNegative =
    s.includes("decel") ||
    s.includes("compress") ||
    s.includes("deterior") ||
    s.includes("weak") ||
    s.includes("negative") ||
    s.includes("high-risk");

  if (isPositive)
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (isNegative)
    return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  return "bg-surface text-text-muted border-border-subtle";
}

/** Metric value color: positive → emerald, negative → rose, neutral → amber */
export function getMetricColor(
  v: number,
  goodThreshold: number,
  badThreshold: number,
  lowerIsBetter = false
): string {
  if (lowerIsBetter) {
    if (v < goodThreshold) return "text-emerald-500";
    if (v > badThreshold) return "text-rose-500";
    return "text-amber-500";
  }
  if (v > goodThreshold) return "text-emerald-500";
  if (v < badThreshold) return "text-rose-500";
  return "text-amber-500";
}

/** Format state string: "low-risk" → "Low Risk" */
export function formatState(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format number as percentage */
export function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
