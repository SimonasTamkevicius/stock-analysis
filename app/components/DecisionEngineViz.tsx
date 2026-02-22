"use client";

import React from "react";
import { Cpu, ShieldCheck, Zap, AlertTriangle, Scale, Activity, DollarSign } from "lucide-react";

interface DecisionEngineVizProps {
  ticker?: string;
  result: {
    growth: number;
    structural: number;
    balance: number;
    valuation: number;
    finalScore: number;
    signal: "strong_buy" | "buy" | "neutral" | "avoid";
    breakdown: {
      fundamentals: {
        score: number;
        weight: number;
        components: {
          growth: { raw: number; weight: number; contribution: number };
          structural: { raw: number; weight: number; contribution: number };
          balance: { raw: number; weight: number; contribution: number };
        };
        riskMultiplier: number;
        riskAdjustedScore: number;
      };
      valuation: { score: number; weight: number; contribution: number };
    };
  };
}

const signalConfigs = {
  strong_buy: {
    label: "Strong Buy",
    color: "text-emerald-400",
    ring: "stroke-emerald-400",
    glow: "shadow-emerald-500/20",
    meshColor: "emerald",
    icon: ShieldCheck,
    description: "Exceptional alignment of momentum and statistical value.",
  },
  buy: {
    label: "Buy",
    color: "text-brand",
    ring: "stroke-[var(--color-brand)]",
    glow: "shadow-brand/20",
    meshColor: "brand",
    icon: Zap,
    description: "Positive trajectory with reasonable risk-adjusted valuation.",
  },
  neutral: {
    label: "Neutral",
    color: "text-text-secondary",
    ring: "stroke-[var(--text-muted)]",
    glow: "",
    meshColor: "brand",
    icon: Scale,
    description: "Fundamentals and price are in equilibrium.",
  },
  avoid: {
    label: "Avoid",
    color: "text-rose-400",
    ring: "stroke-rose-400",
    glow: "shadow-rose-500/20",
    meshColor: "rose",
    icon: AlertTriangle,
    description: "Fragmented momentum or valuation decoupling detected.",
  },
};

function ScoreRing({ score, signal }: { score: number; signal: string }) {
  const config = signalConfigs[signal as keyof typeof signalConfigs];
  const pct = Math.max(0, Math.min(100, score * 100));
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        {/* Background track */}
        <circle cx="64" cy="64" r="58" fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
        {/* Score arc */}
        <circle
          cx="64" cy="64" r="58"
          fill="none"
          className={config.ring}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`score-display text-base ${config.color}`}>
          {pct.toFixed(0)}
        </span>
        <span className="text-[7px] font-bold text-text-muted uppercase tracking-widest">Score</span>
      </div>
    </div>
  );
}

function BreakdownRow({
  icon: Icon,
  label,
  weight,
  value,
  maxVal,
  reverse = false,
}: {
  icon: React.ElementType;
  label: string;
  weight: string;
  value: number;
  maxVal: number;
  reverse?: boolean;
}) {
  const pct = Math.min(100, Math.max(2, (Math.abs(value) / maxVal) * 100));
  const isPositive = reverse ? value < 0 : value >= 0;

  return (
    <div className="group/row flex items-center gap-3 py-3 px-3 -mx-3 rounded-xl hover:bg-[var(--surface-raised)] transition-colors">
      <div className="p-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] shrink-0">
        <Icon size={14} className="text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-bold text-text-secondary tracking-tight">{label}</span>
          <span className={`text-xs font-mono font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {value > 0 ? "+" : ""}{value.toFixed(2)}
          </span>
        </div>
        <div className="h-1 w-full bg-[var(--border-subtle)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              isPositive
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-rose-500 to-rose-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] font-bold text-text-muted shrink-0">{weight}</span>
    </div>
  );
}

export default function DecisionEngineViz({ result, ticker }: DecisionEngineVizProps) {
  const config = signalConfigs[result.signal];
  const Icon = config.icon;
  const bd = result.breakdown;

  if (!bd) {
    return (
      <div className="clean-card h-full p-6 text-center text-text-muted text-sm">
        Please refresh the data to see the Decision Engine breakdown.
      </div>
    );
  }

  return (
    <div className="gradient-card animate-entrance p-4 lg:p-5">
      {/* Floating mesh gradient */}
      <div className={`mesh-gradient ${config.meshColor} -top-20 -right-20 opacity-15`}
           style={{ width: 200, height: 200 }} />

      <div className="relative z-10">
        {/* Horizontal hero layout */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">

          {/* Left: Ticker + Signal */}
          <div className="flex items-center gap-5 shrink-0">
            {ticker && (
              <h1 className="text-4xl lg:text-5xl font-display font-black tracking-tighter text-text-primary leading-none">
                {ticker}
              </h1>
            )}
            <div className="flex items-center gap-4">
              <ScoreRing score={result.finalScore} signal={result.signal} />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={16} className={config.color} />
                  <span className={`text-lg font-black uppercase tracking-tight ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted leading-snug max-w-[180px]">
                  {config.description}
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block h-16 w-px bg-[var(--border-subtle)]" />

          {/* Right: Compact breakdown */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
              <BreakdownRow icon={Activity} label="Growth Momentum" weight="45%" value={bd.fundamentals?.components?.growth?.raw || 0} maxVal={1.5} />
              <BreakdownRow icon={ShieldCheck} label="Structural Quality" weight="35%" value={bd.fundamentals?.components?.structural?.raw || 0} maxVal={1.5} />
              <BreakdownRow icon={Scale} label="Balance Sheet" weight="20%" value={bd.fundamentals?.components?.balance?.raw || 0} maxVal={1} />
              <BreakdownRow icon={DollarSign} label="Valuation Lag" weight="50%" value={bd.valuation?.score || 0} maxVal={1} reverse={true} />
            </div>
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Risk Mult.</span>
              <span className="text-[10px] font-mono font-bold text-text-secondary bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">
                {(bd.fundamentals?.riskMultiplier || 1).toFixed(2)}×
              </span>
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider ml-auto">Fundamentals</span>
              <span className="text-[10px] font-mono font-bold text-text-secondary bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">
                {(bd.fundamentals?.riskAdjustedScore || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
