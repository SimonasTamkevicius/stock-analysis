import { describe, it, expect } from "vitest";
import {
  calculateYoYGrowth,
  scoreGrowthMomentum,
  scoreMarginDynamics,
  scoreFCFTrajectory,
  scoreCapitalEfficiency,
  calculateTrajectoryStrength,
} from "../trajectory";

// ── calculateYoYGrowth ───────────────────────────

describe("calculateYoYGrowth", () => {
  it("computes YoY growth correctly (lag-4)", () => {
    // values[4]=150, values[0]=100 → (150-100)/100 = 0.5
    const result = calculateYoYGrowth([100, 110, 120, 130, 150]);
    expect(result.length).toBe(1);
    expect(result[0]).toBeCloseTo(0.5, 4);
  });

  it("returns empty for fewer than 5 values", () => {
    expect(calculateYoYGrowth([1, 2, 3, 4])).toEqual([]);
  });

  it("handles zero previous value (division guard)", () => {
    const result = calculateYoYGrowth([0, 1, 2, 3, 4]);
    expect(result[0]).toBe(0); // guarded
  });
});

// ── scoreGrowthMomentum ──────────────────────────

describe("scoreGrowthMomentum", () => {
  it("scores +2 / explosive-acceleration for slope > 0.01", () => {
    // Linear series with slope = 0.02 per step
    const rising = Array.from({ length: 12 }, (_, i) => 0.05 + i * 0.02);
    const result = scoreGrowthMomentum(rising, 12);
    expect(result.score).toBe(2);
    expect(result.state).toBe("explosive-acceleration");
  });

  it("scores +1 / accelerating for slope between 0.005 and 0.01", () => {
    // slope ≈ 0.007
    const mild = Array.from({ length: 12 }, (_, i) => 0.05 + i * 0.007);
    const result = scoreGrowthMomentum(mild, 12);
    expect(result.score).toBe(1);
    expect(result.state).toBe("accelerating");
  });

  it("scores -2 / structural-deceleration for slope < -0.01", () => {
    const falling = Array.from({ length: 12 }, (_, i) => 0.5 - i * 0.02);
    const result = scoreGrowthMomentum(falling, 12);
    expect(result.score).toBe(-2);
    expect(result.state).toBe("structural-deceleration");
  });

  it("scores 0 / neutral for flat series", () => {
    const flat = Array.from({ length: 12 }, () => 0.1);
    const result = scoreGrowthMomentum(flat, 12);
    expect(result.score).toBe(0);
    expect(result.state).toBe("neutral");
  });

  it("returns insufficient-data for < 3 points", () => {
    const result = scoreGrowthMomentum([0.1, 0.2], 2);
    expect(result.state).toBe("insufficient-data");
  });
});

// ── scoreMarginDynamics ──────────────────────────

describe("scoreMarginDynamics", () => {
  it("scores +1 / expanding when slope > 0.5%", () => {
    // Margins going from 10% to 20% over 12 quarters
    const expanding = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.01);
    const result = scoreMarginDynamics(expanding);
    expect(result.score).toBe(1);
    expect(result.state).toBe("expanding");
  });

  it("scores -1 / compressing when slope < -0.5%", () => {
    const compressing = Array.from({ length: 12 }, (_, i) => 0.3 - i * 0.01);
    const result = scoreMarginDynamics(compressing);
    expect(result.score).toBe(-1);
    expect(result.state).toBe("compressing");
  });

  it("scores 0 / stable when slope ≈ 0", () => {
    const stable = Array.from({ length: 12 }, () => 0.25);
    const result = scoreMarginDynamics(stable);
    expect(result.score).toBe(0);
    expect(result.state).toBe("stable");
  });
});

// ── scoreFCFTrajectory ───────────────────────────

describe("scoreFCFTrajectory", () => {
  it("scores +2 / persistent-inflection for neg→pos flip", () => {
    // Negative early, then persistently positive
    const inflection = [-0.05, -0.03, -0.01, 0.02, 0.04, 0.06, 0.08, 0.1];
    const result = scoreFCFTrajectory(inflection);
    expect(result.score).toBe(2);
    expect(result.state).toBe("persistent-inflection");
  });

  it("scores +1 / improving for positive slope", () => {
    const improving = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.01);
    const result = scoreFCFTrajectory(improving);
    expect(result.score).toBe(1);
    expect(result.state).toBe("improving");
  });

  it("scores -1 / deteriorating for negative slope", () => {
    const falling = Array.from({ length: 12 }, (_, i) => 0.3 - i * 0.01);
    const result = scoreFCFTrajectory(falling);
    expect(result.score).toBe(-1);
    expect(result.state).toBe("deteriorating");
  });

  it("does NOT give inflection if there is a reversion", () => {
    // Goes positive then dips negative again
    const reversion = [-0.05, -0.02, 0.01, -0.01, 0.03, 0.05];
    const result = scoreFCFTrajectory(reversion);
    expect(result.score).not.toBe(2);
  });
});

// ── scoreCapitalEfficiency ───────────────────────

describe("scoreCapitalEfficiency", () => {
  it("scores +1 / improving for rising efficiency", () => {
    const rising = Array.from({ length: 12 }, (_, i) => 0.1 + i * 0.02);
    const result = scoreCapitalEfficiency(rising);
    expect(result.score).toBe(1);
    expect(result.state).toBe("improving");
  });

  it("scores -1 / deteriorating for falling efficiency", () => {
    const falling = Array.from({ length: 12 }, (_, i) => 0.5 - i * 0.02);
    const result = scoreCapitalEfficiency(falling);
    expect(result.score).toBe(-1);
    expect(result.state).toBe("deteriorating");
  });

  it("scores 0 / stable for flat efficiency", () => {
    const flat = Array.from({ length: 12 }, () => 0.3);
    const result = scoreCapitalEfficiency(flat);
    expect(result.score).toBe(0);
    expect(result.state).toBe("stable");
  });
});

// ── calculateTrajectoryStrength ──────────────────

describe("calculateTrajectoryStrength", () => {
  it("classifies sum ≥ 3 as structural-compounder", () => {
    const result = calculateTrajectoryStrength(2, 1, 1, 0);
    expect(result.total).toBe(4);
    expect(result.state).toBe("structural-compounder");
  });

  it("classifies sum 1-2 as positive-trajectory", () => {
    const result = calculateTrajectoryStrength(0, 1, 0, 0);
    expect(result.total).toBe(1);
    expect(result.state).toBe("positive-trajectory");
  });

  it("classifies sum 0 as neutral", () => {
    const result = calculateTrajectoryStrength(0, 0, 0, 0);
    expect(result.total).toBe(0);
    expect(result.state).toBe("neutral");
  });

  it("classifies sum ≤ -3 as structural-deterioration", () => {
    const result = calculateTrajectoryStrength(-2, -1, -1, 0);
    expect(result.total).toBe(-4);
    expect(result.state).toBe("structural-deterioration");
  });
});
