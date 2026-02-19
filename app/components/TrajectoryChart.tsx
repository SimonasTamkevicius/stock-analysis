"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

type TrajectoryChartProps = {
  title: string;
  windowValues: number[];
  regressionLine: number[];
  formatAsPercent?: boolean;
  score?: number;
  state?: string;
};

function getScoreColor(score: number) {
  if (score >= 1) return "text-brand";
  if (score <= -1) return "text-rose-600";
  return "text-slate-400";
}

function formatState(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const chartDescriptors: Record<string, any> = {
  "Growth Momentum": {
    description: "Measures whether revenue growth is accelerating or decelerating using a regression slope.",
    measures: "Directional trend, independent of quarterly volatility.",
    scoreRange: [-2, 2],
  },
  "Operating Margins": {
    description: "Determines if margins are expanding, stable, or compressing over the trailing window.",
    measures: "Indicator of pricing power and operational cost discipline.",
    scoreRange: [-1, 1],
  },
  "FCF Trajectory": {
    description: "Evaluates cash generation trends, specifically rewarding durrable positive inflections.",
    measures: "Differentiates between stable cash flow and structural improvements.",
    scoreRange: [-1, 2],
  },
  "Capital Efficiency": {
    description: "Incremental return on operating profit per unit of additional invested capital.",
    measures: "Signals improving or degrading quality of internal capital allocation.",
    scoreRange: [-1, 1],
  },
};

export default function TrajectoryChart({
  title,
  windowValues,
  regressionLine,
  formatAsPercent = true,
  score,
  state,
}: TrajectoryChartProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const info = chartDescriptors[title];

  const data = windowValues.map((value, i) => ({
    quarter: `Q${i + 1}`,
    value,
    trend: regressionLine[i],
  }));

  const fmt = (v: number) =>
    formatAsPercent ? `${(v * 100).toFixed(1)}%` : v.toFixed(3);

  return (
    <div className="clean-card flex flex-col group/chart">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              {title}
            </span>
            <button 
              onClick={() => setInfoOpen(!infoOpen)}
              className="text-text-muted hover:text-brand transition-colors"
            >
              <Info size={14} />
            </button>
          </div>
          {score !== undefined && state && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-3xl font-display font-black tracking-tighter ${getScoreColor(score)}`}>
                {score > 0 ? `+${score}` : score}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-border-subtle bg-bg-main text-text-muted`}>
                {formatState(state)}
              </span>
            </div>
          )}
        </div>
      </div>

      {info && (
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${infoOpen ? "max-h-40 opacity-100 mb-8" : "max-h-0 opacity-0"}`}>
          <div className="p-5 rounded-[20px] bg-bg-main border border-border-subtle text-sm">
            <p className="text-text-secondary font-medium leading-relaxed mb-2">{info.description}</p>
            <p className="text-text-muted text-xs italic">{info.measures}</p>
          </div>
        </div>
      )}

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-subtle" vertical={false} />
            <XAxis 
              dataKey="quarter" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
              tickFormatter={(v) => formatAsPercent ? `${(v * 100).toFixed(0)}%` : v.toFixed(1)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "var(--surface)", 
                borderColor: "var(--border-subtle)",
                borderRadius: "20px",
                padding: "12px",
                fontSize: "12px",
                boxShadow: "var(--card-shadow)"
              }}
              itemStyle={{ color: "var(--text-primary)", fontWeight: 700 }}
              labelStyle={{ color: "var(--text-muted)", fontWeight: 800, marginBottom: "4px", textTransform: "uppercase", fontSize: "10px" }}
              cursor={{ stroke: "var(--color-brand)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
              formatter={(v: any) => [fmt(v), "Value"]}
            />
            <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="5 5" />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="var(--text-primary)" 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 5, fill: "var(--text-primary)", strokeWidth: 0 }}
              animationDuration={1500}
              zIndex={5}
            />
            <Line 
              type="monotone" 
              dataKey="trend" 
              stroke="var(--color-brand)" 
              strokeWidth={2.5} 
              strokeDasharray="4 4" 
              dot={false}
              animationDuration={1500}
              zIndex={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
