"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

interface CompanyPreview {
  ticker: string;
  score: number;
  signal: string;
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

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-10 text-text-muted">
        No companies found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {companies.map((company) => {
        let signalColor = "text-text-muted";
        let signalBg = "bg-transparent border-border-subtle";
        
        if (company.signal === "strong_buy") {
          signalColor = "text-emerald-500";
          signalBg = "bg-emerald-500/10 border-emerald-500/20";
        } else if (company.signal === "buy") {
          signalColor = "text-emerald-400";
          signalBg = "bg-emerald-400/10 border-emerald-400/20";
        } else if (company.signal === "avoid") {
          signalColor = "text-rose-500";
          signalBg = "bg-rose-500/10 border-rose-500/20";
        }

        return (
          <Link
            key={company.ticker}
            href={`/company/${company.ticker}`}
            className="group flex items-center justify-between p-4 bg-surface border border-border-subtle rounded-xl hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl font-display font-black tracking-tight text-text-primary">
                {company.ticker}
              </span>
              <div
                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${signalBg} ${signalColor}`}
              >
                {(company.score * 100).toFixed(0)}
              </div>
            </div>
            <ArrowRight
              size={16}
              className="text-text-muted group-hover:text-brand group-hover:translate-x-1 transition-all"
            />
          </Link>
        );
      })}
    </div>
  );
}
