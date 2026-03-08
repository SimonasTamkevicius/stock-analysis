import {
  fetchMonthlyPrices,
  fetchQuarterlyBalanceSheet,
  fetchQuarterlyCashFlow,
  fetchQuarterlyIncomeStatement,
  fetchCompanyOverview
} from "@/lib/data/alphavantage";

import { connectToDatabase } from "@/lib/data/mongodb";
import CompanyFinancials from "@/lib/models/CompanyFinancials";

import { NextResponse } from "next/server";
import { safeNumber } from "@/lib/helpers/math";
import { computeCompanyMetrics } from "@/lib/coreAnalysis";
import {
  computeTimeWindow,
  type Preset,
  type TimeWindowInput,
} from "@/lib/helpers/timeWindow";

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

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const presetParam = searchParams.get("preset") as Preset | null;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const refresh = searchParams.get("refresh");

    await connectToDatabase();

    const cached = await CompanyFinancials.findOne({
      ticker: upperTicker,
    });

    let incomeData: any;
    let cashFlowData: any;
    let balanceData: any;
    let monthlyPrices: { monthlyPrices: any[] };
    let companyOverview: any;

    /* ─────────────────────────────────────────────
       CACHE HIT OR PARTIAL REFRESH
    ───────────────────────────────────────────── */

    if (cached && refresh !== "true") {
      
      // If refresh is "prices", we keep the cached financials but fetch new prices
      if (refresh === "prices") {
        console.log(`[partial refresh: prices] ${upperTicker}`);
        incomeData = { quarterlyReports: cached.incomeStatements };
        cashFlowData = { quarterlyReports: cached.cashFlowStatements };
        balanceData = { quarterlyReports: cached.balanceSheets };
        companyOverview = {companyOverview: cached.companyOverview}

        const rawMonthly = await fetchMonthlyPrices(upperTicker);
        if (isRateLimited(rawMonthly)) throw new Error("RATE_LIMIT");
        
        const normalizedMonthly = normalizeMonthlyPrices(rawMonthly);
        monthlyPrices = { monthlyPrices: normalizedMonthly };

        await CompanyFinancials.findOneAndUpdate(
          { ticker: upperTicker },
          {
            $set: {
              monthlyPrices: normalizedMonthly,
              lastUpdated: new Date(),
            },
          }
        );
      } else {
        // Full cache hit
        console.log(`[cache hit] ${upperTicker}`);
        incomeData = { quarterlyReports: cached.incomeStatements };
        cashFlowData = { quarterlyReports: cached.cashFlowStatements };
        balanceData = { quarterlyReports: cached.balanceSheets };
        companyOverview = cached.companyOverview;
        monthlyPrices = {
          monthlyPrices: cached.monthlyPrices ?? [],
        };
      }
    }

    /* ─────────────────────────────────────────────
       FULL CACHE MISS
    ───────────────────────────────────────────── */

    else {
      console.log(`[cache miss / full refresh] ${upperTicker}`);

      incomeData = await fetchQuarterlyIncomeStatement(upperTicker);
      if (isRateLimited(incomeData)) throw new Error("RATE_LIMIT");
      await new Promise((r) => setTimeout(r, 2000));

      cashFlowData = await fetchQuarterlyCashFlow(upperTicker);
      if (isRateLimited(cashFlowData)) throw new Error("RATE_LIMIT");
      await new Promise((r) => setTimeout(r, 2000));

      balanceData = await fetchQuarterlyBalanceSheet(upperTicker);
      if (isRateLimited(balanceData)) throw new Error("RATE_LIMIT");
      await new Promise((r) => setTimeout(r, 2000));

      const rawMonthly = await fetchMonthlyPrices(upperTicker);
      if (isRateLimited(rawMonthly)) throw new Error("RATE_LIMIT");
      await new Promise((r) => setTimeout(r, 2000));

      companyOverview = await fetchCompanyOverview(upperTicker);
      if (isRateLimited(companyOverview)) throw new Error("RATE_LIMIT");

      if (
        !incomeData?.quarterlyReports ||
        !cashFlowData?.quarterlyReports ||
        !balanceData?.quarterlyReports ||
        !companyOverview ||
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
            companyOverview: companyOverview,
            lastUpdated: new Date(),
          },
        },
        { upsert: true }
      );
    }

    /* ─────────────────────────────────────────────
       RESOLVE TIME WINDOW
    ───────────────────────────────────────────── */

    const allPrices = monthlyPrices.monthlyPrices || [];
    const availableStart = allPrices.length > 0 ? allPrices[0].date : undefined;
    const availableEnd = allPrices.length > 0 ? allPrices[allPrices.length - 1].date : undefined;

    // Build the time window input from query params
    let timeWindowInput: TimeWindowInput;

    if (presetParam) {
      timeWindowInput = { preset: presetParam };
    } else if (startDateParam && endDateParam) {
      timeWindowInput = { startDate: startDateParam, endDate: endDateParam };
    } else if (startDateParam) {
      timeWindowInput = { startDate: startDateParam };
    } else if (endDateParam) {
      timeWindowInput = { endDate: endDateParam };
    } else {
      // Default: 3 year view
      timeWindowInput = { preset: "3y" };
    }

    const { startDate: resolvedStart, endDate: resolvedEnd } = computeTimeWindow(
      timeWindowInput,
      availableStart,
      availableEnd
    );

    /* ─────────────────────────────────────────────
       COMPUTE METRICS
       Full data is passed in — coreAnalysis handles
       windowing AFTER monthly conversion to ensure
       all arrays are aligned correctly.
    ───────────────────────────────────────────── */

    const metrics = computeCompanyMetrics(
      incomeData,
      cashFlowData,
      balanceData,
      monthlyPrices,
      resolvedStart,
      resolvedEnd
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
      finalEps,
      revenueTTM,
      yoyGrowthTTM,
      operatingIncomeTTM,
      marginsTTM,
      fcfTTM,
      fcfMarginsTTM,
      roicTTM,
      quarterlyDates,
    } = metrics;

    return NextResponse.json({
      companyOverview,
      raw: {
        incomeData,
        cashFlowData,
        balanceData,
        monthlyPrices,
      },
      meta: {
        ticker: upperTicker,
        lastUpdated: new Date().toISOString(),
        resolvedStartDate: resolvedStart,
        resolvedEndDate: resolvedEnd,
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
        epsMonthly: finalEps,
      },
      series: {
        quarterlyDates,
        revenueTTM,
        yoyGrowthTTM,
        operatingIncomeTTM,
        marginsTTM,
        fcfTTM,
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
