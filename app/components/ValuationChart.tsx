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
import { calculateZScores, rollingZScore } from "@/lib/helpers/math";
import { detectResidualBottoms, rollingRegressionResiduals } from "@/lib/helpers/valLagHelper";

type Props = {
  dates: string[];
  evEBITDAMonthly: number[];
  fundamentalCompositeMonthly: number[];
  prices: number[];
  multipleLabel?: string;
  windowSize: number;
};

type ChartDataPoint = {
  date: string;
  evEbitda: number;
  fundamental: number;
  price: number;
  zPrice: number;
  zLogMultiple: number;
  zFundamental: number;
  zResidual: number;
  bottomSignal: boolean;
};


const ValuationLagChart: React.FC<Props> = ({
  dates,
  evEBITDAMonthly,
  fundamentalCompositeMonthly,
  prices,
  multipleLabel = "EV / EBITDA",
  windowSize,
}) => {

  const length = Math.min(
    dates.length,
    evEBITDAMonthly.length,
    fundamentalCompositeMonthly.length,
    prices.length
  );

  // Log transform multiple
  const logMultiple = evEBITDAMonthly.map((m) =>
    m > 0 && Number.isFinite(m) ? Math.log(m) : NaN
  );

  // Z-scores (levels)
  const zPrices = calculateZScores(prices);
  const zLogMultiple = calculateZScores(logMultiple);
  const zFundamental = calculateZScores(fundamentalCompositeMonthly);

  // Regression residuals
  const residuals = rollingRegressionResiduals(
    fundamentalCompositeMonthly,
    logMultiple,
    windowSize
  );

  const zResidual = rollingZScore(residuals, windowSize);
  const bottomSignal = detectResidualBottoms(zResidual);

  const data: ChartDataPoint[] = [];

  for (let i = 0; i < length; i++) {
    data.push({
      date: dates[i],
      evEbitda: evEBITDAMonthly[i],
      fundamental: fundamentalCompositeMonthly[i],
      price: prices[i],
      zPrice: zPrices[i],
      zLogMultiple: zLogMultiple[i],
      zFundamental: zFundamental[i],
      zResidual: zResidual[i],
      bottomSignal: bottomSignal[i],
    });
  }

  const latest = data[data.length - 1];
  const bias = latest?.zResidual ?? 0;

  const getVerdict = (b: number) => {
    if (b < -1.5)
      return {
        label: "Significant Undervaluation",
        tint: "text-emerald-500",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
      };
    if (b < -0.5)
      return {
        label: "Modest Undervaluation",
        tint: "text-emerald-500",
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/10",
      };
    if (b > 1.5)
      return {
        label: "Significant Overvaluation",
        tint: "text-rose-500",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
      };
    if (b > 0.5)
      return {
        label: "Modest Overvaluation",
        tint: "text-rose-500",
        bg: "bg-rose-500/5",
        border: "border-rose-500/10",
      };
    return {
      label: "Fair Value (Statistical)",
      tint: "text-text-primary",
      bg: "bg-bg-main",
      border: "border-border-subtle",
    };
  };

  const verdict = getVerdict(bias);

  return (
    <div className="clean-card p-6 animate-entrance">
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col gap-1">
          <div className="section-label flex items-center gap-2 mb-2">
            <TrendingUp size={12} />
            <span>Valuation Statistics</span>
          </div>
          <h3 className="text-xl font-display font-black tracking-tight text-text-primary">
            Asset Dynamics
          </h3>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Analyzing standard deviation divergences between valuation multiples and fundamental performance.
          </p>
        </div>

        <div className={`px-4 py-3 rounded-xl border ${verdict.bg} ${verdict.border} text-right flex flex-col justify-center`}>
          <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">
            Residual Verdict
          </span>
          <span className={`text-base font-black uppercase tracking-tight ${verdict.tint}`}>
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
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "11px",
                boxShadow: "var(--card-shadow-hover)",
                border: "1px solid var(--border-subtle)",
              }}
              itemStyle={{ fontWeight: 700, color: "var(--text-primary)" }}
              labelStyle={{ color: "var(--text-muted)", fontWeight: 800, marginBottom: "8px", textTransform: "uppercase", fontSize: "10px" }}
              cursor={{ stroke: "var(--border-subtle)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
              formatter={(value: any, name?: string, props?: any) => {
                const { payload } = props;
                const numVal = Number(value);
                const prefix = numVal > 0 ? "+" : "";
                const sigmaStr = isNaN(numVal) ? "--" : `${prefix}${numVal.toFixed(2)}σ`;

                if (name === "Price (Z)") {
                  const rawPrice = payload.price;
                  return [`$${rawPrice?.toFixed(2)} (${sigmaStr})`, "Price"];
                }
                if (name === `${multipleLabel} (Log Z)`) {
                  const rawMult = payload.evEbitda;
                  return [`${rawMult?.toFixed(1)}x (${sigmaStr})`, multipleLabel];
                }
                if (name === "Fundamentals (Z)") {
                  const rawFund = payload.fundamental;
                  return [`${(rawFund * 100).toFixed(1)}% (${sigmaStr})`, "Fundamentals"];
                }
                if (name === "Valuation Residual (Z)") {
                  return [sigmaStr, "Decoupling Residual"];
                }

                return [sigmaStr, name];
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

            {/* Price */}
            <Line
              type="monotone"
              dataKey="zPrice"
              stroke="var(--text-muted)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--text-muted)", strokeWidth: 0 }}
              name="Price (Z)"
              animationDuration={2000}
            />

            {/* Log Multiple */}
            <Line
              type="monotone"
              dataKey="zLogMultiple"
              stroke="var(--color-brand)"
              strokeWidth={2}
              strokeOpacity={0.6}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-brand)", strokeWidth: 0 }}
              name={`${multipleLabel} (Log Z)`}
              animationDuration={2000}
            />

            {/* Fundamentals */}
            <Line
              type="monotone"
              dataKey="zFundamental"
              stroke="#10b981"
              strokeWidth={3}
              strokeOpacity={0.6}
              dot={false}
              activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
              name="Fundamentals (Z)"
              animationDuration={2000}
            />

            {/* Residual (true decoupling) */}
            <Line
              type="monotone"
              dataKey="zResidual"
              stroke="var(--color-brand)"
              strokeWidth={4}
              activeDot={{ r: 7, fill: "var(--color-brand)", strokeWidth: 0 }}
              dot={(props: any) => {
                const { payload } = props;
                if (payload.bottomSignal) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill="#10b981"
                    />
                  );
                }
                return null;
              }}
              name="Valuation Residual (Z)"
              animationDuration={2000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-12 p-6 bg-bg-main rounded-2xl border border-border-subtle transition-colors">
        <div className="flex gap-8 items-center">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Analysis</span>
            </div>
            <span className={`text-xl font-display font-black tracking-tight ${verdict.tint}`}>
              {bias.toFixed(2)}σ {bias < 0 ? "Undervalued" : "Overvalued"}
            </span>
          </div>
          <div className="w-px h-12 bg-border-subtle" />
          <p className="text-sm text-text-secondary leading-relaxed font-semibold">
            The market multiple is currently decoupled from its fundamentally justified value by {Math.abs(bias).toFixed(2)} standard deviations.
            {bias < -1.5 ? " This represents a severe statistical undervaluation relative to historical norms." : 
             bias > 1.5 ? " This represents a severe statistical overvaluation relative to historical norms." :
             " The divergence is within standard mathematical volatility bounds."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValuationLagChart;