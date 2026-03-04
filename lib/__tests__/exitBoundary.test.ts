import { describe, it, expect } from "vitest";
import {
  computeExitBoundaries,
  computePortfolioExitBoundaries,
  probitApprox,
  ExitBoundaryInput,
} from "../exitBoundary";
import {
  computeAnnualizedVolatility,
  estimateForwardGrowth,
} from "../helpers/exitBoundaryHelpers";

// ──────────────────────────────────────────────────
// Hand-computed reference values
// ──────────────────────────────────────────────────
//
// For the baseline test:
//   S₀ = 100, σ = 0.30, g = 0.10, β = 1.0, μ_m = 0.10
//   sectorPE = 20, stockPE = 20 → premium = 0, λ = 0
//   μ = 0.10 + 1.0×0.10 − 0 = 0.20
//   α = 0.20 → z ≈ 0.8416
//   T = 1
//
//   vol_term   = 0.30×√1 = 0.30
//
//   Upper = 100 × exp(0.20 + 0.8416×0.30) = 100 × exp(0.4525) ≈ 157.22
//   Lower (mu=0) = 100 × exp(0 - 0.8416×0.30) = 100 × exp(-0.2525) ≈ 77.69
//
// ──────────────────────────────────────────────────

function baseline(): ExitBoundaryInput {
  return {
    entryPrice: 100,
    annualizedVolatility: 0.30,
    forwardEarningsGrowth: 0.10,
    betaToMarket: 1.0,
    expectedMarketReturn: 0.10,
    sectorPE: 20,
    stockPE: 20,
    riskFreeRate: 0.045,
    riskToleranceAlpha: 0.20,
    holdingPeriodYears: 1.0,
  };
}

// ──────────────────────────────────────────────────
// Probit function tests
// ──────────────────────────────────────────────────

describe("probitApprox", () => {
  it("returns 0 for p = 0.5", () => {
    expect(probitApprox(0.5)).toBe(0);
  });

  it("returns ≈ 0.842 for p = 0.80 (z for α=0.20)", () => {
    const z = probitApprox(0.80);
    expect(z).toBeCloseTo(0.8416, 2);
  });

  it("returns ≈ 1.282 for p = 0.90", () => {
    expect(probitApprox(0.90)).toBeCloseTo(1.282, 2);
  });

  it("returns ≈ 1.645 for p = 0.95", () => {
    expect(probitApprox(0.95)).toBeCloseTo(1.645, 2);
  });

  it("returns ≈ 2.326 for p = 0.99", () => {
    expect(probitApprox(0.99)).toBeCloseTo(2.326, 1);
  });

  it("is symmetric: probit(p) = -probit(1-p)", () => {
    expect(probitApprox(0.80)).toBeCloseTo(-probitApprox(0.20), 4);
    expect(probitApprox(0.95)).toBeCloseTo(-probitApprox(0.05), 4);
  });

  it("handles edge cases", () => {
    expect(probitApprox(0)).toBe(-Infinity);
    expect(probitApprox(1)).toBe(Infinity);
  });
});

// ──────────────────────────────────────────────────
// Core boundary math tests
// ──────────────────────────────────────────────────

