"use client";

import React, { useState } from "react";
import { ChevronRight, Activity } from "lucide-react";
import { getScoreColor, getBadgeStyles, formatState } from "@/lib/designUtils";

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

function buildMetrics(risk: BalanceSheetRiskProps["risk"]) {
  return [
    {
      label: "Leverage",
      key: "leverage",
      score: risk.leverageScore,
      min: -2,
      max: 2,
      description: "Net Debt / EBITDA — measures how many years of earnings it takes to repay all debt.",
      thresholds: [
        { range: "< 1×", score: "+2" },
        { range: "1–2×", score: "+1" },
        { range: "2–3×", score: "0" },
        { range: "3–4×", score: "-1" },
        { range: "> 4×", score: "-2" },
      ],
    },
    {
      label: "Coverage",
      key: "coverage",
      score: risk.coverageScore,
      min: -2,
      max: 2,
      description: "Operating Income / Interest Expense — debt servicing ability.",
      thresholds: [
        { range: "> 10×", score: "+2" },
        { range: "5–10×", score: "+1" },
        { range: "2–5×", score: "0" },
        { range: "1–2×", score: "-1" },
        { range: "< 1×", score: "-2" },
      ],
    },
    {
      label: "Liquidity",
      key: "liquidity",
      score: risk.liquidityScore,
      min: -1,
      max: 2,
      description: "Current Assets / Current Liabilities — short-term solvency.",
      thresholds: [
        { range: "> 1.5", score: "+2" },
        { range: "1.1–1.5", score: "+1" },
        { range: "0.8–1.1", score: "0" },
        { range: "< 0.8", score: "-1" },
      ],
    },
    {
      label: "Debt Trend",
      key: "debtTrend",
      score: risk.debtTrendScore,
      min: -1,
      max: 1,
      description: "Historical direction of leverage. Detects structural improvement.",
      thresholds: [
        { range: "Deleveraging", score: "+1" },
        { range: "Flat", score: "0" },
        { range: "Leveraging", score: "-1" },
      ],
    },
  ];
}

function SegmentedGauge({ score, min, max }: { score: number; min: number; max: number }) {
  const range = max - min;
  const segments = range + 1;
  const activeIdx = score - min;

  return (
    <div className="flex gap-0.5 h-1.5 w-20">
      {Array.from({ length: segments }).map((_, i) => {
        const isActive = i <= activeIdx;
        const ratio = i / (segments - 1);
        const color = ratio < 0.3 ? "bg-rose-400" : ratio > 0.7 ? "bg-emerald-400" : "bg-amber-400";
        return (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-500 ${
              isActive ? color : "bg-[var(--border-subtle)]"
            }`}
          />
        );
      })}
    </div>
  );
}

export default function BalanceSheetRisk({ risk }: BalanceSheetRiskProps) {
  const metrics = buildMetrics(risk);
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="clean-card p-6 animate-entrance h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="section-label flex items-center gap-2 mb-2">
            <Activity size={12} />
            <span>Financial Health</span>
          </div>
          <h3 className="text-xl font-display font-black tracking-tight text-text-primary">
            Solvency Risk
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`score-display text-3xl ${getScoreColor(risk.totalScore)}`}>
            {risk.totalScore > 0 ? `+${risk.totalScore}` : risk.totalScore}
          </span>
          <div className={`metric-pill ${getBadgeStyles(risk.state)}`}>
            {formatState(risk.state)}
          </div>
        </div>
      </div>

      {/* Metric rows with segmented gauges */}
      <div className="space-y-1">
        {metrics.map((m) => {
          const isOpen = openKey === m.key;
          return (
            <div key={m.key}>
              <button
                onClick={() => setOpenKey(isOpen ? null : m.key)}
                className="w-full flex items-center justify-between py-3 px-3 -mx-3 rounded-xl hover:bg-[var(--surface-raised)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                    isOpen ? "bg-brand text-white" : "bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-text-muted"
                  }`}>
                    <ChevronRight size={10} className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                  <span className="text-sm font-semibold text-text-secondary group-hover:text-text-primary transition-colors">
                    {m.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <SegmentedGauge score={m.score} min={m.min} max={m.max} />
                  <span className={`text-sm font-mono font-bold min-w-[28px] text-right ${getScoreColor(m.score)}`}>
                    {m.score > 0 ? `+${m.score}` : m.score}
                  </span>
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-[300px] opacity-100 mb-3" : "max-h-0 opacity-0"}`}>
                <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-sm ml-8">
                  <p className="text-text-secondary text-xs leading-relaxed mb-4">{m.description}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {m.thresholds.map((t, j) => (
                      <React.Fragment key={j}>
                        <span className="text-[10px] font-bold text-text-muted py-1">{t.range}</span>
                        <span className="text-[10px] font-mono font-bold text-text-secondary text-right py-1">{t.score}</span>
                      </React.Fragment>
                    ))}
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
