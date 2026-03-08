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
  bottomSignal: boolean[];
  zResidualSeries: number[];
  smoothedZSeries: number[];
}

export interface CompanyOverview {
  Symbol: string;
  AssetType: string;
  Name: string;
  Description: string;
  CIK: string;
  Exchange: string;
  Currency: string;
  Country: string;
  Sector: string;
  Industry: string;
  Address: string;
  OfficialSite: string;
  FiscalYearEnd: string;
  LatestQuarter: string;
  MarketCapitalization: string;
  EBITDA: string;
  PERatio: string;
  PEGRatio: string;
  BookValue: string;
  DividendPerShare: string;
  DividendYield: string;
  EPS: string;
  RevenuePerShareTTM: string;
  ProfitMargin: string;
  OperatingMarginTTM: string;
  ReturnOnAssetsTTM: string;
  ReturnOnEquityTTM: string;
  RevenueTTM: string;
  GrossProfitTTM: string;
  DilutedEPSTTM: string;
  QuarterlyEarningsGrowthYOY: string;
  QuarterlyRevenueGrowthYOY: string;
  AnalystTargetPrice: string;
  AnalystRatingStrongBuy: string;
  AnalystRatingBuy: string;
  AnalystRatingHold: string;
  AnalystRatingSell: string;
  AnalystRatingStrongSell: string;
  TrailingPE: string;
  ForwardPE: string;
  PriceToSalesRatioTTM: string;
  PriceToBookRatio: string;
  EVToRevenue: string;
  EVToEBITDA: string;
  Beta: string;
  "52WeekHigh": string;
  "52WeekLow": string;
  "50DayMovingAverage": string;
  "200DayMovingAverage": string;
  SharesOutstanding: string;
  DividendDate: string;
  ExDividendDate: string;
}