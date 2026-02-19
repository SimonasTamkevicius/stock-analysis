export interface QuarterlyIncomeStatement {
    date: string;
    revenue: number;
    operatingIncome: number;
}

export interface QuarterlyCashFlow {
    date: string;
    operatingCashFlow: number;
    capitalExpenditure: number;
}

export interface QuarterlyBalanceSheet {
    date: string;
    totalAssets: number;
    totalCurrentLiabilities: number;
}

export interface BalanceSheetDiagnostics {
  leverageScore: number;
  coverageScore: number;
  liquidityScore: number;
  debtTrendScore: number;
  totalScore: number;
  state: "low-risk" | "moderate" | "high-risk";
}

export interface ValuationLagDiagnostics {
  multipleSlope: number;
  fundamentalSlope: number;
  score: number;
  state:
    | "significant-undervaluation"
    | "undervalued"
    | "fair-value"
    | "overvalued"
    | "significant-overvaluation";
}
