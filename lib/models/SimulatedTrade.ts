import mongoose, { Schema, Model } from "mongoose";

export interface ISimulatedTrade {
  ticker: string;
  buyDate: Date;
  buyPrice: number;
  shares: number;
  totalCost: number;
  notes?: string;
  createdAt: Date;
}

const SimulatedTradeSchema = new Schema({
  ticker: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  buyDate: {
    type: Date,
    required: true,
  },
  buyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  shares: {
    type: Number,
    required: true,
    min: 0,
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SimulatedTrade: Model<ISimulatedTrade> =
  mongoose.models.SimulatedTrade ||
  mongoose.model<ISimulatedTrade>("SimulatedTrade", SimulatedTradeSchema);

export default SimulatedTrade;
