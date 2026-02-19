import { connectToDatabase } from "@/lib/data/mongodb";
import CompanyFinancials from "@/lib/models/CompanyFinancials";
import { fetchQuarterlyIncomeStatement, fetchQuarterlyCashFlow, fetchQuarterlyBalanceSheet } from "@/lib/data/fmp";

// ──────────────────────────────────────────────
// Configuration — edit these to change behaviour
// ──────────────────────────────────────────────

/** How long cached data is considered fresh (in milliseconds). */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * The list of data fetchers that run when data is stale or missing.
 * Each entry maps a MongoDB field name to an async function that
 * fetches the raw data from an external API.
 *
 * To add a new data source or swap an API:
 *   1. Add / replace the fetcher function
 *   2. Make sure the CompanyFinancials model has a matching field
 *
 * Example — swapping to a different income statement provider:
 *   { field: "incomeStatements", fetcher: myCustomFetcher }
 */
export const DATA_FETCHERS: {
  field: keyof Pick<
    typeof CompanyFinancials.prototype,
    "incomeStatements" | "cashFlowStatements" | "balanceSheets"
  >;
  fetcher: (ticker: string) => Promise<unknown[]>;
}[] = [
  { field: "incomeStatements", fetcher: fetchQuarterlyIncomeStatement },
  { field: "cashFlowStatements", fetcher: fetchQuarterlyCashFlow },
  { field: "balanceSheets", fetcher: fetchQuarterlyBalanceSheet },
];

// ──────────────────────────────────────────────
// Core service
// ──────────────────────────────────────────────

/**
 * Returns financial data for a ticker using a cache-first strategy.
 * - Checks MongoDB for an existing document
 * - If found AND within the TTL → returns cached data
 * - Otherwise → fetches from the configured APIs, upserts into MongoDB, returns fresh data
 */
export async function getCompanyFinancials(ticker: string) {
  await connectToDatabase();

  const upperTicker = ticker.toUpperCase();

  // 1. Check cache
  const cached = await CompanyFinancials.findOne({ ticker: upperTicker });

  if (cached && isFresh(cached.lastUpdated)) {
    console.log(`[cache hit] ${upperTicker} — returning MongoDB data`);
    return {
      incomeStatements: cached.incomeStatements,
      cashFlowStatements: cached.cashFlowStatements,
      balanceSheets: cached.balanceSheets,
    };
  }

  // 2. Fetch fresh data from all configured sources in parallel
  console.log(`[cache miss] ${upperTicker} — fetching from API`);

  const results = await Promise.all(
    DATA_FETCHERS.map((df) => df.fetcher(upperTicker))
  );

  // Build the update object dynamically from DATA_FETCHERS
  const update: Record<string, unknown> = { lastUpdated: new Date() };
  DATA_FETCHERS.forEach((df, i) => {
    update[df.field] = results[i];
  });

  // 3. Upsert into MongoDB
  await CompanyFinancials.findOneAndUpdate(
    { ticker: upperTicker },
    { $set: update },
    { upsert: true, new: true }
  );

  console.log(`[saved] ${upperTicker} — written to MongoDB`);

  // Return the fresh data keyed by field name
  const response: Record<string, unknown> = {};
  DATA_FETCHERS.forEach((df, i) => {
    response[df.field] = results[i];
  });
  return response as {
    incomeStatements: unknown[];
    cashFlowStatements: unknown[];
    balanceSheets: unknown[];
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function isFresh(lastUpdated: Date): boolean {
  return Date.now() - lastUpdated.getTime() < CACHE_TTL_MS;
}
