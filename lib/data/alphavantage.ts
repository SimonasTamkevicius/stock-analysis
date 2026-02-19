
export async function fetchQuarterlyIncomeStatement(ticker: string) {
  const res = await fetch(
    `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  return res.json();
}

export async function fetchQuarterlyCashFlow(ticker: string) {
  const res = await fetch(
    `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch cash flow data");
  }

  return res.json();
}

export async function fetchQuarterlyBalanceSheet(ticker: string) {
  const res = await fetch(
    `https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${ticker}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch balance sheet");
  }

  return res.json();
}

export async function fetchMonthlyPrices(ticker: string) {
  const res = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch monthly prices");
  }

  return res.json();
}