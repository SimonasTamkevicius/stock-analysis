import { calculateTTM } from "@/lib/helpers/ttm";
import { safeNumber } from "@/lib/helpers/math";
import { calculateStructuralQuality } from "@/lib/quality";
import { computeBalanceSheetRisk } from "@/lib/balanceSheetRisk";
import { computeValuationLag } from "@/lib/valuationLag";
import {
  buildEVtoEBITDA,
  buildEVtoRevenue,
  buildFundamentalComposite,
  buildMonthlyEBITDA,
  buildMonthlyEV,
  buildMonthlyRevenue,
  forwardFillQuarterlyToMonthly,
} from "@/lib/helpers/valLagHelper";
import { runDecisionEngine } from "@/lib/decisionEngine";
import {
  calculateTrajectoryStrength,
  scoreCapitalEfficiency,
  scoreFCFTrajectory,
  scoreGrowthMomentum,
  scoreMarginDynamics,
  calculateYoYGrowth,
} from "@/lib/trajectory";

/**
 * Compute all company metrics.
 *
 * Pipeline:
 *   1. Compute everything on FULL data (TTM, monthly conversions, forward-fills)
 *   2. Apply time window to all monthly arrays simultaneously (guarantees alignment)
 *   3. Apply time window to quarterly arrays for scoring
 *   4. Run scoring/analysis on windowed data
 */
