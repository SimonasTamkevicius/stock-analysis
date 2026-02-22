"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, ChevronRight } from "lucide-react";

const RANGES = [
  { label: "1Y", value: "4" },
  { label: "3Y", value: "12" },
  { label: "5Y", value: "20" },
  { label: "MAX", value: "40" },
];

export default function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentWindow = searchParams.get("window") || "12";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const updateParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    // If we set custom dates, remove the preset window
    if (newParams.startDate || newParams.endDate) {
      params.delete("window");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePresetChange = (value: string) => {
    updateParams({ window: value, startDate: null, endDate: null });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Presets */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-text-muted" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
            Presets
          </span>
        </div>
        <div className="flex p-1.5 bg-bg-main border border-border-subtle rounded-xl">
          {RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handlePresetChange(range.value)}
              className={`flex-1 py-2 px-4 rounded-lg text-[11px] font-bold tracking-tight transition-all duration-300 ${
                currentWindow === range.value && !startDate && !endDate
                  ? "bg-brand text-white shadow-lg shadow-brand/20 scale-105"
                  : "text-text-muted hover:text-text-primary hover:bg-surface"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Granular Selectors */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
            Custom Range
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1">Start Date</span>
            <input
              type="month"
              value={startDate}
              onChange={(e) => updateParams({ startDate: e.target.value })}
              className="bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer shadow-sm hover:border-text-muted/20"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest px-1">End Date</span>
            <input
              type="month"
              value={endDate}
              onChange={(e) => updateParams({ endDate: e.target.value })}
              className="bg-surface border border-border-subtle rounded-lg px-4 py-2.5 text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer shadow-sm hover:border-text-muted/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
