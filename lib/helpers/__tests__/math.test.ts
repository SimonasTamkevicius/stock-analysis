import { describe, it, expect } from "vitest";
import {
  calculateStdDev,
  applyRollingWindow,
  safeNumber,
} from "../math";

// ── calculateStdDev ──────────────────────────────

describe("calculateStdDev", () => {
  it("returns the population standard deviation", () => {
    // Known: σ of [2, 4, 4, 4, 5, 5, 7, 9] = 2.0
    const result = calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.0, 4);
  });

  it("returns 0 for an empty array", () => {
    expect(calculateStdDev([])).toBe(0);
  });

  it("returns 0 for a single-element array", () => {
    expect(calculateStdDev([5])).toBe(0);
  });

  it("returns 0 for identical values", () => {
    expect(calculateStdDev([3, 3, 3, 3])).toBe(0);
  });

  it("handles negative values", () => {
    // σ of [-1, 1] = 1.0
    expect(calculateStdDev([-1, 1])).toBeCloseTo(1.0, 4);
  });
});

// ── applyRollingWindow ───────────────────────────

describe("applyRollingWindow", () => {
  it("returns last N elements when array is longer", () => {
    const result = applyRollingWindow([1, 2, 3, 4, 5, 6, 7, 8], 4);
    expect(result).toEqual([5, 6, 7, 8]);
  });

  it("returns full array when shorter than window", () => {
    const result = applyRollingWindow([1, 2, 3], 10);
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns full array when equal to window", () => {
    const result = applyRollingWindow([1, 2, 3, 4], 4);
    expect(result).toEqual([1, 2, 3, 4]);
  });
});

// ── safeNumber ───────────────────────────────────

describe("safeNumber", () => {
  it("converts a numeric string", () => {
    expect(safeNumber("42.5")).toBe(42.5);
  });

  it("returns 0 for NaN-producing input", () => {
    expect(safeNumber("abc")).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(safeNumber(undefined)).toBe(0);
  });

  it("returns 0 for null", () => {
    expect(safeNumber(null)).toBe(0);
  });

  it("passes through an actual number", () => {
    expect(safeNumber(7)).toBe(7);
  });
});