describe("computeExitBoundaries — hand-verified math", () => {
  it("matches hand-computed values for baseline inputs", () => {
    const result = computeExitBoundaries(baseline());

    // μ = 0.10 + 0.10 - 0 = 0.20
    expect(result.expectedDrift).toBeCloseTo(0.20, 4);

    // λ = 0 (stockPE === sectorPE)
    expect(result.valuationPenalty).toBeCloseTo(0, 4);

    // z ≈ 0.842
    expect(result.zScore).toBeCloseTo(0.842, 2);

    // Upper ≈ 157.22
    expect(result.upperBoundary).toBeCloseTo(157.2, 0);

    // Lower ≈ 77.69
    expect(result.lowerBoundary).toBeCloseTo(77.7, 0);

    // Upside ≈ 57.2%, Downside ≈ 22.3%
    expect(result.upsidePotential).toBeCloseTo(0.572, 1);
    expect(result.downsideRisk).toBeCloseTo(0.223, 1);

    // R:R ≈ 2.56
    expect(result.rewardToRisk).toBeGreaterThan(2);
  });

  it("with overvalued stock (stockPE > sectorPE): boundaries shift down", () => {
    // stockPE = 30, sectorPE = 20 → premium = 0.5
    // λ = 0.15 × (2/π) × atan(0.5) ≈ 0.15 × 0.6366 × 0.4636 ≈ 0.0443
    // μ = 0.10 + 0.10 - 0.0443 ≈ 0.156
    const result = computeExitBoundaries({
      ...baseline(),
      stockPE: 30,
    });

    expect(result.valuationPenalty).toBeGreaterThan(0.03);
    expect(result.valuationPenalty).toBeLessThan(0.10);
    expect(result.expectedDrift).toBeLessThan(0.20); // lower than fair-valued
    expect(result.expectedDrift).toBeGreaterThan(0.10); // but still positive
  });

  it("with undervalued stock (stockPE < sectorPE): no penalty", () => {
    const result = computeExitBoundaries({
      ...baseline(),
      stockPE: 15,
    });

    // No penalty for undervaluation
    expect(result.valuationPenalty).toBe(0);
    expect(result.expectedDrift).toBeCloseTo(0.20, 4);
  });

  it("realistic AAPL-like inputs produce practical boundaries", () => {
    const result = computeExitBoundaries({
      entryPrice: 180,
      annualizedVolatility: 0.28,
      forwardEarningsGrowth: 0.08,
      sectorPE: 25,
      stockPE: 30,
      riskToleranceAlpha: 0.20,
      holdingPeriodYears: 1,
    });

    // Upper should be roughly 20-60% above entry
    expect(result.upperBoundary).toBeGreaterThan(200);
    expect(result.upperBoundary).toBeLessThan(300);

    // Lower should be roughly 10-30% below entry
    expect(result.lowerBoundary).toBeGreaterThan(130);
    expect(result.lowerBoundary).toBeLessThan(175);

    // Reward-to-risk should be positive and reasonable
    expect(result.rewardToRisk).toBeGreaterThan(0.5);
    expect(result.rewardToRisk).toBeLessThan(10);
  });

  it("PLTR-like stock: extreme PE still produces practical boundaries", () => {
    // PLTR: EV/EBITDA ≈ 80, sector ≈ 20 → premium = 3.0
    // λ = 0.15 × (2/π) × atan(3.0) ≈ 0.15 × 0.6366 × 1.249 ≈ 0.119
    // With growth = 0.25: μ = 0.25 + 0.10 - 0.119 ≈ 0.231
    const result = computeExitBoundaries({
      entryPrice: 118,
      annualizedVolatility: 0.55,
      forwardEarningsGrowth: 0.25,
      sectorPE: 20,
      stockPE: 80,
      riskToleranceAlpha: 0.20,
      holdingPeriodYears: 1,
    });

    // Target should be ABOVE entry (not below like the old bug)
    expect(result.upperBoundary).toBeGreaterThan(118);
    // Stop should be below entry but reasonable (not $19)
    expect(result.lowerBoundary).toBeGreaterThan(50);
    expect(result.lowerBoundary).toBeLessThan(118);
    // Drift should be positive for a high-growth stock
    expect(result.expectedDrift).toBeGreaterThan(0);
    // Penalty should be moderate, not 150%
    expect(result.valuationPenalty).toBeLessThan(0.15);
    // R:R should be positive
    expect(result.rewardToRisk).toBeGreaterThan(0.5);
  });
});

// ──────────────────────────────────────────────────
// Monotonicity tests
// ──────────────────────────────────────────────────

