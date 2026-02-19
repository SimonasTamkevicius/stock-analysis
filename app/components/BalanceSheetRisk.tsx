"use client";

import React, { useState } from "react";
import { ChevronRight, Activity } from "lucide-react";

type BalanceSheetRiskProps = {
  risk: {
    leverageScore: number;
    coverageScore: number;
    liquidityScore: number;
    debtTrendScore: number;
    totalScore: number;
    state: "low-risk" | "moderate" | "high-risk";
  };
};

function getBadgeStyles(state: string) {
  if (state === "low-risk")
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20";
  if (state === "moderate")
    return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20";
  return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20";
}

function getScoreColor(score: number) {
  if (score >= 1) return "text-emerald-600 dark:text-emerald-400";
  if (score <= -1) return "text-rose-600 dark:text-rose-400";
  return "text-amber-600 dark:text-amber-400";
}

function barWidth(score: number, min: number, max: number) {
  const pct = ((score - min) / (max - min)) * 100;
  return `${Math.max(8, Math.min(100, pct))}%`;
}

function formatState(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildMetrics(risk: BalanceSheetRiskProps["risk"]) {
  return [
    {
      label: "Leverage",
      key: "leverage",
      score: risk.leverageScore,
      min: -2,
      max: 2,
      description: "Net Debt / EBITDA — measures how many years of earnings it takes to repay all debt.",
      measures: "Structural leverage. Lower is better.",
      thresholds: [
        { range: "< 1×", score: "+2" },
        { range: "1 – 2×", score: "+1" },
        { range: "2 – 3×", score: "0" },
        { range: "3 – 4×", score: "-1" },
        { range: "> 4×", score: "-2" },
      ],
    },
    {
      label: "Coverage",
      key: "coverage",
      score: risk.coverageScore,
      min: -2,
      max: 2,
      description: "Operating Income / Interest Expense. Measures debt servicing ability.",
      measures: "Comfortably pay interest obligations even if profits dip.",
      thresholds: [
        { range: "> 10×", score: "+2" },
        { range: "5 – 10×", score: "+1" },
        { range: "2 – 5×", score: "0" },
        { range: "1 – 2×", score: "-1" },
        { range: "< 1×", score: "-2" },
      ],
    },
    {
      label: "Liquidity",
      key: "liquidity",
      score: risk.liquidityScore,
      min: -1,
      max: 2,
      description: "Current Assets / Current Liabilities. Short-term solvency indicator.",
      measures: "Ratio > 1 means assets exceed immediate liabilities.",
      thresholds: [
        { range: "> 1.5", score: "+2" },
        { range: "1.1 – 1.5", score: "+1" },
        { range: "0.8 – 1.1", score: "0" },
        { range: "< 0.8", score: "-1" },
      ],
    },
    {
      label: "Debt Trend",
      key: "debtTrend",
      score: risk.debtTrendScore,
      min: -1,
      max: 1,
      description: "Historical trend of leverage. Detects structural improvement.",
      measures: "Directional debt health. Net-cash companies are immune to noise.",
      thresholds: [
        { range: "Deleveraging", score: "+1" },
        { range: "Significant/Flat", score: "0" },
        { range: "De-cashing/Debt ↑", score: "-1" },
      ],
    },
  ];
}

export default function BalanceSheetRisk({ risk }: BalanceSheetRiskProps) {
  const metrics = buildMetrics(risk);
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="clean-card animate-entrance h-full">
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-brand" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Financial Health
            </span>
          </div>
          <h3 className="text-3xl font-display font-bold tracking-tight text-text-primary">
            Solvency Risk
          </h3>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className={`text-4xl font-display font-black tracking-tighter ${getScoreColor(risk.totalScore)}`}>
            {risk.totalScore > 0 ? `+${risk.totalScore}` : risk.totalScore}
          </span>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${getBadgeStyles(risk.state)}`}>
            {formatState(risk.state)}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {metrics.map((m) => {
          const isOpen = openKey === m.key;
          return (
            <div key={m.key}>
              <button
                onClick={() => setOpenKey(isOpen ? null : m.key)}
                className="w-full flex items-center gap-5 group"
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? "bg-brand/10 text-brand" : "text-text-muted group-hover:text-text-secondary"}`}>
                  <ChevronRight 
                    size={14} 
                    className={`transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} 
                  />
                </div>
                
                <span className="text-sm font-bold text-text-secondary min-w-[80px] text-left group-hover:text-text-primary transition-colors tracking-tight">
                  {m.label}
                </span>

                <div className="flex-1 h-2 bg-bg-main rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreColor(m.score).replace('text-', 'bg-')}`}
                    style={{ width: barWidth(m.score, m.min, m.max) }}
                  />
                </div>

                <span className={`text-sm font-bold min-w-[32px] text-right ${getScoreColor(m.score)}`}>
                  {m.score > 0 ? `+${m.score}` : m.score}
                </span>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[400px] opacity-100 mt-5" : "max-h-0 opacity-0"}`}>
                <div className="p-6 rounded-2xl bg-bg-main border border-border-subtle text-sm leading-relaxed ml-10">
                  <p className="text-text-secondary font-medium mb-3">{m.description}</p>
                  <p className="text-text-muted text-xs italic mb-5">{m.measures}</p>
                  <div className="grid grid-cols-2 gap-y-2 border-t border-border-subtle pt-5">
                    {m.thresholds.map((t, j) => {
                      const isActive = t.score === (m.score > 0 ? `+${m.score}` : String(m.score));
                      return (
                        <React.Fragment key={j}>
                          <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-text-primary" : "text-text-muted"}`}>{t.range}</span>
                          <span className={`text-right text-xs font-black ${isActive ? getScoreColor(m.score) : "text-text-muted"}`}>{t.score}</span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
