// ──────────────────────────────────────────────────────────
// Sell Analysis Types
// ──────────────────────────────────────────────────────────

export interface SellAnalysis {
  shouldSell: boolean;
  /** Accumulated sell pressure (0–10+ scale) */
  pressure: number;
  /** Urgency tier based on pressure */
  urgency: "none" | "monitor" | "reduce" | "exit";
  /** Which triggers fired — transparent reasoning */
  reasons: string[];
}

// ──────────────────────────────────────────────────────────
// Decision Engine Result
// ──────────────────────────────────────────────────────────

export interface DecisionEngineResult {
  growth: number;
  structural: number;
  balance: number;
  valuation: number;
  finalScore: number;
  signal: "strong_buy" | "buy" | "neutral" | "avoid";
  breakdown: {
    fundamentals: {
      score: number;
      weight: number;
      components: {
        growth: { raw: number; weight: number; contribution: number };
        structural: { raw: number; weight: number; contribution: number };
        balance: { raw: number; weight: number; contribution: number };
      };
      riskMultiplier: number;
      riskAdjustedScore: number;
    };
    valuation: { score: number; weight: number; contribution: number };
  };
  sellSignal: SellAnalysis;
}

// ──────────────────────────────────────────────────────────
// Score Normalization
// ──────────────────────────────────────────────────────────

function normalizeScores({
  growthScore,
  structuralScore,
  balanceSheetRiskScore,
  valuationLagScore
} : {
  growthScore: number;
  structuralScore: number;
  balanceSheetRiskScore: number;
  valuationLagScore: number;
}) {
  // trajectoryStrength.total is typically -2 to +6
  // structuralQuality.score is typically -2 to +8
  return {
    growthScore: Math.max(-1, Math.min(1.5, (growthScore || 0) / 4)),
    structuralScore: Math.max(-1, Math.min(1.5, (structuralScore || 0) / 5)),
    balanceSheetRiskScore: (balanceSheetRiskScore || 0) / 5, // -1 to +1 approx
    valuationLagScore: Math.max(-2, Math.min(2, valuationLagScore || 0)) // sigma bias
  };
}

// ──────────────────────────────────────────────────────────
// Sell Signal — Empirically-Grounded Multi-Factor Assessment
//
// Based on documented strategies from:
//   • AQR (Asness): Value-momentum interaction — expensive stocks
//     losing momentum occupy the worst quintile for forward returns
//   • Oaktree (Marks): Sell when the thesis is broken, not on noise
//   • Bridgewater: Risk-parity style multi-factor convergence
//   • Academic: DeBondt & Thaler mean-reversion, Altman Z-score
//     distress prediction, Lakonishok value-contrarian research
// ──────────────────────────────────────────────────────────

export function evaluateSellPressure({
  finalScore,
  normalizedGrowth,
  normalizedStructural,
  normalizedBalance,
  normalizedValuation,
  trajectoryState,
  qualityState,
  balanceSheetState,
}: {
  finalScore: number;
  normalizedGrowth: number;
  normalizedStructural: number;
  normalizedBalance: number;
  normalizedValuation: number;
  trajectoryState: string;
  qualityState: string;
  balanceSheetState: string;
}): SellAnalysis {

  const reasons: string[] = [];
  let pressure = 0;

  // ─── 1. COMPOSITE SCORE DECAY ──────────────────────────
  // When the overall decision engine score drops into negative
  // territory, the alpha thesis has broken down.
  // Threshold: -0.1 (well below neutral, not just "not a buy").
  // Weight: +2 pressure — this is the broadest signal.
  if (finalScore < -0.1) {
    pressure += 2;
    reasons.push("composite-score-decay");
  }

  // ─── 2. VALUATION EXHAUSTION ───────────────────────────
  // Mean-reversion is the strongest empirical force in equity
  // markets (Fama-French HML). When the valuation residual
  // Z-score exceeds +1.5σ, the stock trades well above what
  // its fundamentals predict — historically the top decile of
  // overvaluation underperforms by 5-8% annually.
  // Weight: +2 pressure — high statistical confidence.
  if (normalizedValuation > 1.5) {
    pressure += 2;
    reasons.push("valuation-exhaustion");
  }

  // ─── 3. FUNDAMENTAL DETERIORATION ──────────────────────
  // Howard Marks / Oaktree framework: a single factor going
  // negative is noise. When BOTH trajectory (growth direction)
  // AND structural quality (business quality level) are negative,
  // the investment thesis is broken. This is the strongest
  // fundamental sell signal.
  // Weight: +3 pressure — thesis break is high conviction.
  const trajectoryNegative =
    trajectoryState === "structural-deterioration" ||
    trajectoryState === "negative-trajectory";

  const qualityWeak = qualityState === "weak";

  if (trajectoryNegative && qualityWeak) {
    pressure += 3;
    reasons.push("fundamental-deterioration");
  }

  // ─── 4. EXPENSIVE + MOMENTUM REVERSAL (AQR) ───────────
  // Cliff Asness's research at AQR shows the value-momentum
  // interaction is the most dangerous regime for long positions:
  // stocks that are overvalued (Z > 0.5) AND have decelerating
  // growth (normalized < 0) sit in the worst-performing quintile.
  // Weight: +3 pressure — empirically the worst risk/reward.
  if (normalizedValuation > 0.5 && normalizedGrowth < 0) {
    pressure += 3;
    reasons.push("expensive-momentum-reversal");
  }

  // ─── 5. LEVERAGE RISK ESCALATION ───────────────────────
  // Altman Z-score research: high leverage combined with
  // declining growth is a reliable predictor of drawdowns and
  // distress. Only fires when balance sheet is genuinely stressed
  // (negative score) AND business direction is negative.
  // Weight: +1 pressure — confirming signal, not primary.
  const balanceSheetStressed =
    balanceSheetState === "high-risk" || normalizedBalance < -0.3;

  if (balanceSheetStressed && normalizedGrowth < 0) {
    pressure += 1;
    reasons.push("leverage-risk-escalation");
  }

  // ─── 6. MULTI-FACTOR CONVERGENCE ──────────────────────
  // The core of systematic risk management: when 3+ independent
  // factors are simultaneously negative, the probability of
  // underperformance increases non-linearly. Each factor below
  // uses thresholds that indicate "below average" rather than
  // "catastrophically bad" — convergence is what matters.
  // Weight: +2 pressure.
  const negativeFactors = [
    normalizedGrowth < 0,
    normalizedStructural < 0.2,
    normalizedBalance < 0,
    normalizedValuation > 0.5,
  ].filter(Boolean).length;

  if (negativeFactors >= 3) {
    pressure += 2;
    reasons.push("multi-factor-convergence");
  }

  // ─── URGENCY CLASSIFICATION ────────────────────────────
  let urgency: SellAnalysis["urgency"];

  if (pressure >= 5) urgency = "exit";
  else if (pressure >= 3) urgency = "reduce";
  else if (pressure >= 1) urgency = "monitor";
  else urgency = "none";

  return {
    shouldSell: pressure >= 3,
    pressure,
    urgency,
    reasons,
  };
}

