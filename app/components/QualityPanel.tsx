"use client";

import React, { useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { getScoreColor, getBadgeStyles, getMetricColor, pct } from "@/lib/designUtils";

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

function buildMetrics(q: QualityPanelProps["quality"]) {
  return [
    {
      label: "Avg ROIC",
      key: "roic",
      value: pct(q.avgROIC),
      rawValue: q.avgROIC,
      color: getMetricColor(q.avgROIC, 0.15, 0.08),
      description: "Return on Invested Capital average over the trailing window.",
      thresholds: [
        { range: "> 20%", score: "+2" },
        { range: "15–20%", score: "+1" },
        { range: "8–15%", score: "0" },
        { range: "< 8%", score: "-1" },
      ],
    },
    {
      label: "Avg FCF Margin",
      key: "fcfMargin",
      value: pct(q.avgFCFMargin),
      rawValue: q.avgFCFMargin,
      color: getMetricColor(q.avgFCFMargin, 0.15, 0.05),
      description: "Free Cash Flow / Revenue average over the trailing window.",
      thresholds: [
        { range: "> 25%", score: "+2" },
        { range: "15–25%", score: "+1" },
        { range: "5–15%", score: "0" },
        { range: "< 5%", score: "-1" },
      ],
    },
    {
      label: "Growth Vol.",
      key: "growthVol",
      value: pct(q.growthVolatility),
      rawValue: q.growthVolatility,
      color: getMetricColor(q.growthVolatility, 0.05, 0.2, true),
      description: "Consistency of revenue growth across the window.",
      thresholds: [
        { range: "< 5%", score: "+1" },
        { range: "5–20%", score: "0" },
        { range: "> 20%", score: "-1" },
      ],
    },
    {
      label: "Margin Vol.",
      key: "marginVol",
      value: pct(q.marginVolatility),
      rawValue: q.marginVolatility,
      color: getMetricColor(q.marginVolatility, 0.03, 0.1, true),
      description: "Quarter-to-quarter fluctuation in operating margins.",
      thresholds: [
        { range: "< 3%", score: "+1" },
        { range: "3–10%", score: "0" },
        { range: "> 10%", score: "-1" },
      ],
    },
  ];
}

export default function QualityPanel({ quality }: QualityPanelProps) {
  const metrics = buildMetrics(quality);
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="clean-card p-6 animate-entrance h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="section-label flex items-center gap-2 mb-2">
            <ShieldCheck size={12} />
            <span>Structural Quality</span>
          </div>
          <h3 className="text-xl font-display font-black tracking-tight text-text-primary">
            Durable Efficiency
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`score-display text-3xl ${getScoreColor(quality.score)}`}>
            {quality.score > 0 ? `+${quality.score}` : quality.score}
          </span>
          <div className={`metric-pill ${getBadgeStyles(quality.state)}`}>
            {quality.state}
          </div>
        </div>
      </div>

      {/* Metric rows */}
      <div className="space-y-0.5">
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
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${m.color.replace("text-", "bg-")}`} />
                  <span className={`text-sm font-mono font-bold ${m.color}`}>{m.value}</span>
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
