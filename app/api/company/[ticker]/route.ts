import {
  fetchMonthlyPrices,
  fetchQuarterlyBalanceSheet,
  fetchQuarterlyCashFlow,
  fetchQuarterlyIncomeStatement,
} from "@/lib/data/alphavantage";

import { connectToDatabase } from "@/lib/data/mongodb";
import CompanyFinancials from "@/lib/models/CompanyFinancials";

import {
  calculateTrajectoryStrength,
  scoreCapitalEfficiency,
  scoreFCFTrajectory,
  scoreGrowthMomentum,
  scoreMarginDynamics,
  calculateYoYGrowth,
} from "@/lib/trajectory";

import { NextResponse } from "next/server";
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

const WINDOW_SIZE = 12;

/* ─────────────────────────────────────────────
   Normalize Alpha Vantage Monthly Response
───────────────────────────────────────────── */

function normalizeMonthlyPrices(raw: any) {
  const series = raw["Monthly Adjusted Time Series"] || raw["Monthly Time Series"] || raw["Time Series (Monthly)"];
  if (!series) return [];

  return Object.entries(series)
    .map(([date, values]: any) => {
      // Super-robust key lookup: AV keys often change between function variations
      const getVal = (field: string) => {
        const key = Object.keys(values).find(k => k.toLowerCase().includes(field.toLowerCase()));
        return key ? safeNumber(values[key]) : 0;
      };

      // Adjusted Close is the holy grail for split-neutral charts
      // Seek any key that contains both "adjusted" and "close"
      const adjKey = Object.keys(values).find(
        k => k.toLowerCase().includes("adjusted") && k.toLowerCase().includes("close")
      );
      
      const adjustedClose = adjKey ? safeNumber(values[adjKey]) : getVal("close") || safeNumber(values["4. close"]);
      const close = getVal("close") || safeNumber(values["4. close"]) || adjustedClose;

      return {
        date,
        open: getVal("open"),
        high: getVal("high"),
        low: getVal("low"),
        close,
        adjustedClose: adjustedClose || close,
        volume: getVal("volume"),
        dividend: getVal("dividend") || getVal("amount"),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function isRateLimited(response: any) {
  return (
    response?.Note ||
    response?.Information ||
    response?.["Error Message"]
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const upperTicker = ticker.toUpperCase();

    // Parse dynamic parameters
    const { searchParams } = new URL(req.url);
    const windowParam = searchParams.get("window");
    const startDateParam = searchParams.get("startDate"); // YYYY-MM
    const endDateParam = searchParams.get("endDate");     // YYYY-MM
    const refresh = searchParams.get("refresh") === "true";

    const dynamicWindow = windowParam ? parseInt(windowParam, 10) : WINDOW_SIZE;

    await connectToDatabase();

    const cached = await CompanyFinancials.findOne({
      ticker: upperTicker,
    });

    let incomeData: any;
    let cashFlowData: any;
    let balanceData: any;
    let monthlyPrices: { monthlyPrices: any[] };

    let revenueTTM: number[] = [];
    let operatingIncomeTTM: number[] = [];
    let fcfTTM: number[] = [];

    /* ─────────────────────────────────────────────
       CACHE HIT
    ───────────────────────────────────────────── */

    if (cached && !refresh) {
      console.log(`[cache hit] ${upperTicker}`);

      incomeData = { quarterlyReports: cached.incomeStatements };
      cashFlowData = { quarterlyReports: cached.cashFlowStatements };
      balanceData = { quarterlyReports: cached.balanceSheets };
      monthlyPrices = {
        monthlyPrices: cached.monthlyPrices ?? [],
      };

      if (cached.ttm) {
        revenueTTM = cached.ttm.revenue ?? [];
        operatingIncomeTTM = cached.ttm.operatingIncome ?? [];
        fcfTTM = cached.ttm.fcf ?? [];
      }
    }

    /* ─────────────────────────────────────────────
       CACHE MISS
    ───────────────────────────────────────────── */

    else {
      console.log(`[cache miss] ${upperTicker}`);

      incomeData = await fetchQuarterlyIncomeStatement(upperTicker);
      if (isRateLimited(incomeData)) throw new Error("RATE_LIMIT");
      await new Promise((r) => setTimeout(r, 12000));

      cashFlowData = await fetchQuarterlyCashFlow(upperTicker);
      if (isRateLimited(cashFlowData)) throw new Error("RATE_LIMIT");
      await new Promise((r) => setTimeout(r, 12000));

      balanceData = await fetchQuarterlyBalanceSheet(upperTicker);
      if (isRateLimited(balanceData)) throw new Error("RATE_LIMIT");
      await new Promise((r) => setTimeout(r, 12000));

      const rawMonthly = await fetchMonthlyPrices(upperTicker);
      if (isRateLimited(rawMonthly)) throw new Error("RATE_LIMIT");

      if (
        !incomeData?.quarterlyReports ||
        !cashFlowData?.quarterlyReports ||
        !balanceData?.quarterlyReports ||
        !(rawMonthly?.["Monthly Adjusted Time Series"] || rawMonthly?.["Monthly Time Series"])
      ) {
        return NextResponse.json(
          {
            error:
              "Alpha Vantage rate limit hit — try again in a minute",
          },
          { status: 429 }
        );
      }

      const normalizedMonthly =
        normalizeMonthlyPrices(rawMonthly);

      monthlyPrices = {
        monthlyPrices: normalizedMonthly,
      };

      await CompanyFinancials.findOneAndUpdate(
        { ticker: upperTicker },
        {
          $set: {
            incomeStatements:
              incomeData.quarterlyReports,
            cashFlowStatements:
              cashFlowData.quarterlyReports,
            balanceSheets:
              balanceData.quarterlyReports,
            monthlyPrices: normalizedMonthly,
            lastUpdated: new Date(),
          },
        },
        { upsert: true }
      );
    }

    /* ─────────────────────────────────────────────
       BUILD QUARTERLY SERIES
    ───────────────────────────────────────────── */

    /* ─────────────────────────────────────────────
       PRE-CALCULATION FILTERING (ANCHORING)
       We anchor all calculations (scores, TTM, slopes) 
       to the selected endDate. If no endDate, we use 
       the most recent data.
    ───────────────────────────────────────────── */

    const paramStartDate = startDateParam || searchParams.get("from");
    const paramEndDate = endDateParam || searchParams.get("to");

    let anchorDate = paramEndDate || new Date().toISOString().split('T')[0];
    if (anchorDate.length === 7) {
      anchorDate = `${anchorDate}-31`; // Safe upper bound
    }

    const filterToAnchor = (reports: any[]) => {
      return reports.filter((r: any) => r.fiscalDateEnding <= anchorDate);
    };

    const anchoredIncome = filterToAnchor(incomeData.quarterlyReports);
    const anchoredCashFlow = filterToAnchor(cashFlowData.quarterlyReports);
    const anchoredBalance = filterToAnchor(balanceData.quarterlyReports);
    
    // Monthly prices also anchored
    const anchoredMonthlyPrices = monthlyPrices.monthlyPrices.filter((m: any) => m.date <= anchorDate);

    /* ─────────────────────────────────────────────
       BUILD QUARTERLY SERIES (ANCHORED CONTEXT)
    ───────────────────────────────────────────── */

    const revenues = [...anchoredIncome]
      .reverse()
      .map((q: any) => safeNumber(q.totalRevenue));

    const operatingIncome = [...anchoredIncome]
      .reverse()
      .map((q: any) => safeNumber(q.operatingIncome));

    const operatingCashFlow = [...anchoredCashFlow]
      .reverse()
      .map((q: any) => safeNumber(q.operatingCashflow));

    const capex = [...anchoredCashFlow]
      .reverse()
      .map((q: any) => safeNumber(q.capitalExpenditures));

    const totalAssets = [...anchoredBalance]
      .reverse()
      .map((q: any) => safeNumber(q.totalAssets));

    const totalCurrentLiabilities = [...anchoredBalance]
      .reverse()
      .map((q: any) => safeNumber(q.totalCurrentLiabilities));

    const shortTermDebt = [...anchoredBalance]
      .reverse()
      .map((q: any) => safeNumber(q.shortTermDebt) || safeNumber(q.currentDebt));

    const longTermDebt = [...anchoredBalance]
      .reverse()
      .map((q: any) => safeNumber(q.longTermDebt));

    const totalDebt = shortTermDebt.map((std, i) => std + longTermDebt[i]);

    const investedCapital = totalAssets.map(
      (assets: number, i: number) => {
        // Invested Capital = Total Assets - Non-interest-bearing current liabilities
        // NIBCL = Total Current Liabilities - Short Term Debt
        const nibcl = Math.max(0, totalCurrentLiabilities[i] - shortTermDebt[i]);
        return Math.max(1, assets - nibcl);
      }
    );

    const freeCashFlow = operatingCashFlow.map(
      (ocf: number, i: number) => ocf - capex[i]
    );

    /* ─────────────────────────────────────────────
       BUILD TTM
    ───────────────────────────────────────────── */

    revenueTTM = calculateTTM(revenues);
    operatingIncomeTTM = calculateTTM(operatingIncome);
    fcfTTM = calculateTTM(freeCashFlow);

    /* ─────────────────────────────────────────────
       GROWTH / MARGINS / FCF / ROIC
    ───────────────────────────────────────────── */

    const yoyGrowthTTM = calculateYoYGrowth(revenueTTM);
    const marginsTTM = operatingIncomeTTM.map((oi, i) => oi / (revenueTTM[i] || 1));
    const fcfMarginsTTM = fcfTTM.map((fcf, i) => fcf / (revenueTTM[i] || 1));
    
    const investedCapitalAligned = investedCapital.slice(3);
    const roicTTM = operatingIncomeTTM.map((oi, i) => oi / (investedCapitalAligned[i] || 1));

    const growthScore = scoreGrowthMomentum(
      applyRollingWindow(yoyGrowthTTM, dynamicWindow),
      dynamicWindow
    );

    const marginResult = scoreMarginDynamics(
      applyRollingWindow(marginsTTM, dynamicWindow)
    );

    const fcfResult = scoreFCFTrajectory(
      applyRollingWindow(fcfMarginsTTM, dynamicWindow)
    );

    const capitalResult = scoreCapitalEfficiency(
      applyRollingWindow(roicTTM, dynamicWindow)
    );

    const trajectoryStrength = calculateTrajectoryStrength(
      growthScore.score,
      marginResult.score,
      fcfResult.score,
      capitalResult.score
    );

    /* ─────────────────────────────────────────────
       VALUATION LAG (ANCHORED MONTHLY)
    ───────────────────────────────────────────── */

    const ebitdaList = anchoredIncome.map((q: any) => safeNumber(q.ebitda)).reverse();
    const ebitdaTTM = calculateTTM(ebitdaList);
    const latestEbitda = (ebitdaTTM[ebitdaTTM.length - 1] || 0);
    const isProfitable = latestEbitda > 0;
    const phaseLabel = isProfitable ? "Phase 2 — Profitable" : "Phase 1 — Unprofitable";
    const multipleLabel = isProfitable ? "EV / EBITDA" : "EV / Revenue";

    console.log(`[regime] ${upperTicker} is in ${phaseLabel}`);

    let valMultipleMonthly: number[] = [];
    let fundamentalComposite: number[] = [];

    const alignedLength = yoyGrowthTTM.length;
    const alignedMargins = marginsTTM.slice(-alignedLength);
    const alignedRoic = roicTTM.slice(-alignedLength);
    const alignedFcfMargins = fcfMarginsTTM.slice(-alignedLength);

    if (isProfitable) {
      // Phase 2: EV / EBITDA, ROIC, FCF Yield, Growth
      const evSeries = buildMonthlyEV(anchoredMonthlyPrices, { quarterlyReports: anchoredBalance });
      const ebitdaMonthly = buildMonthlyEBITDA({ quarterlyReports: anchoredIncome }, anchoredMonthlyPrices);
      valMultipleMonthly = buildEVtoEBITDA(evSeries, ebitdaMonthly);

      fundamentalComposite = buildFundamentalComposite(
        yoyGrowthTTM,
        alignedMargins, // Keep margins for stability
        alignedRoic,
        alignedFcfMargins
      );
    } else {
      // Phase 1: EV / Revenue, Revenue Growth, Margin Trajectory, Cash Burn
      const evSeries = buildMonthlyEV(anchoredMonthlyPrices, { quarterlyReports: anchoredBalance });
      const revenueMonthly = buildMonthlyRevenue({ quarterlyReports: anchoredIncome }, anchoredMonthlyPrices);
      valMultipleMonthly = buildEVtoRevenue(evSeries, revenueMonthly);

      // Phase 1 Weights: Growth (40%), Margins (30%), FCF Burn (30%)
      fundamentalComposite = yoyGrowthTTM.map((g, i) => {
        return (
          0.4 * g +
          0.3 * (alignedMargins[i] || 0) +
          0.3 * (alignedFcfMargins[i] || 0)
        );
      });
    }

    const fundamentalCompositeMonthly = forwardFillQuarterlyToMonthly(
      fundamentalComposite,
      anchoredIncome,
      anchoredMonthlyPrices
    );

    /* ─────────────────────────────────────────────
       FINAL SLICING (FOR UI DISPLAY)
    ───────────────────────────────────────────── */

    let finalDates = anchoredMonthlyPrices.map((m: any) => m.date);
    let finalPrices = anchoredMonthlyPrices.map((m: any) => m.adjustedClose || m.close || 0);
    let finalValMultiple = valMultipleMonthly;
    let finalFundamental = fundamentalCompositeMonthly;

    // If startDate is picked, slice the front. 
    // Otherwise, we default to showing dynamicWindow * 3 months leading to anchor
    if (paramStartDate) {
      const startIdx = finalDates.findIndex(d => d >= paramStartDate);
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

    return NextResponse.json({
      meta: {
        ticker: upperTicker,
        lastUpdated: new Date().toISOString(),
        isAnchored: !!paramEndDate,
        anchorDate
      },
      trajectory: {
        growth: growthScore,
        operatingMargin: marginResult,
        fcf: fcfResult,
        capitalEfficiency: capitalResult,
        total: trajectoryStrength,
      },
      quality: structuralQuality ?? null,
      valuations: {
        ...valuationLag,
        dates: finalDates,
        prices: finalPrices,
        evEBITDAMonthly: finalValMultiple,
        fundamentalCompositeMonthly: finalFundamental,
      },
      series: {
        revenueTTM,
        yoyGrowthTTM,
        marginsTTM,
        fcfMarginsTTM,
        roicTTM,
      },
      balanceSheetRisk,
      decisionEngineResult,
    });
  } catch (err: any) {
    if (err.message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Alpha Vantage rate limit hit — try again in a minute" },
        { status: 429 }
      );
    }

    console.error("[API Error]", err);
    return NextResponse.json(
      { error: "Failed to load company" },
      { status: 500 }
    );
  }
}
