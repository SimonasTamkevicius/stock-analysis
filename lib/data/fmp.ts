const BASE_URL = "https://financialmodelingprep.com/stable";

export async function fetchQuarterlyIncomeStatement(ticker: string) {
  const res = await fetch(
    `${BASE_URL}/income-statement?symbol=${ticker}&period=quarter&apikey=${process.env.FMP_API_KEY}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data = await res.json();
  return data;
}

export async function fetchQuarterlyCashFlow(ticker: string) {
  const res = await fetch(
    `${BASE_URL}/cash-flow-statement?symbol=${ticker}&period=quarter&apikey=${process.env.FMP_API_KEY}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch cash flow data");
  }

  return res.json();
}

export async function fetchQuarterlyBalanceSheet(ticker: string) {
  const res = await fetch(
    `${BASE_URL}/balance-sheet-statement?symbol=${ticker}&period=quarter&apikey=${process.env.FMP_API_KEY}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch balance sheet");
  }

  return res.json();
}