export function computeCompanyMetrics(
  incomeData: any,
  cashFlowData: any,
  balanceData: any,
  monthlyPrices: any,
  resolvedStart: string,
  resolvedEnd: string
) {
  const incomeReports = incomeData?.quarterlyReports || [];
  const cashFlowReports = cashFlowData?.quarterlyReports || [];
  const balanceReports = balanceData?.quarterlyReports || [];
  const allPriceEntries = monthlyPrices?.monthlyPrices || [];

  /* ═══════════════════════════════════════════════
     PHASE 1: Compute everything on FULL data
  ═══════════════════════════════════════════════ */

  // Extract quarterly arrays (chronological order)
  const revenues = [...incomeReports].reverse().map((q: any) => safeNumber(q.totalRevenue));
  const operatingIncome = [...incomeReports].reverse().map((q: any) => safeNumber(q.operatingIncome));
  const operatingCashFlow = [...cashFlowReports].reverse().map((q: any) => safeNumber(q.operatingCashflow));
  const capex = [...cashFlowReports].reverse().map((q: any) => safeNumber(q.capitalExpenditures));
  const totalAssets = [...balanceReports].reverse().map((q: any) => safeNumber(q.totalAssets));
  const totalCurrentLiabilities = [...balanceReports].reverse().map((q: any) => safeNumber(q.totalCurrentLiabilities));
  const shortTermDebt = [...balanceReports].reverse().map((q: any) => safeNumber(q.shortTermDebt) || safeNumber(q.currentDebt));

  const investedCapital = totalAssets.map((assets: number, i: number) => {
    const nibcl = Math.max(0, totalCurrentLiabilities[i] - shortTermDebt[i]);
    const capital = assets - nibcl;
    if (!Number.isFinite(capital) || capital <= 0) return NaN;
    return capital;
  });
  const freeCashFlow = operatingCashFlow.map((ocf: number, i: number) => ocf - capex[i]);

  // TTM arrays (quarterly frequency, full history)
  const allQuarterlyDates = [...incomeReports].reverse().map((q: any) => q.fiscalDateEnding).slice(3);
  const allRevenueTTM = calculateTTM(revenues);
  const allOperatingIncomeTTM = calculateTTM(operatingIncome);
  const allFcfTTM = calculateTTM(freeCashFlow);

  const allYoyGrowthTTMRaw = calculateYoYGrowth(allRevenueTTM);
  // YoY growth drops the first 4 TTM values (compares i vs i-4).
  // Pad with NaN to align with allQuarterlyDates for correct windowing.
  const allYoyGrowthTTM = [...new Array(4).fill(NaN), ...allYoyGrowthTTMRaw];
  const allMarginsTTM = allOperatingIncomeTTM.map((oi, i) => allRevenueTTM[i] ? oi / allRevenueTTM[i] : 0);
  const allFcfMarginsTTM = allFcfTTM.map((fcf, i) => allRevenueTTM[i] ? fcf / allRevenueTTM[i] : 0);

  const investedCapitalAligned = investedCapital.slice(3);
  const allRoicTTM = allOperatingIncomeTTM.map((oi, i) => {
    const capital = investedCapitalAligned[i];
    if (!Number.isFinite(capital) || capital <= 0) return NaN;
    const roic = oi / capital;
    if (Math.abs(roic) > 3) return NaN;
    return roic;
  });

  // Profitability check (from full data, latest quarter)
  const ebitdaList = incomeReports.map((q: any) => safeNumber(q.ebitda)).reverse();
  const ebitdaTTM = calculateTTM(ebitdaList);
  const latestEbitda = ebitdaTTM[ebitdaTTM.length - 1] || 0;
  const isProfitable = latestEbitda > 0;
  const multipleLabel = isProfitable ? "EV / EBITDA" : "EV / Revenue";

  // Build monthly series on FULL data (aligned to all monthly price dates)
  let allValMultipleMonthly: number[] = [];
  let fundamentalComposite: number[] = [];

  // Use the raw (unpadded) YoY growth for fundamental composite alignment
  const growthLength = allYoyGrowthTTMRaw.length;
  const alignedMargins = allMarginsTTM.slice(-growthLength);
  const alignedRoic = allRoicTTM.slice(-growthLength);
  const alignedFcfMargins = allFcfMarginsTTM.slice(-growthLength);

  if (isProfitable) {
    const evSeries = buildMonthlyEV(allPriceEntries, { quarterlyReports: balanceReports });
    const ebitdaMonthly = buildMonthlyEBITDA({ quarterlyReports: incomeReports }, allPriceEntries);
    allValMultipleMonthly = buildEVtoEBITDA(evSeries, ebitdaMonthly);

    fundamentalComposite = buildFundamentalComposite(
      allYoyGrowthTTMRaw,
      alignedMargins,
      alignedRoic,
      alignedFcfMargins
    );
  } else {
    const evSeries = buildMonthlyEV(allPriceEntries, { quarterlyReports: balanceReports });
    const revenueMonthly = buildMonthlyRevenue({ quarterlyReports: incomeReports }, allPriceEntries);
    allValMultipleMonthly = buildEVtoRevenue(evSeries, revenueMonthly);

    fundamentalComposite = allYoyGrowthTTMRaw.map((g, i) => {
      return 0.4 * g + 0.3 * (alignedMargins[i] || 0) + 0.3 * (alignedFcfMargins[i] || 0);
    });
  }

  const allFundamentalMonthly = forwardFillQuarterlyToMonthly(
    fundamentalComposite,
    incomeReports,
    allPriceEntries
  );

  const netIncomes = [...incomeReports].reverse().map((q: any) => safeNumber(q.netIncome));
  const sharesOut = [...balanceReports].reverse().map((q: any) => safeNumber(q.commonStockSharesOutstanding));
  const netIncomeTTM = calculateTTM(netIncomes);
  const alignedSharesOut = sharesOut.slice(3);

  const epsTTM = netIncomeTTM.map((ni, i) => {
    const shares = alignedSharesOut[i];
    if (!shares || shares <= 0) return 0;
    return ni / shares;
  });

  const allEpsMonthly = forwardFillQuarterlyToMonthly(
    epsTTM,
    incomeReports,
    allPriceEntries
  );

  // Full monthly arrays (all same length, aligned to allPriceEntries)
  const allDates = allPriceEntries.map((m: any) => m.date);
  const allPrices = allPriceEntries.map((m: any) => m.adjustedClose || m.close || 0);

  /* ═══════════════════════════════════════════════
     PHASE 2: Apply time window to MONTHLY arrays
     All arrays sliced with the same indices → guaranteed alignment
  ═══════════════════════════════════════════════ */

  const monthlyStartIdx = allDates.findIndex((d: string) => d >= resolvedStart);
  const monthlyEndIdx = findLastIndex(allDates, (d: string) => d <= resolvedEnd);

  const sliceStart = monthlyStartIdx === -1 ? 0 : monthlyStartIdx;
  const sliceEnd = monthlyEndIdx === -1 ? allDates.length : monthlyEndIdx + 1;

  const finalDates = allDates.slice(sliceStart, sliceEnd);
  const finalPrices = allPrices.slice(sliceStart, sliceEnd);
  const finalValMultiple = allValMultipleMonthly.slice(sliceStart, sliceEnd);
  const finalFundamental = allFundamentalMonthly.slice(sliceStart, sliceEnd);
  const finalEps = allEpsMonthly.slice(sliceStart, sliceEnd);

  /* ═══════════════════════════════════════════════
     PHASE 3: Apply time window to QUARTERLY arrays
  ═══════════════════════════════════════════════ */

  const qStartIdx = allQuarterlyDates.findIndex((d: string) => d >= resolvedStart);
  const qEndIdx = findLastIndex(allQuarterlyDates, (d: string) => d <= resolvedEnd);

  const qSliceStart = qStartIdx === -1 ? 0 : qStartIdx;
  const qSliceEnd = qEndIdx === -1 ? allQuarterlyDates.length : qEndIdx + 1;

  const quarterlyDates = allQuarterlyDates.slice(qSliceStart, qSliceEnd);
  const revenueTTM = allRevenueTTM.slice(qSliceStart, qSliceEnd);
  const operatingIncomeTTM = allOperatingIncomeTTM.slice(qSliceStart, qSliceEnd);
  const fcfTTM = allFcfTTM.slice(qSliceStart, qSliceEnd);
  const yoyGrowthTTM = allYoyGrowthTTM.slice(qSliceStart, qSliceEnd);
  const marginsTTM = allMarginsTTM.slice(qSliceStart, qSliceEnd);
  const fcfMarginsTTM = allFcfMarginsTTM.slice(qSliceStart, qSliceEnd);
  const roicTTM = allRoicTTM.slice(qSliceStart, qSliceEnd);

  /* ═══════════════════════════════════════════════
     PHASE 4: Run scoring/analysis on WINDOWED data
  ═══════════════════════════════════════════════ */

  const windowSize = Math.max(4, quarterlyDates.length);

  // Filter out NaN padding from YoY growth before scoring
  const yoyGrowthForScoring = yoyGrowthTTM.filter((v) => Number.isFinite(v));
  const growthScore = scoreGrowthMomentum(yoyGrowthForScoring, windowSize);
  const marginResult = scoreMarginDynamics(marginsTTM);
  const fcfResult = scoreFCFTrajectory(fcfMarginsTTM);
  const capitalResult = scoreCapitalEfficiency(roicTTM);

  const trajectoryStrength = calculateTrajectoryStrength(
    growthScore.score,
    marginResult.score,
    fcfResult.score,
    capitalResult.score
  );

  const valuationLag = computeValuationLag(
    finalPrices,
    finalValMultiple,
    finalFundamental,
    Math.max(12, finalPrices.length),
    multipleLabel
  );

  const structuralQuality = calculateStructuralQuality({
    roicTTM,
    fcfMarginsTTM,
    yoyGrowthTTM,
    marginsTTM,
    windowSize,
  });

  const balanceSheetRisk = computeBalanceSheetRisk(
    { quarterlyReports: balanceReports },
    { quarterlyReports: incomeReports },
    windowSize
  );

  const decisionEngineResult = runDecisionEngine({
    trajectoryStrength,
    structuralQuality,
    balanceSheetRisk,
    valuationLag,
  });

  return {
    trajectoryStrength,
    structuralQuality,
    balanceSheetRisk,
    valuationLag,
    decisionEngineResult,
    growthScore,
    marginResult,
    fcfResult,
    capitalResult,
    finalDates,
    finalPrices,
    finalValMultiple,
    finalFundamental,
    revenueTTM,
    yoyGrowthTTM,
    operatingIncomeTTM,
    marginsTTM,
    fcfTTM,
    fcfMarginsTTM,
    roicTTM,
    isProfitable,
    multipleLabel,
    quarterlyDates,
    finalEps,
  };
}

/** findLastIndex polyfill (for environments without Array.prototype.findLastIndex) */
function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}
