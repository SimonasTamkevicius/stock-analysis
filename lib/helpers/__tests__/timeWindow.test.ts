import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeTimeWindow,
  applyTimeWindowToSeries,
  applyTimeWindowToReports,
} from "../timeWindow";

// Pin "today" to 2025-06-15 for deterministic tests
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-06-15"));
});
afterEach(() => {
  vi.useRealTimers();
});

// ── computeTimeWindow: presets ─────────────────────

describe("computeTimeWindow — presets", () => {
  it("1y returns ~1 year back from today", () => {
    const r = computeTimeWindow({ preset: "1y" });
    expect(r.startDate).toBe("2024-06-15");
    expect(r.endDate).toBe("2025-06-15");
  });

  it("3y returns ~3 years back from today", () => {
    const r = computeTimeWindow({ preset: "3y" });
    expect(r.startDate).toBe("2022-06-15");
    expect(r.endDate).toBe("2025-06-15");
  });

  it("5y returns ~5 years back from today", () => {
    const r = computeTimeWindow({ preset: "5y" });
    expect(r.startDate).toBe("2020-06-15");
    expect(r.endDate).toBe("2025-06-15");
  });

  it("max uses availableStart", () => {
    const r = computeTimeWindow({ preset: "max" }, "2010-01-01");
    expect(r.startDate).toBe("2010-01-01");
    expect(r.endDate).toBe("2025-06-15");
  });

  it("max without availableStart falls back to 1900-01-01", () => {
    const r = computeTimeWindow({ preset: "max" });
    expect(r.startDate).toBe("1900-01-01");
  });

  it("preset clamps start to availableStart if data is shorter", () => {
    const r = computeTimeWindow({ preset: "5y" }, "2022-01-01");
    expect(r.startDate).toBe("2022-01-01");
  });
});

// ── computeTimeWindow: custom range ────────────────

describe("computeTimeWindow — custom range", () => {
  it("pass-through for full custom range", () => {
    const r = computeTimeWindow({ startDate: "2020-01-01", endDate: "2023-12-31" });
    expect(r.startDate).toBe("2020-01-01");
    expect(r.endDate).toBe("2023-12-31");
  });

  it("normalises YYYY-MM format", () => {
    const r = computeTimeWindow({ startDate: "2020-01", endDate: "2023-12" });
    expect(r.startDate).toBe("2020-01-01");
    expect(r.endDate).toBe("2023-12-31");
  });
});

// ── computeTimeWindow: start-only ──────────────────

describe("computeTimeWindow — start-only", () => {
  it("goes forward 3 years from start", () => {
    const r = computeTimeWindow({ startDate: "2020-03-01" });
    expect(r.startDate).toBe("2020-03-01");
    // JS Date addYears can drift ±1 day around leap years
    expect(r.endDate.startsWith("2023-03")).toBe(true);
  });

  it("clamps to today when 3y forward exceeds now", () => {
    const r = computeTimeWindow({ startDate: "2024-01-01" });
    expect(r.endDate).toBe("2025-06-15");
  });

  it("clamps to availableEnd when data is shorter", () => {
    const r = computeTimeWindow(
      { startDate: "2020-01-01" },
      "2018-01-01",
      "2022-06-01"
    );
    expect(r.endDate).toBe("2022-06-01");
  });
});

// ── computeTimeWindow: end-only ────────────────────

describe("computeTimeWindow — end-only", () => {
  it("goes 3 years back from end", () => {
    const r = computeTimeWindow({ endDate: "2024-06-15" });
    expect(r.startDate).toBe("2021-06-15");
    expect(r.endDate).toBe("2024-06-15");
  });

  it("clamps to availableStart when data is shorter", () => {
    const r = computeTimeWindow({ endDate: "2024-06-15" }, "2023-01-01");
    expect(r.startDate).toBe("2023-01-01");
  });
});

// ── applyTimeWindowToSeries ────────────────────────

describe("applyTimeWindowToSeries", () => {
  const series = [
    { date: "2020-01-15", close: 100 },
    { date: "2021-06-15", close: 110 },
    { date: "2022-03-15", close: 120 },
    { date: "2023-09-15", close: 130 },
    { date: "2024-12-15", close: 140 },
  ];

  it("filters to the correct range", () => {
    const result = applyTimeWindowToSeries(series, "2021-01-01", "2023-12-31");
    expect(result.map((s) => s.close)).toEqual([110, 120, 130]);
  });

  it("returns empty when nothing matches", () => {
    expect(applyTimeWindowToSeries(series, "2030-01-01", "2031-01-01")).toEqual([]);
  });

  it("includes boundary dates", () => {
    const result = applyTimeWindowToSeries(series, "2020-01-15", "2020-01-15");
    expect(result).toHaveLength(1);
  });
});

// ── applyTimeWindowToReports ───────────────────────

describe("applyTimeWindowToReports", () => {
  const reports = [
    { fiscalDateEnding: "2020-03-31", totalRevenue: 100 },
    { fiscalDateEnding: "2021-06-30", totalRevenue: 200 },
    { fiscalDateEnding: "2022-09-30", totalRevenue: 300 },
    { fiscalDateEnding: "2023-12-31", totalRevenue: 400 },
  ];

  it("filters quarterly reports to the range", () => {
    const result = applyTimeWindowToReports(reports, "2021-01-01", "2022-12-31");
    expect(result).toHaveLength(2);
    expect(result[0].totalRevenue).toBe(200);
    expect(result[1].totalRevenue).toBe(300);
  });
});
