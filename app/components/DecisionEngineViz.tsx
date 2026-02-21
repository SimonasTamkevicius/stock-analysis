"use client";

import React from "react";
import { Cpu, ShieldCheck, Zap, AlertTriangle, Scale, Activity, DollarSign } from "lucide-react";

interface DecisionEngineVizProps {
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
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: ShieldCheck,
    description: "Exceptional alignment of fundamental momentum and statistical value."
  },
  buy: {
    label: "Buy",
    color: "text-brand",
    bg: "bg-brand/10",
    border: "border-brand/20",
    icon: Zap,
    description: "Positive trajectory with reasonable risk-adjusted valuation."
  },
  neutral: {
    label: "Neutral",
    color: "text-text-muted",
    bg: "bg-black/5 dark:bg-white/5",
    border: "border-border-subtle",
    icon: Scale,
    description: "The algorithm suggests a hold. Fundamentals and price are in equilibrium."
  },
  avoid: {
    label: "Avoid",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: AlertTriangle,
    description: "Fragmented momentum or severe valuation decoupling detected."
  }
};

function DivergingBar({
  label,
  weight,
  value,
  max,
  invert = false
}: {
  label: string;
  weight: string;
  value: number;
  max: number;
  invert?: boolean;
}) {
  const percentage = Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));

  // If invert=true, negative values are treated as positive/good
  const isPositive = invert ? value <= 0 : value >= 0;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center text-[11px] uppercase tracking-wider">
        <span className="font-bold text-text-primary">
          {label}{" "}
          <span className="text-text-muted opacity-70">({weight})</span>
        </span>
        <span
          className={`font-mono font-bold drop-shadow-sm ${
            isPositive ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {value > 0 ? "+" : ""}
          {value.toFixed(2)}
        </span>
      </div>

      <div className="relative h-1.5 w-full bg-black/5 dark:bg-white/5 border border-border-subtle/50 rounded-full overflow-hidden shadow-inner">
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border-subtle z-10" />

        <div
          className={`absolute top-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${
            isPositive
              ? "bg-gradient-to-l from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
              : "bg-gradient-to-r from-rose-400 to-rose-500 shadow-[0_0_8px_rgba(251,113,133,0.4)]"
          }`}
          style={{
            width: `${percentage / 2}%`,
            left: value >= 0 ? "50%" : `${50 - percentage / 2}%`
          }}
        />
      </div>
    </div>
  );
}

export default function DecisionEngineViz({ result }: DecisionEngineVizProps) {
  const config = signalConfigs[result.signal];
  const Icon = config.icon;
  const bd = result.breakdown;

  if (!bd) {
    return (
      <div className="glass-card animate-entrance h-full p-6 text-center text-text-muted text-sm">
        Please refresh the data to see the new Decision Engine breakdown.
      </div>
    );
  }

  return (
    <div className="glass-card animate-entrance h-full overflow-hidden relative group flex flex-col p-6 lg:p-8">
      {/* Decorative Gradient Background */}
      <div className={`absolute top-0 right-0 w-80 h-80 opacity-20 transition-opacity group-hover:opacity-30 blur-[100px] rounded-full -mr-20 -mt-20 bg-current ${config.color}`} />

      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-6 gap-4">
          <div className="flex flex-col gap-1 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={18} className={config.color} />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.color}`}>
                Algorithm Verdict
              </span>
            </div>
            <h3 className="text-3xl lg:text-4xl font-display font-black tracking-tighter text-text-primary drop-shadow-md leading-tight">
              Decision <br />Engine
            </h3>
          </div>

          <div className={`p-4 rounded-2xl border ${config.bg} ${config.border} flex flex-col items-end backdrop-blur-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className={config.color} />
              <span className={`text-base font-black uppercase tracking-tight ${config.color} drop-shadow-sm`}>
                {config.label}
              </span>
            </div>
            <span className="text-[14px] font-black text-text-muted uppercase tracking-widest mt-1">
              Score: {(result.finalScore * 100).toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-sm text-text-secondary font-medium leading-relaxed mb-8 max-w-xs">
          {config.description}
        </p>

        {/* Breakdown Flow */}
        <div className="flex-1 space-y-5">
          
          {/* Fundamentals (50%) */}
          <div className="p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-subtle hover:border-text-muted/30 transition-colors shadow-inner relative overflow-hidden group/card backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.03] dark:from-white/[0.03] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle shrink-0">
                  <Activity size={18} className="text-text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-text-primary uppercase tracking-tight leading-tight">Fundamentals</span>
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Weight: 50%</span>
                </div>
              </div>
              <span className="text-lg font-mono font-black text-text-primary drop-shadow-sm">{(bd.fundamentals?.riskAdjustedScore || 0).toFixed(2)}</span>
            </div>
            
            <div className="space-y-5 pl-4 border-l-2 border-border-subtle ml-2 relative z-10">
              <DivergingBar label="Growth Momentum" weight="45%" value={bd.fundamentals?.components?.growth?.raw || 0} max={1.5} />
              <DivergingBar label="Structural Quality" weight="35%" value={bd.fundamentals?.components?.structural?.raw || 0} max={1.5} />
              <DivergingBar label="Balance Sheet" weight="20%" value={bd.fundamentals?.components?.balance?.raw || 0} max={1} />
            </div>
            
            <div className="mt-6 pt-4 border-t border-border-subtle flex justify-between items-center text-xs relative z-10">
              <span className="text-text-muted font-black uppercase tracking-widest text-[10px]">Risk Multiplier Hook</span>
              <span className="font-mono font-bold text-text-primary bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md border border-border-subtle/50">{(bd.fundamentals?.riskMultiplier || 1).toFixed(2)}x</span>
            </div>
          </div>

          {/* Valuation (50%) */}
          <div className="p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-subtle hover:border-text-muted/30 transition-colors shadow-inner relative overflow-hidden group/card backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.03] dark:from-white/[0.03] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border-subtle shrink-0">
                  <DollarSign size={18} className="text-text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-text-primary uppercase tracking-tight leading-tight">Valuation Signal</span>
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Weight: 50%</span>
                </div>
              </div>
              <span className="text-lg font-mono font-black text-text-primary drop-shadow-sm">{(bd.valuation?.score || 0).toFixed(2)}</span>
            </div>
            
            <div className="pl-4 border-l-2 border-border-subtle ml-2 relative z-10">
              <DivergingBar
                label="Valuation Lag"
                weight="100%"
                value={bd.valuation?.score || 0}
                max={1}
                invert={true}
              />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
