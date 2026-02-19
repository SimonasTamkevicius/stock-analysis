import mongoose, { Schema, Model } from "mongoose";

export interface ICompanyFinancials {
  ticker: string;
  incomeStatements: Record<string, unknown>[];
  cashFlowStatements: Record<string, unknown>[];
  balanceSheets: Record<string, unknown>[];
  monthlyPrices: Record<string, unknown>[];
  lastUpdated: Date;
  ttm: {
    revenue: number[];
    operatingIncome: number[];
    fcf: number[];
  };
}

const CompanyFinancialsSchema = new Schema({
  ticker: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true,
  },
  incomeStatements: { type: Array, default: [] },
  cashFlowStatements: { type: Array, default: [] },
  balanceSheets: { type: Array, default: [] },
  ttm: {
    revenue: { type: Array, default: [] },
    operatingIncome: { type: Array, default: [] },
    fcf: { type: Array, default: [] },
  },
  lastUpdated: { type: Date, default: Date.now },
  monthlyPrices: { type: Array, default: [] },
});

const CompanyFinancials: Model<ICompanyFinancials> =
  mongoose.models.CompanyFinancials ||
  mongoose.model<ICompanyFinancials>("CompanyFinancials", CompanyFinancialsSchema);

export default CompanyFinancials;
