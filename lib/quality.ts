// /lib/quality.ts

import { applyRollingWindow } from "@/lib/helpers/math";
import { calculateSlope } from "./helpers/slopeCalculation";

function average(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateStdDev(values: number[]) {
  if (values.length < 2) return 0;

  const avg = average(values);
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) /
    values.length;

  return Math.sqrt(variance);
}

export function calculateStructuralQuality({
  roicTTM,
  fcfMarginsTTM,
  yoyGrowthTTM,
  marginsTTM,
  windowSize,
}: {
  roicTTM: number[];
  fcfMarginsTTM: number[];
  yoyGrowthTTM: number[];
  marginsTTM: number[];
  windowSize: number;
}) {
  const roicWindow = applyRollingWindow(roicTTM, windowSize);
  const fcfMarginWindow = applyRollingWindow(fcfMarginsTTM, windowSize);
  const growthWindow = applyRollingWindow(yoyGrowthTTM, windowSize);
  const marginWindow = applyRollingWindow(marginsTTM, windowSize);

  const avgROIC = average(roicWindow);
  const avgFCFMargin = average(fcfMarginWindow);

  const growthVolatility = calculateStdDev(growthWindow);

  const marginSlope = calculateSlope(marginWindow);

  const marginDetrended = marginWindow.map((v, i) => v - marginSlope * i);

  const marginVolatility = calculateStdDev(marginDetrended);

  // ─────────────────────────────
  // NEW: TREND ANALYSIS
  // ─────────────────────────────
  // Compares the most recent value to the window average
  const isImprovingMargins = marginsTTM[marginsTTM.length - 1] > average(marginWindow);
  const isAcceleratingGrowth = yoyGrowthTTM[yoyGrowthTTM.length - 1] > average(growthWindow);

  let score = 0;

  // ROIC LEVEL (Added an "Ultra" tier for 40%+)
  if (avgROIC > 0.4) score += 3; 
  else if (avgROIC > 0.2) score += 2;
  else if (avgROIC > 0.1) score += 1;

  // FCF MARGIN LEVEL (Added "Ultra" tier for 40%+)
  if (avgFCFMargin > 0.4) score += 3;
  else if (avgFCFMargin > 0.25) score += 2;
  else if (avgFCFMargin > 0.15) score += 1;

  // REVENUE STABILITY (With Trend Offset)
  if (growthVolatility < 0.05) score += 1;
  else if (growthVolatility > 0.2 && !isAcceleratingGrowth) {
    score -= 1; // Only penalize if it's volatile AND not accelerating
  }

  // MARGIN STABILITY (With Trend Offset)
  if (marginVolatility < 0.03) score += 1;
  else if (marginVolatility > 0.1 && !isImprovingMargins) {
    score -= 1; // Only penalize if margins are swinging wildly/downward
  }

  // ─────────────────────────────
  // CLASSIFICATION
  // ─────────────────────────────
  let state: "elite" | "strong" | "average" | "weak" = "average";

  if (score >= 5) state = "elite";
  else if (score >= 3) state = "strong";
  else if (score <= 0) state = "weak";

  return {
    avgROIC,
    avgFCFMargin,
    growthVolatility,
    marginVolatility,
    score,
    state,
    isImprovingMargins,
    isAcceleratingGrowth
  };
}