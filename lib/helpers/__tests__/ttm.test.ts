import { describe, it, expect } from "vitest";
import { calculateTTM } from "../ttm";

describe("calculateTTM", () => {
  it("produces correct TTM values from 8 quarters", () => {
    // Quarters: [10, 20, 30, 40, 50, 60, 70, 80]
    // TTM[0] = 10+20+30+40 = 100
    // TTM[1] = 20+30+40+50 = 140
    // TTM[2] = 30+40+50+60 = 180
    // TTM[3] = 40+50+60+70 = 220
    // TTM[4] = 50+60+70+80 = 260
    const result = calculateTTM([10, 20, 30, 40, 50, 60, 70, 80]);
    expect(result).toEqual([100, 140, 180, 220, 260]);
  });

  it("returns empty array for fewer than 4 quarters", () => {
    expect(calculateTTM([1, 2, 3])).toEqual([]);
  });

  it("returns one value for exactly 4 quarters", () => {
    const result = calculateTTM([5, 10, 15, 20]);
    expect(result).toEqual([50]);
  });

  it("handles negative values correctly", () => {
    const result = calculateTTM([-10, 5, -3, 8, 12]);
    // TTM[0] = -10+5+(-3)+8 = 0
    // TTM[1] = 5+(-3)+8+12 = 22
    expect(result).toEqual([0, 22]);
  });
});
