import CompanyFinancials from "@/lib/models/CompanyFinancials";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/data/mongodb";
import { computeCompanyMetrics } from "@/lib/coreAnalysis";

export async function GET() {
    try {
        await connectToDatabase();
        const companies = await CompanyFinancials.find();
        
        const results = companies.map((company) => {
            try {
                const metrics = computeCompanyMetrics(
                    { quarterlyReports: company.incomeStatements },
                    { quarterlyReports: company.cashFlowStatements },
                    { quarterlyReports: company.balanceSheets },
                    { monthlyPrices: company.monthlyPrices }
                );
                return {
                    ticker: company.ticker,
                    score: metrics.decisionEngineResult?.finalScore ?? 0,
                    signal: metrics.decisionEngineResult?.signal ?? "neutral",
                };
            } catch (e) {
                console.error(`Error computing metrics for ${company.ticker}:`, e);
                return {
                    ticker: company.ticker,
                    score: -999,
                    signal: "neutral",
                };
            }
        });

        // Filter out bad calculations and sort by score descending
        const validResults = results.filter(r => r.score !== -999);
        validResults.sort((a, b) => b.score - a.score);

        return NextResponse.json(validResults);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}