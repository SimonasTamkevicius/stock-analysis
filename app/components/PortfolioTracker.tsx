"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
        setTrades(trades.filter(t => t._id !== id));
    } catch (err) {
        console.error(err);
    }
  }

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-text-muted"/></div>;
  if (trades.length === 0) return null;

  const totalCost = trades.reduce((acc, t) => acc + t.totalCost, 0);
  const totalValue = trades.reduce((acc, t) => acc + t.currentValue, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div className="w-full space-y-6">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-display font-black tracking-tighter text-text-primary">
              Paper Portfolio
            </h2>
             <p className="text-sm text-text-secondary font-medium">
              Performance tracking of simulated positions
            </p>
          </div>
          <div className="text-right">
             <span className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Total P&L</span>
             <div className={`text-2xl font-black tracking-tight flex items-center justify-end gap-2 ${totalGain >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {totalGain >= 0 ? "+" : ""}${Math.abs(totalGain).toFixed(2)}
                <span className={`text-sm px-2 py-0.5 rounded-full ${totalGain >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                    {totalGainPct.toFixed(2)}%
                </span>
             </div>
          </div>
       </div>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted font-bold uppercase tracking-wider text-[10px]">
              <th className="px-6 py-4">Asset</th>
              <th className="px-6 py-4">Entry</th>
              <th className="px-6 py-4 text-right">Cost Basis</th>
              <th className="px-6 py-4 text-right">Market Value</th>
              <th className="px-6 py-4 text-right">Return</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {trades.map((trade) => (
              <tr key={trade._id} className="group hover:bg-bg-main transition-colors">
                <td className="px-6 py-4 font-bold text-text-primary">
                    <span className="bg-bg-main border border-border-subtle px-2 py-1 rounded text-xs mr-2">{trade.ticker}</span>
                </td>
                <td className="px-6 py-4 text-text-secondary">
                  <div className="flex flex-col">
                    <span>{new Date(trade.buyDate).toLocaleDateString()}</span>
                    <span className="text-[10px] text-text-muted">@ ${trade.buyPrice.toFixed(2)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-text-secondary">
                  ${trade.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-6 py-4 text-right font-bold text-text-primary">
                   ${trade.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`flex items-center justify-end gap-1 font-bold ${trade.gainLoss >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                     {trade.gainLoss >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                     {Math.abs(trade.gainLossPercent).toFixed(2)}%
                  </div>
                   <span className={`text-[10px] block ${trade.gainLoss >= 0 ? "text-emerald-500/70" : "text-rose-500/70"}`}>
                    {trade.gainLoss >= 0 ? "+" : "-"}${Math.abs(trade.gainLoss).toFixed(0)}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <button 
                        onClick={() => handleDelete(trade._id)}
                        className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-full text-text-muted transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