describe("monotonicity", () => {
  it("higher volatility → wider boundaries (both directions)", () => {
    const lowVol = computeExitBoundaries({ ...baseline(), annualizedVolatility: 0.15 });
    const highVol = computeExitBoundaries({ ...baseline(), annualizedVolatility: 0.50 });

    expect(highVol.upperBoundary).toBeGreaterThan(lowVol.upperBoundary);
    expect(highVol.lowerBoundary).toBeLessThan(lowVol.lowerBoundary);
  });

  it("higher positive drift → upper boundary shifts up (lower boundary unchanged)", () => {
    const lowDrift = computeExitBoundaries({ ...baseline(), forwardEarningsGrowth: 0.0 });
    const highDrift = computeExitBoundaries({ ...baseline(), forwardEarningsGrowth: 0.30 });

    expect(highDrift.upperBoundary).toBeGreaterThan(lowDrift.upperBoundary);
    // With asymmetric drift, positive drift doesn't lift the lower boundary
    expect(highDrift.lowerBoundary).toBeCloseTo(lowDrift.lowerBoundary, 4);
  });

  it("lower alpha (tighter risk) → wider boundaries", () => {
    // Lower α = more conservative = boundaries further from entry
    const loose = computeExitBoundaries({ ...baseline(), riskToleranceAlpha: 0.30 });
    const tight = computeExitBoundaries({ ...baseline(), riskToleranceAlpha: 0.05 });

    expect(tight.upperBoundary).toBeGreaterThan(loose.upperBoundary);
    expect(tight.lowerBoundary).toBeLessThan(loose.lowerBoundary);
  });

  it("longer holding period → wider boundaries", () => {
    const short = computeExitBoundaries({ ...baseline(), holdingPeriodYears: 0.5 });
    const long = computeExitBoundaries({ ...baseline(), holdingPeriodYears: 3.0 });

    expect(long.upperBoundary).toBeGreaterThan(short.upperBoundary);
  });

  it("higher valuation penalty → lower upper boundary", () => {
    const fair = computeExitBoundaries({ ...baseline(), stockPE: 20 });
    const expensive = computeExitBoundaries({ ...baseline(), stockPE: 40 });

    expect(expensive.upperBoundary).toBeLessThan(fair.upperBoundary);
  });
});

// ──────────────────────────────────────────────────
// Edge cases
// ──────────────────────────────────────────────────

describe("edge cases", () => {
  it("very low volatility → tight boundaries around expected drift", () => {
    const result = computeExitBoundaries({
      ...baseline(),
      annualizedVolatility: 0.01,
    });

    // Lower boundary doesn't get the +0.20 drift, so it's ~99.16
    const expectedUpper = 100 * Math.exp(0.20 - 0.5 * 0.0001);
    const expectedLower = 100 * Math.exp(0 - 0.5 * 0.0001);
    expect(result.upperBoundary).toBeCloseTo(expectedUpper, -1);
    expect(result.lowerBoundary).toBeCloseTo(expectedLower, -1);
  });

  it("negative drift → lower boundary is well below entry", () => {
    const result = computeExitBoundaries({
      ...baseline(),
      forwardEarningsGrowth: -0.20,
      stockPE: 30, // adds penalty
    });

    expect(result.expectedDrift).toBeLessThan(0);
    expect(result.lowerBoundary).toBeLessThan(100);
  });

  it("extreme overvaluation: penalty saturates via arctan", () => {
    const result = computeExitBoundaries({
      ...baseline(),
      stockPE: 200,
      sectorPE: 20,
    });

    // With arctan, λ maxes out at γ × (2/π) × (π/2) = γ = 0.15
    expect(result.valuationPenalty).toBeLessThan(0.15);
    expect(result.valuationPenalty).toBeGreaterThan(0.10);
  });

  it("zero sector PE → no valuation penalty", () => {
    const result = computeExitBoundaries({
      ...baseline(),
      sectorPE: 0,
    });

    expect(result.valuationPenalty).toBe(0);
  });
});

// ──────────────────────────────────────────────────
// Optional enhancements
// ──────────────────────────────────────────────────

