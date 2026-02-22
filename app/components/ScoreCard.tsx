"use client";

import { getScoreColor, getBadgeStyles, formatState } from "@/lib/designUtils";

type ScoreCardProps = {
  title: string;
  score: number;
  state: string;
  metrics?: { label: string; value: string }[];
};

export default function ScoreCard({
  title,
  score,
  state,
  metrics,
}: ScoreCardProps) {
  return (
    <div className="clean-card p-6 flex flex-col h-full group">
      <div className="text-[10px] font-black text-text-muted mb-6 tracking-[0.2em] uppercase">
        {title}
      </div>
      
      <div className="flex items-baseline gap-4 mb-8">
        <div className={`text-6xl font-display font-black tracking-tighter ${getScoreColor(score)}`}>
          {score > 0 ? `+${score}` : score}
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getBadgeStyles(state)}`}>
          {formatState(state)}
        </div>
      </div>

      {metrics && metrics.length > 0 && (
        <div className="mt-auto space-y-4 pt-6 border-t border-border-subtle">
          {metrics.map((m, i) => (
            <div className="flex justify-between items-center group/metric" key={i}>
              <span className="text-xs font-semibold text-text-muted group-hover/metric:text-text-secondary transition-colors">
                {m.label}
              </span>
              <span className="text-sm font-bold text-text-secondary group-hover/metric:text-brand transition-colors">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
