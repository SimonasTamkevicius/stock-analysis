import { safeNumber } from "./math";
import { calculateTTM } from "./ttm";

export function buildMonthlyEV(
  monthlyPrices: any[],
  balanceData: any
): number[] {

  const bs = balanceData.quarterlyReports.reverse();

  if (!bs?.length) return [];

  let currentQuarterIndex = 0;

  const lastReport = bs[bs.length - 1];
  const latestShares = safeNumber(lastReport.commonStockSharesOutstanding);

  return monthlyPrices.map((m) => {
    // Use adjusted price and latest shares to maintain split integrity
    const marketCap = latestShares * (m.adjustedClose || m.close || 0);
    
    const mDateStr = new Date(m.date).toISOString().split('T')[0];
    while (
      currentQuarterIndex < bs.length - 1 &&
      mDateStr >= bs[currentQuarterIndex + 1].fiscalDateEnding
    ) {
      currentQuarterIndex++;
    }

    const q = bs[currentQuarterIndex];

    const totalDebt =
      safeNumber(q.shortLongTermDebtTotal) ||
      (safeNumber(q.currentDebt) + safeNumber(q.longTermDebt));

    const cash =
      safeNumber(q.cashAndCashEquivalentsAtCarryingValue) +
      safeNumber(q.shortTermInvestments);

    return marketCap + totalDebt - cash;
  });
}


export function buildMonthlyEBITDA(
  incomeData: any,
  monthlyPrices: any[]
): number[] {

  const inc = [...incomeData.quarterlyReports].reverse();

  if (!inc?.length) return [];

  const ebitdaSeries = inc.map((q: any) =>
    safeNumber(q.ebitda)
  );

  const ebitdaTTM = calculateTTM(ebitdaSeries);

  // TTM shifts by 3 quarters (first full year at index 3)
  const alignedQuarterlyReports = inc.slice(3);

  let currentQuarterIndex = 0;

  return monthlyPrices.map((m) => {
    const mDateStr = new Date(m.date).toISOString().split('T')[0];

    while (
      currentQuarterIndex < alignedQuarterlyReports.length - 1 &&
      mDateStr >= alignedQuarterlyReports[currentQuarterIndex + 1].fiscalDateEnding
    ) {
      currentQuarterIndex++;
    }

    return ebitdaTTM[currentQuarterIndex] ?? 0;
  });
}


export function buildEVtoEBITDA(
  evSeries: number[],
  ebitdaSeries: number[]
): number[] {

  const length = Math.min(evSeries.length, ebitdaSeries.length);

  const rawMultiples: number[] = [];

  for (let i = 0; i < length; i++) {
    const ev = evSeries[i];
    const ebitda = ebitdaSeries[i];

    if (
      Number.isFinite(ev) &&
      Number.isFinite(ebitda) &&
      ebitda > 0
    ) {
      rawMultiples.push(ev / ebitda);
    }
  }

  const sorted = rawMultiples.sort((a, b) => a - b);

  const p90 =
    sorted.length > 0
      ? sorted[Math.floor(sorted.length * 0.9)]
      : 50;

  const penaltyMultiple = p90 * 1.5;

  const result: number[] = [];

  for (let i = 0; i < length; i++) {
    const ev = evSeries[i];
    const ebitda = ebitdaSeries[i];

    if (
      !Number.isFinite(ev) ||
      !Number.isFinite(ebitda) ||
      ebitda <= 0
    ) {
      result.push(penaltyMultiple);
    } else {
      result.push(ev / ebitda);
    }
  }

  return result;
}

export function buildMonthlyRevenue(
  incomeData: any,
  monthlyPrices: any[]
): number[] {
  const inc = [...incomeData.quarterlyReports].reverse();
  if (!inc?.length) return [];

  const revenueSeries = inc.map((q: any) => safeNumber(q.totalRevenue));
  const revenueTTM = calculateTTM(revenueSeries);

  const alignedReports = inc.slice(3);
  let currentQuarterIndex = 0;

  return monthlyPrices.map((m) => {
    const mDateStr = new Date(m.date).toISOString().split('T')[0];
    while (
      currentQuarterIndex < alignedReports.length - 1 &&
      mDateStr >= alignedReports[currentQuarterIndex + 1].fiscalDateEnding
    ) {
      currentQuarterIndex++;
    }
    return revenueTTM[currentQuarterIndex] ?? 0;
  });
}