describe("optional enhancements", () => {
  it("rolling vol adjustment widens boundaries", () => {
    const without = computeExitBoundaries(baseline());
    const withAdj = computeExitBoundaries({
      ...baseline(),
      options: { rollingVolatilityAdjustment: true },
    });

    expect(withAdj.upperBoundary).toBeGreaterThan(without.upperBoundary);
    expect(withAdj.lowerBoundary).toBeLessThan(without.lowerBoundary);
    expect(withAdj.enhancementsApplied).toContain("rolling-volatility-adjustment");
  });

  it("earnings revision adjusts drift", () => {
    const result = computeExitBoundaries({
      ...baseline(),
      options: { earningsRevisionAdjustment: { revisionDelta: 0.05 } },
    });

    // Drift should be baseline (0.20) + 0.05 = 0.25
    expect(result.expectedDrift).toBeCloseTo(0.25, 4);
    expect(result.enhancementsApplied).toContain("earnings-revision-adjustment");
  });

  it("macro regime scales drift", () => {
    const riskOff = computeExitBoundaries({
      ...baseline(),
      options: { macroRegimeAdjustment: { regimeMultiplier: 0.5 } },
    });

    // Drift should be 0.20 × 0.5 = 0.10
    expect(riskOff.expectedDrift).toBeCloseTo(0.10, 4);
    expect(riskOff.enhancementsApplied).toContain("macro-regime-adjustment");
  });

  it("time decay tightens boundaries as time passes", () => {
    const full = computeExitBoundaries(baseline());
    const halfElapsed = computeExitBoundaries({
      ...baseline(),
      options: { timeDecayStopTightening: { elapsedYears: 0.5 } },
    });

    // With 0.5 of 1.0 years elapsed, vol_term shrinks → tighter boundaries
    // The range (upper - lower) should be smaller
    const fullRange = full.upperBoundary - full.lowerBoundary;
    const halfRange = halfElapsed.upperBoundary - halfElapsed.lowerBoundary;
    expect(halfRange).toBeLessThan(fullRange);
    expect(halfElapsed.enhancementsApplied).toContain("time-decay-stop-tightening");
  });
});

// ──────────────────────────────────────────────────
// Portfolio vectorization
// ──────────────────────────────────────────────────

describe("portfolio vectorization", () => {
  it("processes multiple stocks and returns correct count", () => {
    const inputs = [
      { ...baseline(), entryPrice: 100 },
      { ...baseline(), entryPrice: 200, annualizedVolatility: 0.50 },
      { ...baseline(), entryPrice: 50, forwardEarningsGrowth: -0.05 },
    ];

    const results = computePortfolioExitBoundaries(inputs);
    expect(results).toHaveLength(3);

    // Higher vol stock should have wider boundaries
    expect(results[1].upsidePotential).toBeGreaterThan(results[0].upsidePotential);
  });
});

// ──────────────────────────────────────────────────
// Helper function tests
// ──────────────────────────────────────────────────

describe("computeAnnualizedVolatility", () => {
  it("returns 0 for insufficient data (< 3 prices)", () => {
    expect(computeAnnualizedVolatility([100, 110])).toBe(0);
  });

  it("returns 0 for constant prices", () => {
    expect(computeAnnualizedVolatility([100, 100, 100, 100, 100])).toBe(0);
  });

  it("produces reasonable annualized vol for realistic prices", () => {
    const prices = [150, 155, 148, 160, 165, 158, 170, 175, 168, 178, 190, 195, 200];
    const vol = computeAnnualizedVolatility(prices);
    // Typical equity vol is 0.15-0.50
    expect(vol).toBeGreaterThan(0.05);
    expect(vol).toBeLessThan(1.0);
  });
});

describe("estimateForwardGrowth", () => {
  it("returns 0 for empty array", () => {
    expect(estimateForwardGrowth([])).toBe(0);
  });

  it("returns the single value for one element", () => {
    expect(estimateForwardGrowth([0.15])).toBeCloseTo(0.15, 4);
  });

  it("weights recent growth more heavily", () => {
    // Recent growth much higher than early
    const growth = estimateForwardGrowth([0.05, 0.05, 0.05, 0.20, 0.20]);
    // Should be closer to 0.20 than 0.05
    expect(growth).toBeGreaterThan(0.12);
  });
});
