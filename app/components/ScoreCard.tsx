"use client";

type ScoreCardProps = {
  title: string;
  score: number;
  state: string;
  metrics?: { label: string; value: string }[];
};

function getBadgeStyles(state: string) {
  const s = state.toLowerCase();
  const isPositive = 
    s.includes("accel") ||
    s.includes("expan") ||
    s.includes("improv") ||
    s.includes("inflect") ||
    s.includes("elite") ||
    s.includes("strong") ||
    s.includes("compounder") ||
    s.includes("positive") ||
    s.includes("low-risk");
  
  const isNegative =
    s.includes("decel") ||
    s.includes("compress") ||
    s.includes("deterior") ||
    s.includes("weak") ||
    s.includes("negative") ||
    s.includes("high-risk");

  if (isPositive) return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20";
  if (isNegative) return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20";
  return "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
}

function formatState(state: string) {
  return state
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ScoreCard({
  title,
  score,
  state,
  metrics,
}: ScoreCardProps) {
  return (
    <div className="clean-card flex flex-col h-full group">
      <div className="text-[10px] font-black text-text-muted mb-6 tracking-[0.2em] uppercase">
        {title}
      </div>
      
      <div className="flex items-baseline gap-4 mb-8">
        <div className={`text-6xl font-display font-black tracking-tighter ${
          score >= 1 ? "text-emerald-500 dark:text-emerald-400" : score <= -1 ? "text-rose-500 dark:text-rose-400" : "text-text-primary"
        }`}>
          {score > 0 ? `+${score}` : score}
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm ${getBadgeStyles(state)}`}>
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
