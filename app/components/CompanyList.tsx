"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

export default function CompanyList() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTickers(data);
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

  if (tickers.length === 0) {
    return (
        <div className="text-center py-10 text-text-muted">
            No companies found.
        </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {tickers.map((ticker) => (
        <Link
          key={ticker}
          href={`/company/${ticker}`}
          className="group flex items-center justify-between p-4 bg-surface border border-border-subtle rounded-xl hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300"
        >
          <span className="text-xl font-display font-black tracking-tight text-text-primary">
            {ticker}
          </span>
          <ArrowRight
            size={16}
            className="text-text-muted group-hover:text-brand group-hover:translate-x-1 transition-all"
          />
        </Link>
      ))}
    </div>
  );
}
