"use client"

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendingUp, DollarSign } from "lucide-react";
import { calculateZScores } from "@/lib/helpers/math";

type Props = {
  dates: string[]; // monthly date strings
  evEBITDAMonthly: number[];
  fundamentalCompositeMonthly: number[];
  prices: number[];
  multipleLabel?: string;
};

type ChartDataPoint = {
  date: string;
  evEbitda: number;
  fundamental: number;
  price: number;
  // Z-score normalized values
  zEvEbitda: number;
  zFundamental: number;
  zPrice: number;
};

const ValuationLagChart: React.FC<Props> = ({
  dates, 
  evEBITDAMonthly,
  fundamentalCompositeMonthly,
  prices,
  multipleLabel = "EV / EBITDA",
}) => {
  const length = Math.min(
    dates.length,
    evEBITDAMonthly.length,
    fundamentalCompositeMonthly.length,
    prices.length
  );

  const zPrices = calculateZScores(prices);
  const zEvEbitda = calculateZScores(evEBITDAMonthly);
  const zFundamental = calculateZScores(fundamentalCompositeMonthly);

  const data: ChartDataPoint[] = [];

  for (let i = 0; i < length; i++) {
    data.push({
      date: dates[i],
      evEbitda: evEBITDAMonthly[i],
      fundamental: fundamentalCompositeMonthly[i],
      price: prices[i],
      zEvEbitda: zEvEbitda[i],
      zFundamental: zFundamental[i],
      zPrice: zPrices[i],
    });
  }

  const latest = data[data.length - 1];
  const bias = latest ? latest.zFundamental - latest.zEvEbitda : 0;

  const getVerdict = (b: number) => {
    if (b > 1.5) return { label: "Significant Undervaluation", tint: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    if (b > 0.5) return { label: "Modest Undervaluation", tint: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/10" };
    if (b < -1.5) return { label: "Significant Overvaluation", tint: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" };
    if (b < -0.5) return { label: "Modest Overvaluation", tint: "text-rose-500", bg: "bg-rose-500/5", border: "border-rose-500/10" };
    return { label: "Fair Value (Statistical)", tint: "text-text-primary", bg: "bg-bg-main", border: "border-border-subtle" };
  };

  const verdict = getVerdict(bias);

  return (
    <div className="clean-card animate-entrance">
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-brand" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              Valuation Statistics
            </span>
          </div>
          <h3 className="text-3xl font-display font-black tracking-tighter text-text-primary">
            Asset Dynamics
          </h3>
        </div>

        <div className={`px-4 py-2 rounded-2xl border ${verdict.bg} ${verdict.border} text-right`}>
          <span className="block text-[9px] font-black text-text-muted uppercase tracking-wider mb-0.5">Statistical Verdict</span>
          <span className={`text-sm font-black uppercase tracking-tight ${verdict.tint}`}>
            {verdict.label}
          </span>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-subtle" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => value.slice(0, 4)}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
              dy={15}
            />

            <YAxis
              orientation="left"
              domain={[-3.5, 3.5]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
              tickFormatter={(v) => v > 0 ? `+${v}σ` : `${v}σ`}
            />

            <Tooltip 
              contentStyle={{ 
                backgroundColor: "transparent", 
                borderColor: "var(--border-subtle)",
                borderRadius: "20px",
                padding: "16px",
                fontSize: "12px",
                boxShadow: "var(--card-shadow)"
              }}
              itemStyle={{ fontWeight: 700, color: "var(--text-primary)" }}
              labelStyle={{ color: "var(--text-muted)", fontWeight: 800, marginBottom: "8px", textTransform: "uppercase", fontSize: "10px" }}
              cursor={{ stroke: "var(--border-subtle)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
              formatter={(value: any, name?: string, props?: any) => {
                const { payload } = props;
                const numValue = Number(value);
                const sigma = isNaN(numValue) ? "N/A" : (numValue >= 0 ? `+${numValue.toFixed(1)}` : numValue.toFixed(1));
                
                if (name === "Price") {
                  const val = Number(payload.price);
                  return [isNaN(val) ? "--" : `$${val.toFixed(2)} (${sigma}σ)`, name];
                }
                if (name === multipleLabel) {
                  const val = Number(payload.evEbitda);
                  return [isNaN(val) ? "--" : `${val.toFixed(2)}x (${sigma}σ)`, name];
                }
                if (name === "Fundamentals") {
                  const val = Number(payload.fundamental);
                  return [isNaN(val) ? "--" : `${(val * 100).toFixed(1)}% (${sigma}σ)`, name];
                }
                return [value, name];
              }}
            />
            
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle" 
              wrapperStyle={{ paddingTop: 0, paddingBottom: 40, fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }} 
            />

            <ReferenceLine 
              y={0} 
              stroke="var(--text-muted)" 
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.2}
              label={{ value: 'PERIOD MEAN', position: 'right', fill: 'var(--text-muted)', fontSize: 9, fontWeight: 800 }} 
            />

            <Line
              type="monotone"
              dataKey="zPrice"
              stroke="var(--text-primary)"
              strokeWidth={2}
              strokeOpacity={0.6}
              dot={false}
              activeDot={{ r: 4, fill: "var(--text-primary)", strokeWidth: 0 }}
              name="Price"
              animationDuration={2000}
            />

            <Line
              type="monotone"
              dataKey="zEvEbitda"
              stroke="var(--color-brand)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "var(--color-brand)", strokeWidth: 0 }}
              name={multipleLabel}
              animationDuration={2000}
            />

            <Line
              type="monotone"
              dataKey="zFundamental"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
              name="Fundamentals"
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-12 p-6 bg-bg-main rounded-3xl border border-border-subtle group-hover:border-brand/20 transition-colors">
        <div className="flex gap-8 items-center">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <div className="flex items-center gap-2">
              <DollarSign size={12} className="text-text-muted" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Analysis</span>
            </div>
            <span className={`text-xl font-display font-black tracking-tight ${verdict.tint}`}>
              {Math.abs(bias).toFixed(1)}σ {bias > 0 ? 'Lag' : 'Lead'}
            </span>
          </div>
          <div className="w-px h-12 bg-border-subtle" />
          <p className="text-sm text-text-secondary leading-relaxed font-semibold">
            The market price is currently decoupled from fundamental progression by {Math.abs(bias).toFixed(2)} standard deviations. 
            {bias > 1.5 ? " This represents a severe statistical undervaluation relative to historical norms." : 
             bias < -1.5 ? " This represents a severe statistical overvaluation relative to historical norms." :
             " The divergence is within standard volatility bounds."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValuationLagChart;
