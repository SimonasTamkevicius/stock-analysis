import { ValuationLagDiagnostics } from "@/types/financials";
import { applyRollingWindow, calculateZScores } from "./helpers/math";
import { calculateSlope } from "./helpers/slopeCalculation";

export function computeValuationLag(
  multipleSeries: number[], // either EV/EBITDA or EV/Revenue
  fundamentalCompositeSeries: number[],
  windowSize: number,
  multipleLabel: string = "EV / EBITDA"
): ValuationLagDiagnostics & { multipleLabel: string } {

  const multipleWindow = applyRollingWindow(
    multipleSeries,
    windowSize * 3
  );

  const fundamentalWindow = applyRollingWindow(
    fundamentalCompositeSeries,
    windowSize * 3
  );

  // Decoupling Bias (Fundamentals - Price)
  // Positive = Fundamentals lead price (Undervalued)
  // Negative = Price leads fundamentals (Overvalued)
  const spreadSeries = fundamentalWindow.map(
    (f, i) => f - multipleWindow[i]
  );

  const zSpread = calculateZScores(spreadSeries);

  const bias = zSpread[zSpread.length - 1];

  const multipleSlope = calculateSlope(multipleWindow);
  const fundamentalSlope = calculateSlope(fundamentalWindow);

  let state:
    | "significant-undervaluation"
    | "undervalued"
    | "fair-value"
    | "overvalued"
    | "significant-overvaluation";

  if (bias > 1.5) state = "significant-undervaluation";
  else if (bias > 0.5) state = "undervalued";
  else if (bias < -1.5) state = "significant-overvaluation";
  else if (bias < -0.5) state = "overvalued";
  else state = "fair-value";

  return {
    multipleSlope,
    fundamentalSlope,
    score: bias, // Score is now the actual sigma decoupling
    state,
    multipleLabel
  };
}
