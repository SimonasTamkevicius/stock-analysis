import CompanyFinancials from "@/lib/models/CompanyFinancials";
import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/data/mongodb";
import { computeCompanyMetrics } from "@/lib/coreAnalysis";
import { computeTimeWindow } from "@/lib/helpers/timeWindow";

// ── In-memory cache for dashboard results ──
// Prevents recomputing all company metrics on every navigation back to the home page.
// Cache lives for 5 minutes (300 000 ms). Pass ?refresh=true to force recompute.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedResults: { ticker: string; score: number; signal: string; companyName: string; currentPrice: number; trailingChange: number; historicalPrices: number[] }[] | null = null;
let cacheTimestamp = 0;

export async function GET(request: NextRequest) {
    try {
        const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true";
        const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
        const limit = parseInt(request.nextUrl.searchParams.get("limit") || "12", 10);
        const skip = (page - 1) * limit;
        const now = Date.now();

        // Check if we need to recompute the entire universe
        let globalResults = cachedResults;
        const shouldCompute = forceRefresh || !globalResults || (now - cacheTimestamp) >= CACHE_TTL_MS;

        if (shouldCompute) {
            await connectToDatabase();
            
            // Fetch ALL companies to evaluate globally
            const companies = await CompanyFinancials.find();
            
            const results = companies.map((company) => {
                try {
                    const prices = company.monthlyPrices ?? [];
                    const availableStart = prices.length > 0 ? String(prices[0].date) : undefined;
                    const availableEnd = prices.length > 0 ? String(prices[prices.length - 1].date) : undefined;

                    // Default to 3Y window for the coverage universe
                    const { startDate: resolvedStart, endDate: resolvedEnd } = computeTimeWindow(
                        { preset: "3y" },
                        availableStart,
                        availableEnd
                    );

                    const metrics = computeCompanyMetrics(
                        { quarterlyReports: company.incomeStatements },
                        { quarterlyReports: company.cashFlowStatements },
                        { quarterlyReports: company.balanceSheets },
                        { monthlyPrices: prices },
                        resolvedStart,
                        resolvedEnd
                    );

                    const trailingPrices = prices.map(p => Number(p.close));
                    const currentPrice = trailingPrices.length > 0 ? trailingPrices[trailingPrices.length - 1] : 0;
                    const oldPrice = trailingPrices.length > 12 ? trailingPrices[trailingPrices.length - 12] : (trailingPrices[0] || 0); // approx 1 yr return
                    const trailingChange = oldPrice > 0 ? ((currentPrice - oldPrice) / oldPrice) * 100 : 0;
                    
                    // Get the last 24 months of prices for the mini chart
                    const miniChartPrices = trailingPrices.slice(-24);

                    return {
                        ticker: company.ticker,
                        score: metrics.decisionEngineResult?.finalScore ?? 0,
                        signal: metrics.decisionEngineResult?.signal ?? "neutral",
                        companyName: String(company.companyOverview?.Name || company.ticker),
                        currentPrice,
                        trailingChange,
                        historicalPrices: miniChartPrices
                    };
                } catch (e) {
                    console.error(`Error computing metrics for ${company.ticker}:`, e);
                    return {
                        ticker: company.ticker,
                        score: -999,
                        signal: "neutral",
                        companyName: String(company.companyOverview?.Name || company.ticker),
                        currentPrice: 0,
                        trailingChange: 0,
                        historicalPrices: []
                    };
                }
            });

            // Filter out bad calculations and sort descending by score across the ENTIRE universe
            const validResults = results.filter(r => r.score !== -999);
            validResults.sort((a, b) => b.score - a.score);

            // Save to global memory cache
            globalResults = validResults;
            cachedResults = validResults;
            cacheTimestamp = now;
        }

        // Now that we have a fully computed and globally sorted list, slice out the requested page
        const totalCount = globalResults?.length || 0;
        const pagedData = globalResults ? globalResults.slice(skip, skip + limit) : [];
        const hasMore = skip + pagedData.length < totalCount;

        return NextResponse.json({
            data: pagedData,
            hasMore,
            page,
            total: totalCount
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}