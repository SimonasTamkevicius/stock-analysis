export interface DecisionEngineResult {
  growth: number;
  structural: number;
  balance: number;
  valuation: number;
  finalScore: number;
  signal: "strong_buy" | "buy" | "neutral" | "avoid";
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
    growth: Math.max(-1, Math.min(1.5, growthScore / 4)),
    structural: Math.max(-1, Math.min(1.5, structuralScore / 5)),
    balance: balanceSheetRiskScore / 5, // -1 to +1 approx
    valuation: Math.max(-2, Math.min(2, valuationLagScore)) // sigma bias
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
    0.6 * normalizedScores.growth +
    0.4 * normalizedScores.structural;

  // Multiplier should be subtle, not explosive. 
  // A high risk (totalScore < 0) should drag fundamentals down.
  // A safe balance (totalScore > 0) should gently lift them.
  const riskMultiplier = 1 + (normalizedScores.balance * 0.3);
  const riskAdjustedFundamental = fundamentalScore * Math.max(0.5, riskMultiplier);

  // Valuation weight increased to 40% to prevent "priced-in" neglect
  // We use the new sigma-based score directly
  const valPenalty = normalizedScores.valuation;
  
  let finalScore =
    0.6 * riskAdjustedFundamental +
    0.4 * valPenalty;

  // Cap the final score for display (98% etc)
  finalScore = Math.max(-1, Math.min(1, finalScore));

  let signal: DecisionEngineResult["signal"] = "neutral";

  if (finalScore > 0.6) signal = "strong_buy";
  else if (finalScore > 0.2) signal = "buy";
  else if (finalScore < -0.3) signal = "avoid";

  return {
    growth: normalizedScores.growth,
    structural: normalizedScores.structural,
    balance: normalizedScores.balance,
    valuation: normalizedScores.valuation,
    finalScore,
    signal
  };
}
