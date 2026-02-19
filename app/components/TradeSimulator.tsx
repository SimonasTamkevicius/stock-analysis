"use client";

import React, { useState } from "react";
import { DollarSign, Calendar, TrendingUp, Loader2, CheckCircle2 } from "lucide-react";

type Props = {
  ticker: string;
  currentPrice: number;
  dates: string[]; // Month ending dates YYYY-MM UTC
  prices: number[]; // Corresponding prices
};

export default function TradeSimulator({ ticker, currentPrice, dates, prices }: Props) {
  const [amount, setAmount] = useState<number>(10000);
  const [selectedDate, setSelectedDate] = useState<string>(
    dates[dates.length - 1] || new Date().toISOString().split("T")[0]
  );
  const [customPrice, setCustomPrice] = useState<number>(currentPrice);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Find price for selected date if buying historically
  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    const idx = dates.indexOf(date);
    if (idx !== -1) {
      setCustomPrice(prices[idx]);
    }
  };

  const shares = amount / (customPrice || 1);

  const executeTrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          buyDate: selectedDate,
          buyPrice: customPrice,
          shares,
          totalCost: amount,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        console.error("Failed to execute trade");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clean-card p-6 bg-surface border border-border-subtle rounded-3xl relative overflow-hidden">
      {success && (
        <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center z-10 animate-entrance">
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 size={48} className="text-emerald-500" />
            <span className="text-emerald-500 font-bold text-lg">Order Executed</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={16} className="text-brand" />
        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
          Paper Trading
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Investment Amount
            </label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-bg-main border border-border-subtle rounded-xl py-3 pl-9 pr-4 text-text-primary font-bold focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Execution Date
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <select
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full bg-bg-main border border-border-subtle rounded-xl py-3 pl-9 pr-4 text-text-primary font-bold focus:outline-none focus:border-brand transition-colors appearance-none"
              >
                {/* Add 'Today' option manually if needed, or rely on passed dates */}
                 <option value={new Date().toISOString().split("T")[0]}>Today (Live Price)</option>
                {[...dates].reverse().map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
           <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Execution Price
            </label>
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
               <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(Number(e.target.value))}
                className="w-full bg-bg-main border border-border-subtle rounded-xl py-3 pl-9 pr-4 text-text-primary font-bold focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="bg-bg-main rounded-2xl p-6 flex flex-col justify-between border border-border-subtle">
           <div>
            <span className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
              Order Summary
            </span>
            <div className="flex justify-between items-end">
              <h4 className="text-3xl font-display font-black text-text-primary tracking-tighter">
                {Math.floor(shares)} <span className="text-lg text-text-muted">shares</span>
              </h4>
               <span className="text-sm font-bold text-text-secondary">
                @ ${customPrice.toFixed(2)}
              </span>
            </div>
           </div>

           <button
            onClick={executeTrade}
            disabled={loading || amount <= 0}
            className="w-full mt-6 bg-brand text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
           >
             {loading ? <Loader2 className="animate-spin" size={20} /> : "Execute Paper Trade"}
           </button>
        </div>
      </div>
    </div>
  );
}
