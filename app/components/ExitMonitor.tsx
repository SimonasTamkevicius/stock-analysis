"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Target, X, TrendingUp, TrendingDown, ArrowUpDown, ShieldAlert, ShieldCheck, DollarSign, Activity, CircleAlert } from "lucide-react";
import { computeExitBoundaries } from "@/lib/exitBoundary";
import { computeAnnualizedVolatility, estimateForwardGrowth } from "@/lib/helpers/exitBoundaryHelpers";

interface SellSignal {
  shouldSell: boolean;
  pressure: number;
  urgency: "none" | "monitor" | "reduce" | "exit";
  reasons: string[];
}

interface ExitMonitorProps {
  ticker: string;
  currentPrice: number;
  monthlyPrices: number[];
  yoyGrowthTTM: number[];
  stockMultiple: number;
  sectorMultiple?: number;
  sellSignal?: SellSignal;
}

type PriceZone = "below-stop" | "in-range" | "near-target" | "above-target";

const zoneConfigs: Record<PriceZone, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  "below-stop":   { label: "Below Stop",   color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",    icon: ShieldAlert },
  "in-range":     { label: "In Range",     color: "text-text-secondary", bg: "bg-[var(--surface-raised)] border-[var(--border-subtle)]", icon: ArrowUpDown },
  "near-target":  { label: "Near Target",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",  icon: Target },
  "above-target": { label: "Above Target", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: TrendingUp },
};

function getZone(current: number, lower: number, upper: number): PriceZone {
  if (current <= lower) return "below-stop";
  if (current >= upper) return "above-target";
  const range = upper - lower;
  if (range > 0 && (current - lower) / range >= 0.85) return "near-target";
  return "in-range";
}

function storageKey(ticker: string) {
  return `exit-monitor-entry-${ticker.toUpperCase()}`;
}

const urgencyConfigs = {
  none: { label: "Clear", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  monitor: { label: "Monitor", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  reduce: { label: "Reduce", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  exit: { label: "Exit", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
};

const reasonLabels: Record<string, string> = {
  "composite-score-decay": "Score Decay",
  "valuation-exhaustion": "Overvaluation",
  "fundamental-deterioration": "Thesis Break",
  "expensive-momentum-reversal": "Expensive + Decelerating",
  "leverage-risk-escalation": "Leverage Risk",
  "multi-factor-convergence": "Multi-Factor",
};

export default function ExitMonitor({
  ticker,
  currentPrice,
  monthlyPrices,
  yoyGrowthTTM,
  stockMultiple,
  sectorMultiple = 20,
  sellSignal,
}: ExitMonitorProps) {
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey(ticker));
    if (saved) {
      const val = parseFloat(saved);
      if (Number.isFinite(val) && val > 0) {
        setEntryPrice(val);
        setInputValue(val.toString());
      }
    }
  }, [ticker]);

  const handleSetEntry = () => {
    const val = parseFloat(inputValue);
    if (!Number.isFinite(val) || val <= 0) return;
    setEntryPrice(val);
    setIsEditing(false);
    localStorage.setItem(storageKey(ticker), val.toString());
  };

  const handleClear = () => {
    setEntryPrice(null);
    setInputValue("");
    setIsEditing(false);
    localStorage.removeItem(storageKey(ticker));
  };

  // Compute boundaries
  const result = useMemo(() => {
    if (!entryPrice || entryPrice <= 0) return null;

    const vol = computeAnnualizedVolatility(monthlyPrices);
    const growth = estimateForwardGrowth(yoyGrowthTTM);
    
    // For trailing stop logic, we want the stop-loss to anchor to the highest
    // achieved price (represented here by currentPrice if it's above entry),
    // but the target should still be based on the original entry to reflect the thesis.
    // For simplicity, we can pass trailingAnchor to the compute function or
    // adjust it here. To keep the math clean, we'll calculate boundaries based on
    // the highest of (entryPrice, currentPrice) for the stop, and entryPrice for target.
    
    const trailingAnchor = Math.max(entryPrice, currentPrice);

    const baseBoundaries = computeExitBoundaries({
      entryPrice,
      annualizedVolatility: vol || 0.30,
      forwardEarningsGrowth: growth,
      sectorPE: sectorMultiple,
      stockPE: stockMultiple,
    });
    
    // If we are trailing, recalculate the lower boundary anchored to the new high
    if (trailingAnchor > entryPrice) {
       const trailingBoundaries = computeExitBoundaries({
         entryPrice: trailingAnchor,
         annualizedVolatility: vol || 0.30,
         forwardEarningsGrowth: growth,
         sectorPE: sectorMultiple,
         stockPE: stockMultiple,
       });
       // Keep original entry's target, but use the trailing high's stop
       return {
         ...baseBoundaries,
         lowerBoundary: trailingBoundaries.lowerBoundary,
         // Recompute downside risk and R:R from the entry perspective
         downsideRisk: Math.max(0, (entryPrice - trailingBoundaries.lowerBoundary) / entryPrice),
         get rewardToRisk() {
           const downside = (entryPrice - trailingBoundaries.lowerBoundary) / entryPrice;
           return downside > 0 ? baseBoundaries.upsidePotential / downside : 99.9;
         }
       };
    }

    return baseBoundaries;
  }, [entryPrice, currentPrice, monthlyPrices, yoyGrowthTTM, stockMultiple, sectorMultiple]);

  // Determine zone
  const zone = result ? getZone(currentPrice, result.lowerBoundary, result.upperBoundary) : null;
  const zoneConfig = zone ? zoneConfigs[zone] : null;

  // Price position percentage for the gauge
  const gaugePosition = result
    ? Math.max(0, Math.min(100, ((currentPrice - result.lowerBoundary) / (result.upperBoundary - result.lowerBoundary)) * 100))
    : 50;

  const entryPosition = result && entryPrice
    ? Math.max(0, Math.min(100, ((entryPrice - result.lowerBoundary) / (result.upperBoundary - result.lowerBoundary)) * 100))
    : 50;

  const pnl = entryPrice && currentPrice ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;

  // Forward-looking metrics relative to current price
  const forwardUpside = result ? Math.max(0, (result.upperBoundary - currentPrice) / currentPrice) : 0;
  const forwardDownside = result ? Math.max(0, (currentPrice - result.lowerBoundary) / currentPrice) : 0;
  const forwardRR = forwardDownside > 0.001 ? forwardUpside / forwardDownside : (forwardUpside > 0 ? 99.9 : 0);

  return (
    <div className="gradient-card p-4 animate-entrance">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
            <Target size={13} className="text-brand" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted">
            Exit Monitor
          </span>
        </div>
        {entryPrice && !isEditing && (
          <button
            onClick={handleClear}
            className="p-1 rounded-md hover:bg-[var(--surface-raised)] transition-colors"
            title="Clear entry"
          >
            <X size={12} className="text-text-muted" />
          </button>
        )}
      </div>

      {/* Entry price input */}
      {(!entryPrice || isEditing) ? (
        <div className="space-y-2">
          <p className="text-[10px] text-text-muted leading-relaxed">
            Enter your buy price to see mathematically-derived exit boundaries.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetEntry()}
                placeholder="Entry price"
                className="w-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-lg pl-7 pr-3 py-2.5 text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all placeholder:text-text-muted/40"
              />
            </div>
            <button
              onClick={handleSetEntry}
              disabled={!inputValue || parseFloat(inputValue) <= 0}
              className="px-4 py-2 rounded-lg bg-brand text-white text-[10px] font-black uppercase tracking-wider hover:bg-brand/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand/20"
            >
              Set
            </button>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-3">
          {/* Entry + Current + P&L row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsEditing(true)}
              className="group flex items-center gap-1.5 hover:bg-[var(--surface-raised)] rounded-lg px-2 py-1 -mx-2 transition-colors"
            >
              <span className="text-[9px] font-bold text-text-muted uppercase">Entry</span>
              <span className="text-sm font-mono font-black text-text-primary">
                ${entryPrice.toFixed(2)}
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-black ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
              </span>
              {zoneConfig && (
                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${zoneConfig.bg} ${zoneConfig.color}`}>
                  {zoneConfig.label}
                </span>
              )}
            </div>
          </div>

          {/* Boundary gauge */}
          <div className="relative">
            {/* Stop → Target bar */}
            <div className="h-2 w-full rounded-full overflow-hidden bg-gradient-to-r from-rose-500/20 via-[var(--border-subtle)] to-emerald-500/20">
              {/* Filled portion up to current price */}
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  zone === "below-stop"
                    ? "bg-gradient-to-r from-rose-600 to-rose-400"
                    : zone === "above-target"
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                    : "bg-gradient-to-r from-blue-600/60 to-brand/60"
                }`}
                style={{ width: `${gaugePosition}%` }}
              />
            </div>

            {/* Entry marker */}
            <div
              className="absolute top-[-3px] w-0.5 h-[14px] bg-text-muted/40 rounded-full transition-all duration-500"
              style={{ left: `${entryPosition}%` }}
              title={`Entry: $${entryPrice.toFixed(2)}`}
            />

            {/* Current price marker */}
            <div
              className="absolute top-[-5px] transition-all duration-700"
              style={{ left: `${gaugePosition}%`, transform: "translateX(-50%)" }}
            >
              <div className={`w-3 h-3 rounded-full border-2 border-bg-main shadow-lg ${
                zone === "below-stop" ? "bg-rose-400" :
                zone === "above-target" ? "bg-emerald-400" :
                "bg-brand"
              }`} />
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-rose-400/70 uppercase">Stop</span>
                <span className="text-[10px] font-mono font-bold text-text-muted">
                  ${result.lowerBoundary.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-bold text-text-muted/50 uppercase">Now</span>
                <span className="text-[10px] font-mono font-bold text-text-primary">
                  ${currentPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-bold text-emerald-400/70 uppercase">Target</span>
                <span className="text-[10px] font-mono font-bold text-text-muted">
                  ${result.upperBoundary.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <MetricCell
              icon={TrendingUp}
              label="Upside"
              value={`+${(forwardUpside * 100).toFixed(0)}%`}
              color={forwardUpside > 0.05 ? "text-emerald-400" : "text-emerald-400/50"}
            />
            <MetricCell
              icon={TrendingDown}
              label="Downside"
              value={`-${(forwardDownside * 100).toFixed(0)}%`}
              color="text-rose-400"
            />
            <MetricCell
              icon={Activity}
              label="R:R"
              value={`${forwardRR.toFixed(1)}×`}
              color={forwardRR >= 2 ? "text-emerald-400" : forwardRR >= 1 ? "text-amber-400" : "text-rose-400"}
            />
          </div>

          {/* Drift + penalty row */}
          <div className="flex items-center gap-3 text-[9px]">
            <span className="text-text-muted">
              Drift <span className={`font-mono font-bold ${result.expectedDrift >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(result.expectedDrift * 100).toFixed(1)}%
              </span>
            </span>
            {result.valuationPenalty > 0 && (
              <span className="text-text-muted">
                Val. Penalty <span className="font-mono font-bold text-amber-400">
                  −{(result.valuationPenalty * 100).toFixed(1)}%
                </span>
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Sell Pressure — always visible */}
      {sellSignal && <SellPressureSection sellSignal={sellSignal} hasEntry={!!entryPrice} />}
    </div>
  );
}

function MetricCell({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
      <Icon size={10} className="text-text-muted" />
      <span className={`text-xs font-mono font-black ${color}`}>{value}</span>
      <span className="text-[7px] font-bold text-text-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

function SellPressureSection({ sellSignal, hasEntry }: { sellSignal: SellSignal; hasEntry: boolean }) {
  const { pressure, urgency, reasons } = sellSignal;
  const uConfig = urgencyConfigs[urgency];
  const pct = Math.min(100, (pressure / 10) * 100);

  const barColor =
    urgency === "exit" ? "from-rose-600 to-rose-400"
    : urgency === "reduce" ? "from-orange-600 to-orange-400"
    : urgency === "monitor" ? "from-amber-600 to-amber-400"
    : "from-emerald-600 to-emerald-400";

  return (
    <div className={`${hasEntry ? "mt-3 pt-3 border-t border-[var(--border-subtle)]" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          {pressure > 0 ? (
            <TrendingDown size={13} className={uConfig.color} />
          ) : (
            <ShieldCheck size={13} className="text-emerald-400" />
          )}
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-text-muted">
            Sell Pressure
          </span>
        </div>

        <div className="flex-1 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <span className={`text-xs font-mono font-black ${uConfig.color}`}>{pressure}</span>

        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${uConfig.bg} ${uConfig.color}`}>
          {uConfig.label}
        </span>
      </div>

      {reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 ml-[26px]">
          {reasons.map((reason) => (
            <span
              key={reason}
              className="inline-flex items-center gap-1 text-[9px] font-bold text-text-muted bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md"
            >
              <CircleAlert size={8} className={uConfig.color} />
              {reasonLabels[reason] || reason}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
