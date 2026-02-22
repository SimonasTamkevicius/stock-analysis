"use client";

import { getScoreColor, getBadgeStyles, formatState } from "@/lib/designUtils";

type TrajectoryOverviewProps = {
  ticker: string;
  total: { total: number; state: string };
  growth: { score: number; state: string };
  operatingMargin: { score: number; state: string };
  fcf: { score: number; state: string };
  capitalEfficiency: { score: number; state: string };
};

const pillarLabels: Record<string, string> = {
  growth: "Growth",
  operatingMargin: "Margins",
  fcf: "FCF",
  capitalEfficiency: "ROIC",
};

function PillarChip({ label, score }: { label: string; score: number }) {
  const isPos = score >= 1;
  const isNeg = score <= -1;

  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--border-hover)] transition-all">
      <span className={`score-display text-lg ${
        isPos ? "text-emerald-400" : isNeg ? "text-rose-400" : "text-text-secondary"
      }`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

export default function TrajectoryOverview({
  ticker,
  total,
  growth,
  operatingMargin,
  fcf,
  capitalEfficiency,
}: TrajectoryOverviewProps) {
  const pillars = { growth, operatingMargin, fcf, capitalEfficiency };
  const isPos = total.total >= 1;
  const isNeg = total.total <= -1;

  return (
    <div className="gradient-card p-4">
      <div className="relative z-10">
        {/* Header: label + total score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-brand animate-pulse" />
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Trajectory Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`score-display text-xl ${
              isPos ? "text-emerald-400" : isNeg ? "text-rose-400" : "text-text-secondary"
            }`}>
              {total.total > 0 ? `+${total.total}` : total.total}
            </span>
            <div className={`metric-pill ${getBadgeStyles(total.state)}`}>
              {formatState(total.state)}
            </div>
          </div>
        </div>

        {/* Pillar chips - 2x2 grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(pillars).map(([key, pillar]) => (
            <PillarChip key={key} label={pillarLabels[key] ?? key} score={pillar.score} />
          ))}
        </div>
      </div>
    </div>
  );
}
