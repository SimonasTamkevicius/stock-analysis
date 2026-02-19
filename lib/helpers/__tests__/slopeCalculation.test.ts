import { describe, it, expect } from "vitest";
import {
  calculateSlope,
  buildRegressionLine,
} from "../slopeCalculation";

// ── calculateSlope ───────────────────────────────

describe("calculateSlope", () => {
  it("returns slope ≈ 1 for perfect linear input [1,2,3,4,5]", () => {
    expect(calculateSlope([1, 2, 3, 4, 5])).toBeCloseTo(1.0, 6);
  });

  it("returns slope ≈ 0 for flat input", () => {
    expect(calculateSlope([5, 5, 5, 5])).toBeCloseTo(0, 6);
  });

  it("returns negative slope for declining input", () => {
    const slope = calculateSlope([10, 8, 6, 4, 2]);
    expect(slope).toBeCloseTo(-2.0, 6);
  });

  it("returns 0 for fewer than 3 values", () => {
    expect(calculateSlope([1, 2])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateSlope([])).toBe(0);
  });

  it("handles fractional slopes", () => {
    // [0, 0.1, 0.2, 0.3] → slope = 0.1
    const slope = calculateSlope([0, 0.1, 0.2, 0.3]);
    expect(slope).toBeCloseTo(0.1, 6);
  });
});

// ── buildRegressionLine ──────────────────────────

describe("buildRegressionLine", () => {
  it("regression line length equals input length", () => {
    const values = [1, 3, 2, 4, 5];
    const slope = calculateSlope(values);
    const line = buildRegressionLine(values, slope);
    expect(line.length).toBe(values.length);
  });

  it("regression line passes through the mean point", () => {
    const values = [2, 4, 6, 8, 10];
    const slope = calculateSlope(values);
    const line = buildRegressionLine(values, slope);
    const meanY = values.reduce((a, b) => a + b, 0) / values.length;
    const midIndex = Math.floor(values.length / 2);
    // The midpoint of a 5-element array (index 2) should be near the mean
    expect(line[midIndex]).toBeCloseTo(meanY, 4);
  });

  it("for perfect linear data, regression line matches input", () => {
    const values = [1, 2, 3, 4, 5];
    const slope = calculateSlope(values);
    const line = buildRegressionLine(values, slope);
    values.forEach((v, i) => {
      expect(line[i]).toBeCloseTo(v, 4);
    });
  });
});
