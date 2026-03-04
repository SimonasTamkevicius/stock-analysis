/**
 * Centralized time-window resolution.
 *
 * Converts presets (1y / 3y / 5y / max), custom date ranges, or single-date
 * inputs into concrete { startDate, endDate } pairs, then provides helpers
 * to cap data arrays to that range.
 */

// ── Types ────────────────────────────────────────

export type Preset = "1y" | "3y" | "5y" | "max";

export type TimeWindowInput =
  | { preset: Preset }
  | { startDate: string; endDate: string }
  | { startDate: string }
  | { endDate: string };

export interface TimeWindowResult {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// ── Helpers ──────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Clamp a date string to [min, max]. */
function clampDate(date: string, min?: string, max?: string): string {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

function subtractYears(from: string, years: number): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() - years);
  return toISO(d);
}

function addYears(from: string, years: number): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return toISO(d);
}

// ── Core resolver ────────────────────────────────

/**
 * Compute a concrete { startDate, endDate } from flexible inputs.
 *
 * @param input          Preset, custom range, start-only, or end-only.
 * @param availableStart Earliest date present in the data (optional clamp).
 * @param availableEnd   Latest date present in the data (optional clamp).
 */
export function computeTimeWindow(
  input: TimeWindowInput,
  availableStart?: string,
  availableEnd?: string
): TimeWindowResult {
  const today = toISO(new Date());

  let start: string;
  let end: string;

  if ("preset" in input) {
    end = today;

    switch (input.preset) {
      case "1y":
        start = subtractYears(today, 1);
        break;
      case "3y":
        start = subtractYears(today, 3);
        break;
      case "5y":
        start = subtractYears(today, 5);
        break;
      case "max":
        start = availableStart ?? "1900-01-01";
        break;
    }
  } else if ("startDate" in input && "endDate" in input) {
    // Full custom range
    start = input.startDate.length === 7 ? `${input.startDate}-01` : input.startDate;
    end = input.endDate.length === 7 ? `${input.endDate}-31` : input.endDate;
  } else if ("startDate" in input) {
    // Start-only → forward 3 years (or max available / today)
    start = input.startDate.length === 7 ? `${input.startDate}-01` : input.startDate;
    const threeYearsForward = addYears(start, 3);
    const ceiling = availableEnd && availableEnd < today ? availableEnd : today;
    end = threeYearsForward > ceiling ? ceiling : threeYearsForward;
  } else {
    // End-only → back 3 years (or max available)
    end = input.endDate.length === 7 ? `${input.endDate}-31` : input.endDate;
    const threeYearsBack = subtractYears(end, 3);
    const floor = availableStart ?? "1900-01-01";
    start = threeYearsBack < floor ? floor : threeYearsBack;
  }

  // Clamp to available data boundaries
  start = clampDate(start, availableStart, availableEnd);
  end = clampDate(end, availableStart, availableEnd);

  return { startDate: start, endDate: end };
}

// ── Array cappers ────────────────────────────────

/**
 * Filter a date-sorted array of objects (with a `date` field) to the window.
 */
export function applyTimeWindowToSeries<T extends { date: string }>(
  series: T[],
  startDate: string,
  endDate: string
): T[] {
  return series.filter((item) => item.date >= startDate && item.date <= endDate);
}

/**
 * Filter quarterly report objects (with `fiscalDateEnding`) to the window.
 */
export function applyTimeWindowToReports(
  reports: any[],
  startDate: string,
  endDate: string
): any[] {
  return reports.filter(
    (r: any) => r.fiscalDateEnding >= startDate && r.fiscalDateEnding <= endDate
  );
}
