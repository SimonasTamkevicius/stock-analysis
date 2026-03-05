import { describe, it, expect } from "vitest";
import { calculateSlopeV2, calculateSlopeV2WithR2 } from "../slopeCalculation";

describe("calculateSlopeV2 (Theil–Sen)", () => {
  it("detects positive trend", () => {
    expect(calculateSlopeV2([1,2,3,4,5])).toBeCloseTo(1);
  });

  it("detects negative trend", () => {
    expect(calculateSlopeV2([5,4,3,2,1])).toBeCloseTo(-1);
  });

  it("handles outlier robustly", () => {
    const result = calculateSlopeV2([1,2,100,4,5]);
    expect(result).toBeCloseTo(1);
  });

  it("returns 0 for insufficient data", () => {
    expect(calculateSlopeV2([1])).toBe(0);
  });
});

describe("calculateSlopeV2WithR2 (Theil–Sen + R²)", () => {
  it("returns slope≈1 and r²≈1 for perfect linear input", () => {
    const { slope, r2 } = calculateSlopeV2WithR2([1, 2, 3, 4, 5]);
    expect(slope).toBeCloseTo(1, 6);
    expect(r2).toBeCloseTo(1, 6);
  });

  it("returns slope≈0 and r²=0 for flat input", () => {
    const { slope, r2 } = calculateSlopeV2WithR2([5, 5, 5, 5]);
    expect(slope).toBeCloseTo(0, 6);
    expect(r2).toBe(0);
  });

  it("keeps r² within [0,1] for noisy data", () => {
    const { r2 } = calculateSlopeV2WithR2([1, 2, 100, 4, 5]);
    expect(r2).toBeGreaterThanOrEqual(0);
    expect(r2).toBeLessThanOrEqual(1);
  });
});
