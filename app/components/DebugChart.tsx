"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { Info } from "lucide-react";

type DebugChartProps = {
  title: string;
  data: number[];
  type?: "line" | "bar";
  formatAsPercent?: boolean;
  color?: string;
  description?: string;
};

export default function DebugChart({
  title,
  data,
  type = "line",
  formatAsPercent = false,
  color = "var(--color-brand)",
  description,
}: DebugChartProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  // Map raw data array to objects for recharts
  const chartData = data.map((val, i) => ({
    index: i,
    label: `T-${data.length - 1 - i}`, // Reverse index label for easier reading 
    value: val,
  }));

  const fmt = (v: number) => {
    if (v === null || v === undefined || isNaN(v)) return "N/A";
    return formatAsPercent ? `${(v * 100).toFixed(2)}%` : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="clean-card p-6 flex flex-col group/chart">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              {title}
            </span>
            {description && (
              <button
                onClick={() => setInfoOpen(!infoOpen)}
                className="text-text-muted hover:text-brand transition-colors"
                title="Toggle description"
              >
                <Info size={14} />
              </button>
            )}
          </div>
           {/* Show latest value explicitly to help verify array endpoints */}
           {data.length > 0 && (
            <div className="text-xl font-display font-black tracking-tight" style={{ color }}>
              {fmt(data[data.length - 1])}
            </div>
          )}
        </div>
        <div className="text-[10px] font-bold text-text-muted bg-bg-main px-2 py-1 rounded-md border border-border-subtle">
           n={data.length}
        </div>
      </div>

      {description && (
         <div className={`overflow-hidden transition-all duration-300 ease-in-out ${infoOpen ? "max-h-40 opacity-100 mb-6" : "max-h-0 opacity-0"}`}>
          <div className="p-4 rounded-[16px] bg-bg-main border border-border-subtle text-xs">
            <p className="text-text-secondary leading-relaxed">{description}</p>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="h-[200px] w-full flex items-center justify-center border border-dashed border-border-subtle rounded-xl bg-bg-main/50">
          <span className="text-sm font-bold text-text-muted uppercase tracking-widest">No Data</span>
        </div>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-subtle" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
                  dy={10}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
                  tickFormatter={fmt}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "var(--surface)", 
                    borderColor: "var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "12px",
                    boxShadow: "var(--card-shadow)"
                  }}
                  itemStyle={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}
                  labelStyle={{ color: "var(--text-muted)", fontWeight: 800, marginBottom: "4px", textTransform: "uppercase", fontSize: "10px" }}
                  cursor={{ stroke: "var(--border-subtle)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                  formatter={(v: any) => [fmt(v), "Value"]}
                />
                <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="5 5" />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={color}
                  strokeWidth={2.5} 
                  dot={false}
                  activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
                  animationDuration={1000}
                />
              </LineChart>
            ) : (
               <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-subtle" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
                  dy={10}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
                  tickFormatter={fmt}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "var(--surface)", 
                    borderColor: "var(--border-subtle)",
                    borderRadius: "16px",
                    padding: "12px",
                    boxShadow: "var(--card-shadow)"
                  }}
                  itemStyle={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}
                  labelStyle={{ color: "var(--text-muted)", fontWeight: 800, marginBottom: "4px", textTransform: "uppercase", fontSize: "10px" }}
                  cursor={{ fill: "var(--border-subtle)", opacity: 0.4 }}
                  formatter={(v: any) => [fmt(v), "Value"]}
                />
                <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="5 5" />
                <Bar 
                  dataKey="value" 
                  fill={color}
                  radius={[4, 4, 4, 4]}
                  animationDuration={1000}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
