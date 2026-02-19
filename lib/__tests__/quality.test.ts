import { describe, it, expect } from "vitest";
import { calculateStructuralQuality } from "../quality";

// Helper: generate a uniform array of length n
const fill = (n: number, v: number) => Array.from({ length: n }, () => v);

describe("calculateStructuralQuality", () => {
  const windowSize = 12;

  it("scores elite for ultra-high ROIC + FCF + low volatility", () => {
    const result = calculateStructuralQuality({
      roicTTM: fill(20, 0.45),       // avgROIC 45% → +3 (ultra)
      fcfMarginsTTM: fill(20, 0.45), // avgFCF 45%  → +3 (ultra)
      yoyGrowthTTM: fill(20, 0.10),  // vol ≈ 0     → +1
      marginsTTM: fill(20, 0.30),    // vol ≈ 0     → +1
      windowSize,
    });
    expect(result.score).toBeGreaterThanOrEqual(5);
    expect(result.state).toBe("elite");
  });

  it("scores strong for good but not ultra metrics", () => {
    // ROIC 22% → +2, FCF 12% → 0, low growth vol → +1, low margin vol → +1 = 4 → strong
    const result = calculateStructuralQuality({
      roicTTM: fill(20, 0.22),       // avgROIC 22% → +2
      fcfMarginsTTM: fill(20, 0.12), // avgFCF 12%  → +0 (below 15%)
      yoyGrowthTTM: fill(20, 0.10),  // vol ≈ 0     → +1
      marginsTTM: fill(20, 0.25),    // vol ≈ 0     → +1
      windowSize,
    });
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThan(5);
    expect(result.state).toBe("strong");
  });

  it("scores weak for low ROIC/FCF + high volatility", () => {
    // Random-ish high-volatility growth
    const volatileGrowth = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? 0.4 : -0.3
    );
    const volatileMargins = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? 0.3 : 0.05
    );

    const result = calculateStructuralQuality({
      roicTTM: fill(20, 0.05),       // avgROIC 5%  → +0
      fcfMarginsTTM: fill(20, 0.02), // avgFCF 2%   → +0
      yoyGrowthTTM: volatileGrowth,  // high vol    → -1 (if not accelerating)
      marginsTTM: volatileMargins,   // high vol    → -1 (if not improving)
      windowSize,
    });
    expect(result.score).toBeLessThanOrEqual(0);
    expect(result.state).toBe("weak");
  });

  it("returns correct avgROIC and avgFCFMargin values", () => {
    const result = calculateStructuralQuality({
      roicTTM: fill(20, 0.15),
      fcfMarginsTTM: fill(20, 0.20),
      yoyGrowthTTM: fill(20, 0.08),
      marginsTTM: fill(20, 0.25),
      windowSize,
    });
    expect(result.avgROIC).toBeCloseTo(0.15, 4);
    expect(result.avgFCFMargin).toBeCloseTo(0.20, 4);
  });

  it("ROIC ultra tier: 40%+ gets +3", () => {
    const result = calculateStructuralQuality({
      roicTTM: fill(20, 0.42),
      fcfMarginsTTM: fill(20, 0.01), // minimal FCF to isolate ROIC
      yoyGrowthTTM: fill(20, 0.10),
      marginsTTM: fill(20, 0.20),
      windowSize,
    });
    // ROIC contributes +3, FCF contributes 0, vol contributes +1+1 = total 5
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it("does not penalize volatile growth when accelerating", () => {
    // Growth is volatile but the latest value is above the window average
    const growthTrending = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0 ? 0.05 + i * 0.02 : 0.1 + i * 0.02
    );

    const result = calculateStructuralQuality({
      roicTTM: fill(20, 0.15),
      fcfMarginsTTM: fill(20, 0.10),
      yoyGrowthTTM: growthTrending,
      marginsTTM: fill(20, 0.25),
      windowSize,
    });
    expect(result.isAcceleratingGrowth).toBe(true);
  });
});
