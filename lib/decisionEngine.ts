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
}

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


export function runDecisionEngine({
  trajectoryStrength,
  structuralQuality,
  balanceSheetRisk,
  valuationLag
}: {
  trajectoryStrength: { total: number };
  structuralQuality: { score: number };
  balanceSheetRisk: { totalScore: number };
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
    }
  };
}
