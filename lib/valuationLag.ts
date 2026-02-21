import { ValuationLagDiagnostics } from "@/types/financials";
import { applyRollingWindow, calculateZScores, rollingZScore } from "./helpers/math";
import { calculateSlope } from "./helpers/slopeCalculation";
import { detectResidualBottoms, rollingRegressionResiduals } from "./helpers/valLagHelper";

export function computeValuationLag(
  monthlyPrices: number[],
  multipleSeries: number[],
  fundamentalCompositeSeries: number[],
  windowSize: number,
  multipleLabel: string = "EV / EBITDA"
): ValuationLagDiagnostics & { multipleLabel: string } {

  // Log-transform multiple (critical for stability)
  const logMultiple = multipleSeries.map(m =>
    m > 0 && Number.isFinite(m) ? Math.log(m) : NaN
  );

  // Rolling regression residuals
  const residuals = rollingRegressionResiduals(
    fundamentalCompositeSeries,
    logMultiple,
    windowSize
  );

  // Rolling z-score of residuals (true decoupling signal)
  const zResidual = rollingZScore(residuals, windowSize);
  const bottomSignal = detectResidualBottoms(zResidual);
  const rawBias = zResidual[zResidual.length - 1];

  // Trend confirmation (light weighting)
  const multipleSlope = calculateSlope(logMultiple);
  const fundamentalSlope = calculateSlope(fundamentalCompositeSeries);

  const slopeDivergence = fundamentalSlope - multipleSlope;

  // Keep weight small so it enhances but doesn't dominate
  const adjustedBias = rawBias * (1 + 0.15 * slopeDivergence);

  let state:
    | "significant-undervaluation"
    | "undervalued"
    | "fair-value"
    | "overvalued"
    | "significant-overvaluation";

  if (adjustedBias < -1.5) state = "significant-undervaluation";
  else if (adjustedBias < -0.5) state = "undervalued";
  else if (adjustedBias > 1.5) state = "significant-overvaluation";
  else if (adjustedBias > 0.5) state = "overvalued";
  else state = "fair-value";

  return {
    multipleSlope,
    fundamentalSlope,
    score: adjustedBias,
    state,
    multipleLabel,
    bottomSignal
  };
}