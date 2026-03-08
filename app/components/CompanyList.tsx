"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import VersoLoader from "./VersoLoader";

interface CompanyPreview {
  ticker: string;
  score: number;
  signal: string;
  companyName: string;
  currentPrice: number;
  trailingChange: number;
  historicalPrices: number[];
}

// Generate the SVG path for the area chart
const generateSVGPath = (prices: number[], width = 200, height = 64) => {
  if (!prices || prices.length < 2) return "";
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1; // prevent div by zero
  
  // padding so line doesn't hit absolute top/bottom
  const paddedMin = min - (range * 0.1); 
  const paddedMax = max + (range * 0.1);
  const paddedRange = paddedMax - paddedMin || 1;

  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((price - paddedMin) / paddedRange) * height;
    return `${x},${y}`;
  });

  // Start at bottom left, line up to points, then down to bottom right to close the area
  return `M0,${height} L${points.join(" L")} L${width},${height} Z`;
};

export default function CompanyList() {
  const [companies, setCompanies] = useState<CompanyPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch function that can be called on mount and on "Load More"
  const fetchCompanies = async (currentPage: number) => {
    try {
      if (currentPage === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await fetch(`/api/companies?page=${currentPage}&limit=12`);
      const payload = await res.json();
      
      if (payload && payload.data) {
        if (currentPage === 1) {
          setCompanies(payload.data);
        } else {
          setCompanies(prev => [...prev, ...payload.data]);
        }
        setHasMore(payload.hasMore);
      } else if (Array.isArray(payload)) {
        // Fallback if API hasn't fully updated yet or still responding with array
        setCompanies(payload);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (currentPage === 1) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCompanies(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCompanies(nextPage);
  };

  if (loading) return <VersoLoader />;

  if (companies.length === 0) {
    return (
      <div className="text-center py-16 text-muted text-sm font-bold">
        No companies found. Use the search to add one.
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => {
          const isUp = company.trailingChange >= 0;
          
          // Match the design: Up = Primary (Slate), Down = Secondary (Rosewood)
          const chartGradientFrom = isUp ? "var(--primary)" : "var(--secondary)";
          const chartGradientTo = isUp ? "var(--primary)" : "var(--secondary)";
          const gradientId = `fade-${company.ticker}`;
          const path = generateSVGPath(company.historicalPrices);

          return (
            <Link
              key={company.ticker}
              href={`/company/${company.ticker}`}
              className="group bg-card p-8 rounded-[2.5rem] border-muted-foreground shadow-sm hover:shadow-md hover:border-gray-800 transition-all flex flex-col justify-between h-64 relative overflow-hidden"
            >
              {/* Top row */}
              <div className="flex justify-between items-start z-10 relative">
                <div>
                  <h3 className="text-4xl font-black text-foreground tracking-tighter group-hover:scale-105 transition-transform origin-left">
                    {company.ticker}
                  </h3>
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mt-1">
                    {company.companyName}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end justify-start">
                  <div className="bg-foreground text-background px-3 py-1 rounded-2xl shadow-sm">
                    <p className="text-2xl font-black tracking-tight leading-none">
                      {(company.score * 100).toFixed(0)}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-2">
                    Verso Score
                  </p>
                </div>
              </div>

              {/* Area Chart Background */}
              <div className="absolute bottom-8 left-8 right-8 h-20 opacity-80 group-hover:opacity-100 transition-opacity overflow-hidden rounded-xl">
                <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 200 64">
                  <defs>
                    {/* Foggy horizontal gradient: Faded edges, solid center */}
                    <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={chartGradientFrom} stopOpacity={0.05} />
                      <stop offset="25%" stopColor={chartGradientFrom} stopOpacity={0.4} />
                      <stop offset="50%" stopColor={chartGradientFrom} stopOpacity={0.8} />
                      <stop offset="75%" stopColor={chartGradientFrom} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={chartGradientTo} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  {path && (
                    <path
                      d={path}
                      fill={`url(#${gradientId})`}
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination / Load More */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="bg-card border border-border text-foreground hover:bg-muted/10 font-bold tracking-tight uppercase px-8 py-3 rounded-full shadow-sm hover:shadow-md transition-all text-xs disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
