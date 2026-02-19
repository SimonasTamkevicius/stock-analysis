"use client";

type TrajectoryOverviewProps = {
  ticker: string;
  total: { total: number; state: string };
  growth: { score: number; state: string };
  operatingMargin: { score: number; state: string };
  fcf: { score: number; state: string };
  capitalEfficiency: { score: number; state: string };
};

function getScoreColor(score: number) {
  if (score >= 1) return "text-emerald-500 dark:text-emerald-400";
  if (score <= -1) return "text-rose-500 dark:text-rose-400";
  return "text-text-muted";
}

function getBadgeStyles(state: string) {
  const s = state.toLowerCase();
  if (s.includes("compounder") || s.includes("positive") || s.includes("elite"))
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20";
  if (s.includes("deterioration") || s.includes("negative") || s.includes("weak"))
    return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20";
  return "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
}

function formatState(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const pillarLabels: Record<string, string> = {
  growth: "Growth",
  operatingMargin: "Margins",
  fcf: "Free Cash Flow",
  capitalEfficiency: "Cap. Efficiency",
};

export default function TrajectoryOverview({
  ticker,
  total,
  growth,
  operatingMargin,
  fcf,
  capitalEfficiency,
}: TrajectoryOverviewProps) {
  const pillars = { growth, operatingMargin, fcf, capitalEfficiency };

  return (
    <div className="clean-card mb-8">
      <div className="flex flex-col xl:flex-row xl:items-center gap-8">
        
        {/* Hero Section: Ticker & Total Score */}
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <h1 className="text-7xl font-display font-black tracking-tighter text-text-primary leading-none">
              {ticker}
            </h1>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full bg-brand" />
              <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">
                Trajectory Analysis
              </span>
            </div>
          </div>

          <div className="h-16 w-px bg-border-subtle hidden sm:block" />

          <div className="flex flex-col items-center min-w-[100px]">
            <div className={`text-6xl font-display font-black tracking-tighter ${getScoreColor(total.total)}`}>
              {total.total > 0 ? `+${total.total}` : total.total}
            </div>
            <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${getBadgeStyles(total.state)} whitespace-nowrap`}>
              {formatState(total.state)}
            </div>
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          {Object.entries(pillars).map(([key, pillar]) => (
            <div
              key={key}
              className="flex flex-col items-center justify-center p-5 rounded-2xl bg-bg-main border border-border-subtle transition-all hover:bg-surface group/pillar"
            >
              <div className={`text-3xl font-display font-black tracking-tighter mb-1 ${getScoreColor(pillar.score)}`}>
                {pillar.score > 0 ? `+${pillar.score}` : pillar.score}
              </div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest text-center">
                {pillarLabels[key] ?? key}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
