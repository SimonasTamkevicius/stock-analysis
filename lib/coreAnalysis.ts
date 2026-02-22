import { calculateTTM } from "@/lib/helpers/ttm";
import { applyRollingWindow, safeNumber } from "@/lib/helpers/math";
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

export function computeCompanyMetrics(
  incomeData: any,
  cashFlowData: any,
  balanceData: any,
  monthlyPrices: any,
  dynamicWindow: number = 12,
  paramStartDate?: string | null,
  paramEndDate?: string | null
) {
  const anchorDate = paramEndDate || new Date().toISOString().split('T')[0];
  const filterToAnchorDate = anchorDate.length === 7 ? `${anchorDate}-31` : anchorDate;

  const filterToAnchor = (reports: any[]) => {
    return reports.filter((r: any) => r.fiscalDateEnding <= filterToAnchorDate);
  };

  const anchoredIncome = filterToAnchor(incomeData?.quarterlyReports || []);
  const anchoredCashFlow = filterToAnchor(cashFlowData?.quarterlyReports || []);
  const anchoredBalance = filterToAnchor(balanceData?.quarterlyReports || []);
  
  const anchoredMonthlyPrices = (monthlyPrices?.monthlyPrices || []).filter((m: any) => m.date <= filterToAnchorDate);

  const revenues = [...anchoredIncome].reverse().map((q: any) => safeNumber(q.totalRevenue));
  const operatingIncome = [...anchoredIncome].reverse().map((q: any) => safeNumber(q.operatingIncome));
  const operatingCashFlow = [...anchoredCashFlow].reverse().map((q: any) => safeNumber(q.operatingCashflow));
  const capex = [...anchoredCashFlow].reverse().map((q: any) => safeNumber(q.capitalExpenditures));
  const totalAssets = [...anchoredBalance].reverse().map((q: any) => safeNumber(q.totalAssets));
  const totalCurrentLiabilities = [...anchoredBalance].reverse().map((q: any) => safeNumber(q.totalCurrentLiabilities));
  const shortTermDebt = [...anchoredBalance].reverse().map((q: any) => safeNumber(q.shortTermDebt) || safeNumber(q.currentDebt));
  const longTermDebt = [...anchoredBalance].reverse().map((q: any) => safeNumber(q.longTermDebt));

  const investedCapital = totalAssets.map((assets: number, i: number) => {
    const nibcl = Math.max(0, totalCurrentLiabilities[i] - shortTermDebt[i]);
    const capital = assets - nibcl;

    // Reject economically invalid capital structures
    if (!Number.isFinite(capital) || capital <= 0) {
      return NaN;
    }

    return capital;
  });
  const freeCashFlow = operatingCashFlow.map((ocf: number, i: number) => ocf - capex[i]);

  const revenueTTM = calculateTTM(revenues);
  const operatingIncomeTTM = calculateTTM(operatingIncome);
  const fcfTTM = calculateTTM(freeCashFlow);

  const yoyGrowthTTM = calculateYoYGrowth(revenueTTM);
  const marginsTTM = operatingIncomeTTM.map((oi, i) => oi / (revenueTTM[i] || 1));
  const fcfMarginsTTM = fcfTTM.map((fcf, i) => fcf / (revenueTTM[i] || 1));
  
  const investedCapitalAligned = investedCapital.slice(3);
  const roicTTM = operatingIncomeTTM.map((oi, i) => {
    const capital = investedCapitalAligned[i];

    if (!Number.isFinite(capital) || capital <= 0) {
      return NaN;
    }

    const roic = oi / capital;

    // Clamp extreme distortions
    if (Math.abs(roic) > 3) {
      return NaN;
    }

    return roic;
  });

  const growthScore = scoreGrowthMomentum(applyRollingWindow(yoyGrowthTTM, dynamicWindow), dynamicWindow);
  const marginResult = scoreMarginDynamics(applyRollingWindow(marginsTTM, dynamicWindow));
  const fcfResult = scoreFCFTrajectory(applyRollingWindow(fcfMarginsTTM, dynamicWindow));
  const capitalResult = scoreCapitalEfficiency(applyRollingWindow(roicTTM, dynamicWindow));

  const trajectoryStrength = calculateTrajectoryStrength(
    growthScore.score,
    marginResult.score,
    fcfResult.score,
    capitalResult.score
  );

  const ebitdaList = anchoredIncome.map((q: any) => safeNumber(q.ebitda)).reverse();
  const ebitdaTTM = calculateTTM(ebitdaList);
  const latestEbitda = (ebitdaTTM[ebitdaTTM.length - 1] || 0);
  const isProfitable = latestEbitda > 0;
  const multipleLabel = isProfitable ? "EV / EBITDA" : "EV / Revenue";

  let valMultipleMonthly: number[] = [];
  let fundamentalComposite: number[] = [];

  const alignedLength = yoyGrowthTTM.length;
  const alignedMargins = marginsTTM.slice(-alignedLength);
  const alignedRoic = roicTTM.slice(-alignedLength);
  const alignedFcfMargins = fcfMarginsTTM.slice(-alignedLength);

  if (isProfitable) {
    const evSeries = buildMonthlyEV(anchoredMonthlyPrices, { quarterlyReports: anchoredBalance });
    const ebitdaMonthly = buildMonthlyEBITDA({ quarterlyReports: anchoredIncome }, anchoredMonthlyPrices);
    valMultipleMonthly = buildEVtoEBITDA(evSeries, ebitdaMonthly);

    fundamentalComposite = buildFundamentalComposite(
      yoyGrowthTTM,
      alignedMargins,
      alignedRoic,
      alignedFcfMargins
    );
  } else {
    const evSeries = buildMonthlyEV(anchoredMonthlyPrices, { quarterlyReports: anchoredBalance });
    const revenueMonthly = buildMonthlyRevenue({ quarterlyReports: anchoredIncome }, anchoredMonthlyPrices);
    valMultipleMonthly = buildEVtoRevenue(evSeries, revenueMonthly);

    fundamentalComposite = yoyGrowthTTM.map((g, i) => {
      return 0.4 * g + 0.3 * (alignedMargins[i] || 0) + 0.3 * (alignedFcfMargins[i] || 0);
    });
  }

  const fundamentalCompositeMonthly = forwardFillQuarterlyToMonthly(
    fundamentalComposite,
    anchoredIncome,
    anchoredMonthlyPrices
  );

  let finalDates = anchoredMonthlyPrices.map((m: any) => m.date);
  let finalPrices = anchoredMonthlyPrices.map((m: any) => m.adjustedClose || m.close || 0);
  let finalValMultiple = valMultipleMonthly;
  let finalFundamental = fundamentalCompositeMonthly;

  if (paramStartDate) {
    const startIdx = finalDates.findIndex((d: string) => d >= paramStartDate);
    if (startIdx !== -1) {
      finalDates = finalDates.slice(startIdx);
      finalPrices = finalPrices.slice(startIdx);
      finalValMultiple = finalValMultiple.slice(startIdx);
      finalFundamental = finalFundamental.slice(startIdx);
    }
  } else {
    const monthsToKeep = dynamicWindow * 3;
    finalDates = finalDates.slice(-monthsToKeep);
    finalPrices = finalPrices.slice(-monthsToKeep);
    finalValMultiple = finalValMultiple.slice(-monthsToKeep);
    finalFundamental = finalFundamental.slice(-monthsToKeep);
  }

  const valuationLag = computeValuationLag(
    finalPrices,
    finalValMultiple,
    finalFundamental,
    dynamicWindow,
    multipleLabel
  );

  const structuralQuality = calculateStructuralQuality({
    roicTTM,
    fcfMarginsTTM,
    yoyGrowthTTM,
    marginsTTM,
    windowSize: dynamicWindow,
  });

  const balanceSheetRisk = computeBalanceSheetRisk(
    { quarterlyReports: anchoredBalance },
    { quarterlyReports: anchoredIncome },
    dynamicWindow
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
    marginsTTM,
    fcfMarginsTTM,
    roicTTM,
    isProfitable,
    multipleLabel,
    filterToAnchorDate,
  };
}
