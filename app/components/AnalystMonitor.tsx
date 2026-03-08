"use client";

import { CompanyOverview } from "@/types/financials";

export default function AnalystMonitor({ companyOverview }: { companyOverview: CompanyOverview }) {
  if (!companyOverview) {
    return (
      <div className="animate-entrance p-10 border border-[var(--border-subtle)] rounded-lg text-center mt-4">
        <h2 className="text-xl font-bold text-text-primary">Analysts Coverage</h2>
        <p className="text-text-muted mt-2">Information about analyst ratings and price targets will be added here in the future.</p>
      </div>
    );
  }

  const ratings = [
    { label: "Strong Buy", count: parseInt(companyOverview.AnalystRatingStrongBuy) || 0, color: "bg-emerald-500" },
    { label: "Buy", count: parseInt(companyOverview.AnalystRatingBuy) || 0, color: "bg-emerald-400" },
    { label: "Hold", count: parseInt(companyOverview.AnalystRatingHold) || 0, color: "bg-yellow-400" },
    { label: "Sell", count: parseInt(companyOverview.AnalystRatingSell) || 0, color: "bg-orange-400" },
    { label: "Strong Sell", count: parseInt(companyOverview.AnalystRatingStrongSell) || 0, color: "bg-rose-500" },
  ];

  const totalAnalysts = ratings.reduce((sum, r) => sum + r.count, 0);
  const targetPrice = parseFloat(companyOverview.AnalystTargetPrice);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-entrance">
      <div className="p-6 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
        <h2 className="text-lg font-display font-black tracking-tight text-text-primary mb-4">Analyst Target Price</h2>
        {targetPrice ? (
          <div className="flex flex-col gap-2">
            <div className="text-5xl font-display font-black tracking-tight text-text-primary">
              ${targetPrice.toFixed(2)}
            </div>
            <p className="text-sm font-medium text-text-muted mt-2.5">Wall Street Consensus Target</p>
          </div>
        ) : (
          <div className="text-text-muted text-sm font-medium">No target price available</div>
        )}
      </div>

      <div className="p-6 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl shadow-sm">
        <h2 className="text-lg font-display font-black tracking-tight text-text-primary mb-4">Analyst Ratings ({totalAnalysts})</h2>
        {totalAnalysts > 0 ? (
          <div className="space-y-3">
            {ratings.map((rating) => (
              <div key={rating.label} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium text-text-secondary">{rating.label}</span>
                <div className="flex-1 h-2 bg-[var(--surface-raised)] rounded-full overflow-hidden flex border border-[var(--border-subtle)]">
                  <div 
                    className={`h-full ${rating.color}`} 
                    style={{ width: totalAnalysts > 0 ? `${(rating.count / totalAnalysts) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold text-text-primary">{rating.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-text-muted text-sm font-medium">No analyst ratings available</div>
        )}
      </div>
    </div>
  );
}
