import {
  fetchMonthlyPrices,
  fetchQuarterlyBalanceSheet,
  fetchQuarterlyCashFlow,
  fetchQuarterlyIncomeStatement,
} from "@/lib/data/alphavantage";

import { connectToDatabase } from "@/lib/data/mongodb";
import CompanyFinancials from "@/lib/models/CompanyFinancials";

import { NextResponse } from "next/server";
import { safeNumber } from "@/lib/helpers/math";
import { computeCompanyMetrics } from "@/lib/coreAnalysis";

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

    const paramStartDate = startDateParam || searchParams.get("from");
    const paramEndDate = endDateParam || searchParams.get("to");

    const metrics = computeCompanyMetrics(
      incomeData,
      cashFlowData,
      balanceData,
      monthlyPrices,
      dynamicWindow,
      paramStartDate,
      paramEndDate
    );

    const {
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
    } = metrics;

    let anchorDate = filterToAnchorDate;

    return NextResponse.json({
      raw: {
        incomeData,
        cashFlowData,
        balanceData,
        monthlyPrices,
      },
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
      dynamicWindow,
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
