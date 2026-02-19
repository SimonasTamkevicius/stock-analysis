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

  const result: number[] = [];

  for (let i = 0; i < length; i++) {
    const ev = evSeries[i];
    const ebitda = ebitdaSeries[i];

    if (!ebitda || ebitda <= 0 || isNaN(ebitda)) {
      result.push(NaN);
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
  const result: number[] = [];

  for (let i = 0; i < length; i++) {
    const ev = evSeries[i];
    const revenue = revenueSeries[i];

    if (!revenue || revenue <= 0 || isNaN(revenue)) {
      result.push(NaN);
    } else {
      result.push(ev / revenue);
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
