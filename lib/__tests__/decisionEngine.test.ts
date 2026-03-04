import { describe, it, expect } from "vitest";
import { evaluateSellPressure, runDecisionEngine } from "../decisionEngine";

// ── evaluateSellPressure (unit tests) ──────────────────

describe("evaluateSellPressure", () => {
  const base = {
    finalScore: 0.5,
    normalizedGrowth: 0.5,
    normalizedStructural: 0.8,
    normalizedBalance: 0.4,
    normalizedValuation: -0.5,
    trajectoryState: "positive-trajectory",
    qualityState: "strong",
    balanceSheetState: "low-risk",
  };

  it("returns no sell pressure for a strong compounder", () => {
    const result = evaluateSellPressure(base);
    expect(result.shouldSell).toBe(false);
    expect(result.pressure).toBe(0);
    expect(result.urgency).toBe("none");
    expect(result.reasons).toEqual([]);
  });

  it("fires composite-score-decay when finalScore < -0.1", () => {
    const result = evaluateSellPressure({ ...base, finalScore: -0.2 });
    expect(result.reasons).toContain("composite-score-decay");
    expect(result.pressure).toBeGreaterThanOrEqual(2);
  });

  it("fires valuation-exhaustion when valuation Z > 1.5", () => {
    const result = evaluateSellPressure({
      ...base,
      normalizedValuation: 1.8,
    });
    expect(result.reasons).toContain("valuation-exhaustion");
    expect(result.pressure).toBeGreaterThanOrEqual(2);
  });

  it("fires fundamental-deterioration when trajectory + quality are both bad", () => {
    const result = evaluateSellPressure({
      ...base,
      trajectoryState: "structural-deterioration",
      qualityState: "weak",
    });
    expect(result.reasons).toContain("fundamental-deterioration");
    expect(result.pressure).toBeGreaterThanOrEqual(3);
  });

  it("does NOT fire fundamental-deterioration for weak quality alone", () => {
    const result = evaluateSellPressure({
      ...base,
      qualityState: "weak",
      // trajectory is still positive
    });
    expect(result.reasons).not.toContain("fundamental-deterioration");
  });

  it("fires expensive-momentum-reversal (AQR signal) when overvalued + growth declining", () => {
    const result = evaluateSellPressure({
      ...base,
      normalizedValuation: 0.8,
      normalizedGrowth: -0.3,
    });
    expect(result.reasons).toContain("expensive-momentum-reversal");
    expect(result.pressure).toBeGreaterThanOrEqual(3);
  });

  it("does NOT fire expensive-momentum-reversal if growth is positive", () => {
    const result = evaluateSellPressure({
      ...base,
      normalizedValuation: 1.0,
      normalizedGrowth: 0.3, // growth is fine
    });
    expect(result.reasons).not.toContain("expensive-momentum-reversal");
  });

  it("fires leverage-risk-escalation when balance sheet stressed + growth negative", () => {
    const result = evaluateSellPressure({
      ...base,
      balanceSheetState: "high-risk",
      normalizedGrowth: -0.2,
    });
    expect(result.reasons).toContain("leverage-risk-escalation");
  });

  it("fires multi-factor-convergence when 3+ factors are negative", () => {
    const result = evaluateSellPressure({
      ...base,
      normalizedGrowth: -0.2,    // < 0
      normalizedStructural: 0.1, // < 0.2
      normalizedBalance: -0.1,   // < 0
      normalizedValuation: 0.8,  // > 0.5
    });
    expect(result.reasons).toContain("multi-factor-convergence");
  });

  it("does NOT fire multi-factor-convergence with only 2 negatives", () => {
    const result = evaluateSellPressure({
      ...base,
      normalizedGrowth: -0.2,    // < 0 (1)
      normalizedStructural: 0.5, // OK
      normalizedBalance: -0.1,   // < 0 (2)
      normalizedValuation: 0.2,  // < 0.5 OK
    });
    expect(result.reasons).not.toContain("multi-factor-convergence");
  });

  it("classifies urgency='exit' for severe multi-trigger scenario", () => {
    const result = evaluateSellPressure({
      finalScore: -0.4,
      normalizedGrowth: -0.5,
      normalizedStructural: -0.2,
      normalizedBalance: -0.4,
      normalizedValuation: 1.8,
      trajectoryState: "structural-deterioration",
      qualityState: "weak",
      balanceSheetState: "high-risk",
    });
    expect(result.urgency).toBe("exit");
    expect(result.shouldSell).toBe(true);
    expect(result.pressure).toBeGreaterThanOrEqual(5);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("classifies urgency='reduce' for moderate sell pressure", () => {
    // Only expensive-momentum-reversal fires (3 pressure)
    const result = evaluateSellPressure({
      ...base,
      normalizedValuation: 0.8,
      normalizedGrowth: -0.1,
    });
    expect(result.urgency).toBe("reduce");
    expect(result.shouldSell).toBe(true);
  });

  it("single-factor weakness does NOT trigger a sell", () => {
    // Only valuation is slightly concerning (0.6), growth is fine
    const result = evaluateSellPressure({
      ...base,
      normalizedValuation: 0.6,
    });
    expect(result.shouldSell).toBe(false);
  });
});

// ── runDecisionEngine (integration with sell signal) ──

describe("runDecisionEngine", () => {
  it("produces a sellSignal object with the expected shape", () => {
    const result = runDecisionEngine({
      trajectoryStrength: { total: 4, state: "structural-compounder" },
      structuralQuality: { score: 5, state: "strong" },
      balanceSheetRisk: { totalScore: 4, state: "low-risk" },
      valuationLag: { score: -1.0 },
    });
    expect(result.sellSignal).toBeDefined();
    expect(typeof result.sellSignal.shouldSell).toBe("boolean");
    expect(typeof result.sellSignal.pressure).toBe("number");
    expect(["none", "monitor", "reduce", "exit"]).toContain(result.sellSignal.urgency);
    expect(Array.isArray(result.sellSignal.reasons)).toBe(true);
  });

  it("does not sell a strong compounder that is undervalued", () => {
    const result = runDecisionEngine({
      trajectoryStrength: { total: 5, state: "structural-compounder" },
      structuralQuality: { score: 6, state: "elite" },
      balanceSheetRisk: { totalScore: 5, state: "low-risk" },
      valuationLag: { score: -1.5 },
    });
    expect(result.sellSignal.shouldSell).toBe(false);
    expect(result.sellSignal.urgency).toBe("none");
    expect(result.signal).toBe("strong_buy");
  });

  it("triggers sell for deteriorating company that is overvalued", () => {
    const result = runDecisionEngine({
      trajectoryStrength: { total: -3, state: "structural-deterioration" },
      structuralQuality: { score: -1, state: "weak" },
      balanceSheetRisk: { totalScore: -2, state: "high-risk" },
      valuationLag: { score: 1.8 },
    });
    expect(result.sellSignal.shouldSell).toBe(true);
    expect(result.sellSignal.urgency).toBe("exit");
    expect(result.sellSignal.reasons.length).toBeGreaterThanOrEqual(3);
  });
});
