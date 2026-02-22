"use client";

import React, { useEffect, useState } from "react";
import { Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import VersoLoader from "./VersoLoader";

type Trade = {
  _id: string;
  ticker: string;
  buyDate: string;
  buyPrice: number;
  shares: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
};

export default function PortfolioTracker() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = () => {
    fetch("/api/simulation/trades")
      .then((res) => res.json())
      .then((data) => {
        if (data.trades) setTrades(data.trades);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    try {
      await fetch(`/api/simulation/trades?id=${id}`, { method: "DELETE" });
      setTrades(trades.filter((t) => t._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <VersoLoader />;
  if (trades.length === 0) return null;

  const totalCost = trades.reduce((acc, t) => acc + t.totalCost, 0);
  const totalValue = trades.reduce((acc, t) => acc + t.currentValue, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-[var(--card-shadow)]">
      {/* Summary */}
      <div className="flex justify-between items-end p-5 pb-4">
        <div className="section-label flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          <span>Paper Portfolio</span>
        </div>
        <div className="text-right">
          <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Total P&L</span>
          <div className={`text-xl font-black tracking-tight flex items-center justify-end gap-2 ${totalGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalGain >= 0 ? "+" : ""}${Math.abs(totalGain).toFixed(2)}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${totalGain >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
              {totalGainPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-t border-b border-[var(--border-subtle)]">
            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Asset</th>
            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Entry</th>
            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Cost</th>
            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Value</th>
            <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Return</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {trades.map((trade) => (
            <tr key={trade._id} className="group hover:bg-[var(--surface-raised)] transition-colors">
              <td className="px-5 py-3.5">
                <span className="text-sm font-bold text-text-primary bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">
                  {trade.ticker}
                </span>
              </td>
              <td className="px-5 py-3.5 text-text-secondary text-xs">
                <div>{new Date(trade.buyDate).toLocaleDateString()}</div>
                <div className="text-[10px] text-text-muted">@ ${trade.buyPrice.toFixed(2)}</div>
              </td>
              <td className="px-5 py-3.5 text-right font-mono text-xs text-text-secondary">
                ${trade.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-text-primary">
                ${trade.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="px-5 py-3.5 text-right">
                <div className={`flex items-center justify-end gap-1 text-xs font-bold ${trade.gainLoss >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {trade.gainLoss >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(trade.gainLossPercent).toFixed(1)}%
                </div>
              </td>
              <td className="px-5 py-3.5 text-right">
                <button
                  onClick={() => handleDelete(trade._id)}
                  className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg text-text-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