// ──────────────────────────────────────────────────────────
// Decision Engine — Main Entry Point
// ──────────────────────────────────────────────────────────

export function runDecisionEngine({
  trajectoryStrength,
  structuralQuality,
  balanceSheetRisk,
  valuationLag
}: {
  trajectoryStrength: { total: number; state: string };
  structuralQuality: { score: number; state: string };
  balanceSheetRisk: { totalScore: number; state: string };
  valuationLag: { score: number };
}): DecisionEngineResult {

    const normalizedScores = normalizeScores({
      growthScore: trajectoryStrength.total,
      structuralScore: structuralQuality.score,
      balanceSheetRiskScore: balanceSheetRisk.totalScore,
      valuationLagScore: valuationLag.score
    });

  const fundamentalScore =
  0.45 * normalizedScores.growthScore +
  0.35 * normalizedScores.structuralScore +
  0.20 * normalizedScores.balanceSheetRiskScore;

  const riskMultiplier = 1 + (normalizedScores.balanceSheetRiskScore * 0.25);
  const riskAdjustedFundamental = fundamentalScore * Math.max(0.6, riskMultiplier);

  // Compress extreme valuation lag
  const valuationSignal = Math.tanh(normalizedScores.valuationLagScore);

  let finalScore =
    0.5 * riskAdjustedFundamental +
    0.5 * -valuationSignal;

  finalScore = Math.max(-1, Math.min(1, finalScore));

  let signal: DecisionEngineResult["signal"] = "neutral";

  if (finalScore > 0.6) signal = "strong_buy";
  else if (finalScore > 0.2) signal = "buy";
  else if (finalScore < -0.3) signal = "avoid";

  // ── Sell pressure analysis ──
  const sellSignal = evaluateSellPressure({
    finalScore,
    normalizedGrowth: normalizedScores.growthScore,
    normalizedStructural: normalizedScores.structuralScore,
    normalizedBalance: normalizedScores.balanceSheetRiskScore,
    normalizedValuation: normalizedScores.valuationLagScore,
    trajectoryState: trajectoryStrength.state,
    qualityState: structuralQuality.state,
    balanceSheetState: balanceSheetRisk.state,
  });

  return {
    growth: normalizedScores.growthScore,
    structural: normalizedScores.structuralScore,
    balance: normalizedScores.balanceSheetRiskScore,
    valuation: normalizedScores.valuationLagScore,
    finalScore,
    signal,
    breakdown: {
      fundamentals: {
        score: fundamentalScore,
        weight: 0.5,
        components: {
          growth: { raw: normalizedScores.growthScore, weight: 0.45, contribution: 0.45 * normalizedScores.growthScore },
          structural: { raw: normalizedScores.structuralScore, weight: 0.35, contribution: 0.35 * normalizedScores.structuralScore },
          balance: { raw: normalizedScores.balanceSheetRiskScore, weight: 0.20, contribution: 0.20 * normalizedScores.balanceSheetRiskScore }
        },
        riskMultiplier: Math.max(0.6, riskMultiplier),
        riskAdjustedScore: riskAdjustedFundamental,
      },
      valuation: {
        score: valuationSignal,
        weight: 0.5,
        contribution: 0.5 * valuationSignal
      }
    },
    sellSignal
  };
}