export function buildEVtoRevenue(
  evSeries: number[],
  revenueSeries: number[]
): number[] {
  const length = Math.min(evSeries.length, revenueSeries.length);
  
  const rawMultiples: number[] = [];
  for (let i = 0; i < length; i++) {
    const rev = revenueSeries[i];
    if (rev > 0 && Number.isFinite(rev)) {
      rawMultiples.push(evSeries[i] / rev);
    }
  }

  const historicalPositiveMultiples = rawMultiples.filter((v) => v > 0);
  const maxMultiple = historicalPositiveMultiples.length > 0
    ? Math.max(...historicalPositiveMultiples)
    : 30; // Fallback if no positive history

  const penaltyMultiple = maxMultiple * 1.5;

  const result: number[] = [];
  let previousValidMultiple: number | null = null;

  for (let i = 0; i < length; i++) {
    const ev = evSeries[i];
    const revenue = revenueSeries[i];

    if (!revenue || revenue <= 0 || !Number.isFinite(revenue)) {
      result.push(previousValidMultiple ?? penaltyMultiple);
    } else {
      const validMultiple = ev / revenue;
      result.push(validMultiple);
      previousValidMultiple = validMultiple;
    }
  }

  return result;
}

export function buildFundamentalComposite(
  growthSeries: number[],
  marginSeries: number[],
  efficiencySeries: number[],
  fcfMarginSeries: number[]
): number[] {

  const length = Math.min(
    growthSeries.length,
    marginSeries.length,
    efficiencySeries.length,
    fcfMarginSeries.length
  );

  const composite: number[] = [];

  for (let i = 0; i < length; i++) {

    const value =
      0.35 * (growthSeries[i] || 0) +
      0.25 * (marginSeries[i] || 0) +
      0.20 * (efficiencySeries[i] || 0) +
      0.20 * (fcfMarginSeries[i] || 0);

    composite.push(value);
  }

  return composite;
}

export function forwardFillQuarterlyToMonthly(
  quarterlySeries: number[],
  quarterlyReports: any[],
  monthlyPrices: any[]
): number[] {

  if (!quarterlySeries.length) return [];

  // Ensure reports are chronological (oldest first)
  const chronologicalReports = [...quarterlyReports].reverse();

  // Enforce alignment (taking the LATEST reports that match the series length)
  const alignedReports = chronologicalReports.slice(
    chronologicalReports.length - quarterlySeries.length
  );

  let currentQuarterIndex = 0;

  return monthlyPrices.map((m) => {
    const mDateStr = new Date(m.date).toISOString().split('T')[0];

    // Check if the current monthly price is before the earliest available report
    if (mDateStr < alignedReports[0].fiscalDateEnding) {
        return quarterlySeries[0];
    }

    while (
      currentQuarterIndex < alignedReports.length - 1 &&
      mDateStr >= alignedReports[currentQuarterIndex + 1].fiscalDateEnding
    ) {
      currentQuarterIndex++;
    }

    return quarterlySeries[currentQuarterIndex] ?? quarterlySeries[quarterlySeries.length - 1];
  });
}

export function detectResidualBottoms(
  residuals: number[],
  threshold = -1.5
) {
  const signals: boolean[] = new Array(residuals.length).fill(false);

  for (let i = 2; i < residuals.length; i++) {
    const r0 = residuals[i - 2];
    const r1 = residuals[i - 1];
    const r2 = residuals[i];

    const isLocalMin = r0 > r1 && r1 < r2;
    const isExtreme = r1 < threshold;

    if (isLocalMin && isExtreme) {
      signals[i - 1] = true; // bottom detected at r1
    }
  }

  return signals;
}

export function rollingRegressionResiduals(
  fundamentals: number[],
  logMultiple: number[],
  windowSize: number
) {
  const residuals: number[] = new Array(fundamentals.length).fill(NaN);

  for (let i = 0; i < fundamentals.length; i++) {
    const startIndex = Math.max(0, i - windowSize + 1);
    const fWindow = fundamentals.slice(startIndex, i + 1);
    const mWindow = logMultiple.slice(startIndex, i + 1);

    if (fWindow.length < 2) {
      residuals[i] = 0;
      continue;
    }

    const currentWindowSize = fWindow.length;
    const meanF = fWindow.reduce((a, b) => a + b, 0) / currentWindowSize;
    const meanM = mWindow.reduce((a, b) => a + b, 0) / currentWindowSize;

    let cov = 0;
    let varF = 0;

    for (let j = 0; j < currentWindowSize; j++) {
      cov += (fWindow[j] - meanF) * (mWindow[j] - meanM);
      varF += (fWindow[j] - meanF) ** 2;
    }

    const beta = varF !== 0 ? cov / varF : 0;
    const alpha = meanM - beta * meanF;

    const predicted = alpha + beta * fundamentals[i];
    residuals[i] = logMultiple[i] - predicted;
  }

  return residuals;
}