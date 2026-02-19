import { BalanceSheetDiagnostics } from "@/types/financials";
import { applyRollingWindow, safeNumber } from "./helpers/math";
import { calculateSlope } from "./helpers/slopeCalculation";
import { calculateTTM } from "./helpers/ttm";

export function computeBalanceSheetRisk(
  balanceData: any,
  incomeData: any,
  windowSize: number
): BalanceSheetDiagnostics {

  const bs = balanceData.quarterlyReports;
  const inc = incomeData.quarterlyReports;

  // ─────────────────────────────────────
  // Net Debt Series
  // ─────────────────────────────────────
  const netDebtSeries = bs.map((q: any) => {
    const combined = safeNumber(q.shortLongTermDebtTotal);
    const totalDebt = combined !== 0
      ? combined
      : safeNumber(q.currentDebt) + safeNumber(q.longTermDebt);

    const cash =
      safeNumber(q.cashAndCashEquivalentsAtCarryingValue) +
      safeNumber(q.shortTermInvestments);

    return totalDebt - cash;
  });

  // ─────────────────────────────────────
  // EBITDA TTM (alignment anchor)
  // ─────────────────────────────────────
  const ebitdaSeries = inc.map((q: any) =>
    safeNumber(q.ebitda)
  );

  const ebitdaTTM = calculateTTM(ebitdaSeries);

  // Align net debt to TTM length
  const alignedNetDebt = netDebtSeries.slice(
    netDebtSeries.length - ebitdaTTM.length
  );

  // Apply window AFTER alignment
  const ebitdaWindow = applyRollingWindow(
    ebitdaTTM,
    windowSize
  );

  const netDebtWindow = applyRollingWindow(
    alignedNetDebt,
    windowSize
  );

  // ─────────────────────────────────────
  // Net Debt / EBITDA
  // ─────────────────────────────────────
  const netDebtToEBITDASeries = netDebtWindow.map(
    (nd, i) => {
      const ebitda = ebitdaWindow[i];

      if (!ebitda || ebitda <= 0) {
        return nd > 0 ? 10 : 0;
      }

      return nd / ebitda;
    }
  );

  const latestNetDebtToEBITDA =
    netDebtToEBITDASeries.at(-1) ?? 0;

  // ─────────────────────────────────────
  // Interest Coverage (TTM aligned)
  // ─────────────────────────────────────
  const operatingIncomeTTM = calculateTTM(
    inc.map((q: any) => safeNumber(q.operatingIncome))
  );

  const interestExpenseTTM = calculateTTM(
    inc.map((q: any) => Math.abs(safeNumber(q.interestExpense)))
  );

  const coverageSeries = operatingIncomeTTM.map((oi, i) => {
    const ie = interestExpenseTTM[i];
    if (!ie || ie === 0) return 999;
    return oi / ie;
  });

  const latestInterestCoverage =
    coverageSeries.at(-1) ?? 0;

  // ─────────────────────────────────────
  // Current Ratio (latest only)
  // ─────────────────────────────────────
  const latestBS = bs.at(-1);

  const latestCurrentRatio = latestBS
    ? (() => {
        const assets = safeNumber(latestBS.totalCurrentAssets);
        const liabilities = safeNumber(latestBS.totalCurrentLiabilities);

        if (!liabilities || liabilities === 0) {
          return assets > 0 ? 3 : 1;
        }

        return assets / liabilities;
      })()
    : 0;

  // ─────────────────────────────────────
  // Debt Trend (window only)
  // ─────────────────────────────────────
  const debtTrendSlope = calculateSlope(netDebtToEBITDASeries);

  // ─────────────────────────────────────
  // Scoring
  // ─────────────────────────────────────

  // ─────────────────────────────────────
  // Scoring
  // ─────────────────────────────────────

  let leverageScore = 0;

  // Net cash automatically safest
  if (latestNetDebtToEBITDA <= 0) {
    leverageScore = 2;
  } else if (latestNetDebtToEBITDA < 1) {
    leverageScore = 2;
  } else if (latestNetDebtToEBITDA < 2) {
    leverageScore = 1;
  } else if (latestNetDebtToEBITDA < 3) {
    leverageScore = 0;
  } else if (latestNetDebtToEBITDA < 4) {
    leverageScore = -1;
  } else {
    leverageScore = -2;
  }

  let coverageScore = 0;
  if (latestInterestCoverage > 10) coverageScore = 2;
  else if (latestInterestCoverage > 5) coverageScore = 1;
  else if (latestInterestCoverage > 2) coverageScore = 0;
  else if (latestInterestCoverage > 1) coverageScore = -1;
  else coverageScore = -2;

  let liquidityScore = 0;
  if (latestCurrentRatio > 1.5) liquidityScore = 2;
  else if (latestCurrentRatio > 1.1) liquidityScore = 1;
  else if (latestCurrentRatio > 0.8) liquidityScore = 0;
  else liquidityScore = -1;

  let debtTrendScore = 0;
  // IMMUNITY: If you are in a net cash position (or very low leverage), 
  // we don't penalize your "trend" because it's usually just cash management noise.
  if (latestNetDebtToEBITDA <= 0.2) {
    debtTrendScore = (debtTrendSlope < -0.05) ? 1 : 0; 
  } else {
    if (debtTrendSlope < -0.02) debtTrendScore = 1;
    else if (debtTrendSlope > 0.02) debtTrendScore = -1;
  }

  const totalScore =
    leverageScore +
    coverageScore +
    liquidityScore +
    debtTrendScore;

  let state: "low-risk" | "moderate" | "high-risk";

  // Relaxed thresholds: moderate risk starts at 0, low risk at 3
  if (totalScore >= 3) state = "low-risk";
  else if (totalScore >= 0) state = "moderate";
  else state = "high-risk";

  return {
    leverageScore,
    coverageScore,
    liquidityScore,
    debtTrendScore,
    totalScore,
    state,
  };
}
