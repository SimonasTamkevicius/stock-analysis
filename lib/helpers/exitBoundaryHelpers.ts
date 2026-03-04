// ──────────────────────────────────────────────────────────
// Exit Boundary Helpers
//
// Utilities for deriving exit boundary inputs from existing
// monthly price data in the StockUniverse application.
// ──────────────────────────────────────────────────────────

/**
 * Compute annualized volatility from an array of monthly prices.
 *
 * Method: log-return standard deviation × √12
 *
 * This is the standard approach used by Bloomberg, FactSet, and
 * most institutional risk systems. Log returns are preferred over
 * simple returns because they are additive across time and
 * symmetric for gains/losses.
 *
 * @param monthlyPrices Array of monthly closing prices (chronological order)
 * @param window Optional: use only the last N months (default: all)
 * @returns Annualized volatility (σ), e.g. 0.35 = 35%
 */
export function computeAnnualizedVolatility(
  monthlyPrices: number[],
  window?: number
): number {
  let prices = monthlyPrices.filter(
    (p) => Number.isFinite(p) && p > 0
  );

  if (window && window > 0) {
    prices = prices.slice(-window);
  }

  if (prices.length < 3) return 0;

  // Compute log returns: ln(P_t / P_{t-1})
  const logReturns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    logReturns.push(Math.log(prices[i] / prices[i - 1]));
  }

  // Mean
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;

  // Variance (population)
  const variance =
    logReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    logReturns.length;

  // Monthly σ → annualized σ (× √12)
  const monthlyVol = Math.sqrt(variance);
  return monthlyVol * Math.sqrt(12);
}

/**
 * Estimate forward earnings growth from the YoY growth TTM series.
 *
 * Uses a simple exponential weighting of recent growth rates,
 * giving more weight to the most recent quarters. This is more
 * responsive to inflection points than a simple average.
 *
 * @param yoyGrowthTTM Array of year-over-year TTM growth rates
 * @param recentQuarters How many recent quarters to weight (default 4)
 * @returns Estimated forward growth rate
 */
export function estimateForwardGrowth(
  yoyGrowthTTM: number[],
  recentQuarters: number = 4
): number {
  const clean = yoyGrowthTTM.filter(Number.isFinite);
  if (clean.length === 0) return 0;

  const slice = clean.slice(-recentQuarters);

  // Exponential weights: most recent gets highest weight
  let weightSum = 0;
  let weightedSum = 0;

  for (let i = 0; i < slice.length; i++) {
    const weight = Math.pow(2, i); // 1, 2, 4, 8...
    weightedSum += slice[i] * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedSum / weightSum : 0;
}
