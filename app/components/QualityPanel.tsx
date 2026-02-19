"use client";

import React, { useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";

type QualityPanelProps = {
  quality: {
    avgROIC: number;
    avgFCFMargin: number;
    growthVolatility: number;
    marginVolatility: number;
    score: number;
    state: string;
  };
};

function getScoreColor(score: number) {
  if (score >= 1) return "text-emerald-500 dark:text-emerald-400";
  if (score <= -1) return "text-rose-500 dark:text-rose-400";
  return "text-text-muted";
}

function getBadgeStyles(state: string) {
  const s = state.toLowerCase();
  if (s === "elite" || s === "strong")
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20";
  if (s === "weak")
    return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20";
  return "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function metricColor(
  v: number,
  goodThreshold: number,
  badThreshold: number,
  lowerIsBetter = false
) {
  if (lowerIsBetter) {
    if (v < goodThreshold) return "text-emerald-600 dark:text-emerald-400";
    if (v > badThreshold) return "text-rose-600 dark:text-rose-400";
    return "text-amber-600 dark:text-amber-400";
  }
  if (v > goodThreshold) return "text-emerald-600 dark:text-emerald-400";
  if (v < badThreshold) return "text-rose-600 dark:text-rose-400";
  return "text-amber-600 dark:text-amber-400";
}

function buildMetrics(q: QualityPanelProps["quality"]) {
  return [
    {
      label: "Avg ROIC",
      key: "roic",
      value: pct(q.avgROIC),
      color: metricColor(q.avgROIC, 0.15, 0.08),
      description: "Return on Invested Capital average over the trailing window.",
      measures: "ROIC > 15% generally signals a durable competitive advantage.",
      thresholds: [
        { range: "> 20%", score: "+2" },
        { range: "15% - 20%", score: "+1" },
        { range: "8% - 15%", score: "0" },
        { range: "< 8%", score: "-1" },
      ],
    },
    {
      label: "Avg FCF Margin",
      key: "fcfMargin",
      value: pct(q.avgFCFMargin),
      color: metricColor(q.avgFCFMargin, 0.15, 0.05),
      description: "Free Cash Flow / Revenue average over the trailing window.",
      measures: "High FCF margins indicate strong cash conversion power.",
      thresholds: [
        { range: "> 25%", score: "+2" },
        { range: "15% - 25%", score: "+1" },
        { range: "5% - 15%", score: "0" },
        { range: "< 5%", score: "-1" },
      ],
    },
    {
      label: "Growth Volatility",
      key: "growthVol",
      value: pct(q.growthVolatility),
      color: metricColor(q.growthVolatility, 0.05, 0.2, true),
      description: "Consistency of revenue growth across the window.",
      measures: "Low volatility suggests a recurring, stable demand base.",
      thresholds: [
        { range: "< 5%", score: "+1" },
        { range: "5% - 20%", score: "0" },
        { range: "> 20%", score: "-1" },
      ],
    },
    {
      label: "Margin Volatility",
      key: "marginVol",
      value: pct(q.marginVolatility),
      color: metricColor(q.marginVolatility, 0.03, 0.1, true),
      description: "Quarter-to-quarter fluctuation in operating margins.",
      measures: "Stability indicates strong cost control and pricing power.",
      thresholds: [
        { range: "< 3%", score: "+1" },
        { range: "3% - 10%", score: "0" },
        { range: "> 10%", score: "-1" },
      ],
    },
  ];
}

export default function QualityPanel({ quality }: QualityPanelProps) {
  const metrics = buildMetrics(quality);
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="clean-card animate-entrance h-full">
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Structural Quality
            </span>
          </div>
          <h3 className="text-3xl font-display font-bold tracking-tight text-text-primary">
            Durable Efficiency
          </h3>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className={`text-4xl font-display font-black tracking-tighter ${getScoreColor(quality.score)}`}>
            {quality.score > 0 ? `+${quality.score}` : quality.score}
          </span>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${getBadgeStyles(quality.state)}`}>
            {quality.state}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {metrics.map((m, i) => {
          const isOpen = openKey === m.key;
          return (
            <div key={m.key} className="border-b border-border-subtle last:border-0">
              <button
                onClick={() => setOpenKey(isOpen ? null : m.key)}
                className="w-full flex justify-between items-center py-5 transition-all px-3 -mx-3 rounded-2xl group hover:bg-bg-main"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl transition-colors ${isOpen ? "bg-brand text-white" : "bg-bg-main text-text-muted group-hover:bg-brand/10 group-hover:text-brand"}`}>
                    <ChevronRight 
                      size={14} 
                      className={`transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} 
                    />
                  </div>
                  <span className="text-sm font-bold text-text-secondary group-hover:text-text-primary transition-colors tracking-tight">
                    {m.label}
                  </span>
                </div>
                <span className={`text-base font-bold ${m.color}`}>
                  {m.value}
                </span>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[400px] opacity-100 mb-6" : "max-h-0 opacity-0"}`}>
                <div className="p-6 rounded-2xl bg-bg-main border border-border-subtle text-sm leading-relaxed ml-12">
                  <p className="text-text-secondary font-medium mb-2">{m.description}</p>
                  <p className="text-text-muted text-xs italic mb-6">{m.measures}</p>
                  <div className="grid grid-cols-2 gap-y-2 border-t border-border-subtle pt-5">
                    {m.thresholds.map((t, j) => (
                      <React.Fragment key={j}>
                        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{t.range}</span>
                        <span className="text-right text-xs font-black text-text-primary">{t.score}</span>
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
