"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import VersoLoader from "./VersoLoader";

interface CompanyPreview {
  ticker: string;
  score: number;
  signal: string;
}

function getSignalConfig(signal: string) {
  if (signal === "strong_buy")
    return { label: "Strong Buy", color: "text-emerald-400", dot: "bg-emerald-400", border: "hover:border-emerald-500/30" };
  if (signal === "buy")
    return { label: "Buy", color: "text-emerald-400/70", dot: "bg-emerald-400/70", border: "hover:border-emerald-500/20" };
  if (signal === "avoid")
    return { label: "Avoid", color: "text-rose-400", dot: "bg-rose-400", border: "hover:border-rose-500/30" };
  return { label: "Neutral", color: "text-text-muted", dot: "bg-text-muted", border: "hover:border-[var(--border-hover)]" };
}

export default function CompanyList() {
  const [companies, setCompanies] = useState<CompanyPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCompanies(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <VersoLoader />;

  if (companies.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">
        No companies found. Use the search above to add one.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {companies.map((company) => {
        const config = getSignalConfig(company.signal);

        return (
          <Link
            key={company.ticker}
            href={`/company/${company.ticker}`}
            className={`group relative flex flex-col gap-3 p-5 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-2xl ${config.border} hover:shadow-lg transition-all duration-300`}
          >
            {/* Top row: ticker + arrow */}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-display font-black tracking-tight text-text-primary">
                {company.ticker}
              </span>
              <ArrowUpRight
                size={16}
                className="text-text-muted group-hover:text-brand group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
              />
            </div>

            {/* Bottom row: signal + score */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                <span className={`text-[11px] font-bold ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-text-secondary bg-[var(--surface-raised)] px-2 py-0.5 rounded-md border border-[var(--border-subtle)]">
                {(company.score * 100).toFixed(0)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
