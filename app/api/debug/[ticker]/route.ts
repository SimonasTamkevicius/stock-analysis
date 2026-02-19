import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/data/mongodb";
import CompanyFinancials from "@/lib/models/CompanyFinancials";
import { safeNumber, applyRollingWindow } from "@/lib/helpers/math";
import { calculateTTM } from "@/lib/helpers/ttm";
import { calculateSlope } from "@/lib/helpers/slopeCalculation";
import {
  calculateYoYGrowth,
  scoreGrowthMomentum,
  scoreMarginDynamics,
  scoreFCFTrajectory,
  scoreCapitalEfficiency,
  calculateTrajectoryStrength,
} from "@/lib/trajectory";
import { calculateStructuralQuality } from "@/lib/quality";
import { computeBalanceSheetRisk } from "@/lib/balanceSheetRisk";

const WINDOW_SIZE = 12;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const upperTicker = ticker.toUpperCase();

    await connectToDatabase();
    const cached = await CompanyFinancials.findOne({ ticker: upperTicker });

    if (!cached) {
      return NextResponse.json(
        { error: `No cached data for ${upperTicker}. Load /company/${upperTicker} first.` },
        { status: 404 }
      );
    }

    const incomeData = { quarterlyReports: cached.incomeStatements };
    const cashFlowData = { quarterlyReports: cached.cashFlowStatements };
    const balanceData = { quarterlyReports: cached.balanceSheets };

    // ─────────────────────────────
    // RAW QUARTERLY SERIES
    // ─────────────────────────────

    const revenues = incomeData.quarterlyReports
      .map((q: any) => safeNumber(q.totalRevenue))
      .reverse();

    const operatingIncome = incomeData.quarterlyReports
      .map((q: any) => safeNumber(q.operatingIncome))
      .reverse();

    const operatingCashFlow = cashFlowData.quarterlyReports
      .map((q: any) => safeNumber(q.operatingCashflow))
      .reverse();

    const capex = cashFlowData.quarterlyReports
      .map((q: any) => safeNumber(q.capitalExpenditures))
      .reverse();

    const totalAssets = balanceData.quarterlyReports
      .map((q: any) => safeNumber(q.totalAssets))
      .reverse();

    const totalCurrentLiabilities = balanceData.quarterlyReports
      .map((q: any) => safeNumber(q.totalCurrentLiabilities))
      .reverse();

    const investedCapital = totalAssets.map(
      (assets: number, i: number) => assets - totalCurrentLiabilities[i]
    );

    const freeCashFlow = operatingCashFlow.map(
      (ocf: number, i: number) => ocf - capex[i]
    );

    // ─────────────────────────────
    // TTM SERIES
    // ─────────────────────────────

    const revenueTTM = cached.ttm?.revenue ?? calculateTTM(revenues);
    const operatingIncomeTTM = cached.ttm?.operatingIncome ?? calculateTTM(operatingIncome);
    const fcfTTM = cached.ttm?.fcf ?? calculateTTM(freeCashFlow);

    // ─────────────────────────────
    // DERIVED SERIES
    // ─────────────────────────────

    const yoyGrowthTTM = calculateYoYGrowth(revenueTTM);
    const marginsTTM = operatingIncomeTTM.map(
      (oi: number, i: number) => oi / revenueTTM[i]
    );
    const fcfMarginsTTM = fcfTTM.map(
      (fcf: number, i: number) => fcf / revenueTTM[i]
    );
    const investedCapitalAligned = investedCapital.slice(3);
    const roicTTM = operatingIncomeTTM.map(
      (oi: number, i: number) => oi / investedCapitalAligned[i]
    );

    // ─────────────────────────────
    // WINDOWED ARRAYS
    // ─────────────────────────────

    const yoyGrowthWindow = applyRollingWindow(yoyGrowthTTM, WINDOW_SIZE);
    const marginsWindow = applyRollingWindow(marginsTTM, WINDOW_SIZE);
    const fcfMarginsWindow = applyRollingWindow(fcfMarginsTTM, WINDOW_SIZE);
    const roicWindow = applyRollingWindow(roicTTM, WINDOW_SIZE);

    // ─────────────────────────────
    // INTERMEDIATE CALCULATIONS
    // ─────────────────────────────

    const growthSlope = calculateSlope(yoyGrowthWindow);
    const marginSlope = calculateSlope(marginsWindow);
    const fcfSlope = calculateSlope(fcfMarginsWindow);
    const capitalSlope = calculateSlope(roicWindow);

    // ─────────────────────────────
    // FINAL SCORES
    // ─────────────────────────────

    const growthScore = scoreGrowthMomentum(yoyGrowthWindow, WINDOW_SIZE);
    const marginResult = scoreMarginDynamics(marginsWindow);
    const fcfResult = scoreFCFTrajectory(fcfMarginsWindow);
    const capitalResult = scoreCapitalEfficiency(roicWindow);
    const trajectoryStrength = calculateTrajectoryStrength(
      growthScore.score,
      marginResult.score,
      fcfResult.score,
      capitalResult.score
    );

    const structuralQuality = calculateStructuralQuality({
      roicTTM,
      fcfMarginsTTM,
      yoyGrowthTTM,
      marginsTTM,
      windowSize: WINDOW_SIZE,
    });

    const balanceSheetRisk = computeBalanceSheetRisk(
      balanceData,
      incomeData,
      WINDOW_SIZE
    );

    // ─────────────────────────────
    // BALANCE SHEET RAW VALUES
    // ─────────────────────────────

    const latestBS = balanceData.quarterlyReports[0]; // most recent (pre-reverse)
    const latestInc = incomeData.quarterlyReports[0];

    const bsRawValues = {
      totalDebt: safeNumber(latestBS?.shortLongTermDebtTotal) ||
        (safeNumber(latestBS?.currentDebt) + safeNumber(latestBS?.longTermDebt)),
      cash: safeNumber(latestBS?.cashAndCashEquivalentsAtCarryingValue) +
        safeNumber(latestBS?.shortTermInvestments),
      totalCurrentAssets: safeNumber(latestBS?.totalCurrentAssets),
      totalCurrentLiabilities: safeNumber(latestBS?.totalCurrentLiabilities),
      ebitda: safeNumber(latestInc?.ebitda),
      interestExpense: safeNumber(latestInc?.interestExpense),
    };

    return NextResponse.json({
      ticker: upperTicker,
      windowSize: WINDOW_SIZE,
      counts: {
        quarterlyReports: revenues.length,
        ttmValues: revenueTTM.length,
        yoyGrowthValues: yoyGrowthTTM.length,
        windowedValues: yoyGrowthWindow.length,
      },

      // Raw quarterly (last 8 for brevity)
      rawQuarterly: {
        revenues: revenues.slice(-8),
        operatingIncome: operatingIncome.slice(-8),
        freeCashFlow: freeCashFlow.slice(-8),
        investedCapital: investedCapital.slice(-8),
      },

      // TTM (last 8)
      ttm: {
        revenue: revenueTTM.slice(-8),
        operatingIncome: operatingIncomeTTM.slice(-8),
        fcf: fcfTTM.slice(-8),
      },

      // Derived series (windowed)
      windowed: {
        yoyGrowth: yoyGrowthWindow,
        margins: marginsWindow,
        fcfMargins: fcfMarginsWindow,
        roic: roicWindow,
      },

      // Intermediate math
      intermediates: {
        growth: { slope: growthSlope },
        margins: { slope: marginSlope },
        fcf: { slope: fcfSlope },
        capital: { slope: capitalSlope },
      },

      // Final scores
      scores: {
        trajectory: {
          growth: { score: growthScore.score, state: growthScore.state },
          margins: { score: marginResult.score, state: marginResult.state },
          fcf: { score: fcfResult.score, state: fcfResult.state },
          capital: { score: capitalResult.score, state: capitalResult.state },
          total: trajectoryStrength,
        },
        quality: {
          avgROIC: structuralQuality.avgROIC,
          avgFCFMargin: structuralQuality.avgFCFMargin,
          growthVolatility: structuralQuality.growthVolatility,
          marginVolatility: structuralQuality.marginVolatility,
          isImprovingMargins: structuralQuality.isImprovingMargins,
          isAcceleratingGrowth: structuralQuality.isAcceleratingGrowth,
          score: structuralQuality.score,
          state: structuralQuality.state,
        },
        balanceSheet: balanceSheetRisk,
      },

      // Balance sheet raw
      balanceSheetRawValues: bsRawValues,
    });
  } catch (err) {
    console.error("[Debug API Error]", err);
    return NextResponse.json(
      { error: "Failed to load diagnostics" },
      { status: 500 }
    );
  }
}
