"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Cpu, ShieldCheck, Zap, AlertTriangle, Scale } from "lucide-react";

interface DecisionEngineVizProps {
  result: {
    growth: number;
    structural: number;
    balance: number;
    valuation: number;
    finalScore: number;
    signal: "strong_buy" | "buy" | "neutral" | "avoid";
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
    bg: "bg-bg-main",
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

export default function DecisionEngineViz({ result }: DecisionEngineVizProps) {
  const config = signalConfigs[result.signal];
  const Icon = config.icon;

  const chartData = [
    { subject: "Growth", A: Math.max(0.1, result.growth + 0.5), full: 1 },
    { subject: "Structure", A: Math.max(0.1, result.structural + 0.5), full: 1 },
    { subject: "Solvency", A: Math.max(0.1, result.balance + 0.5), full: 1 },
    { subject: "Value", A: Math.max(0.1, result.valuation + 0.5), full: 1 },
  ];

  return (
    <div className="clean-card animate-entrance h-full overflow-hidden relative group">
      {/* Decorative Gradient Background */}
      <div className={`absolute top-0 right-0 w-64 h-64 opacity-[0.03] transition-opacity group-hover:opacity-[0.05] blur-3xl rounded-full -mr-20 -mt-20 ${config.bg.replace('/10', '')}`} />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={16} className="text-brand" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                Algorithm Verdict
              </span>
            </div>
            <h3 className="text-3xl font-display font-black tracking-tighter text-text-primary leading-tight">
              Decision <br />Engine
            </h3>
          </div>

          <div className={`px-4 py-3 rounded-2xl border ${config.bg} ${config.border} flex flex-col items-end`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={config.color} />
              <span className={`text-base font-black uppercase tracking-tight ${config.color}`}>
                {config.label}
              </span>
            </div>
            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">
              Score: {(result.finalScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col xl:flex-row gap-10 items-center">
          {/* Radar Chart */}
          <div className="w-full h-[240px] xl:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="var(--border-subtle)" strokeOpacity={0.4} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
                />
                <Radar
                  name="Quality"
                  dataKey="A"
                  stroke="var(--color-brand)"
                  fill="var(--color-brand)"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Explanation */}
          <div className="flex-1 space-y-4">
            <p className="text-sm text-text-secondary font-semibold leading-relaxed">
              {config.description}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-bg-main border border-border-subtle">
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Momentum</div>
                <div className="text-sm font-bold text-text-primary leading-none">
                  {result.growth > 0 ? "Accelerating" : "Decelerating"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-bg-main border border-border-subtle">
                <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Risk Buffer</div>
                <div className="text-sm font-bold text-text-primary leading-none">
                  {result.balance > 0.5 ? "Robust" : result.balance > 0 ? "Stable" : "Tight"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border-subtle">
          <div className="flex items-center justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <span>Fundamental Weight</span>
            <span>70%</span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-bg-main rounded-full overflow-hidden border border-border-subtle">
            <div className="h-full bg-brand rounded-full" style={{ width: '70%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
