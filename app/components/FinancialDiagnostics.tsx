"use client";

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

type GrowthDiagnosticsProps = {
  windowValues: number[];
  regressionLine: number[];
};

export default function GrowthDiagnostics({
  windowValues,
  regressionLine,
}: GrowthDiagnosticsProps) {
  // Build chart data
  const data = windowValues.map((value, i) => ({
    quarter: i + 1,
    growth: value,
    trend: regressionLine[i],
  }));

  return (
    <div className="clean-card" style={{ width: "100%", height: 400 }}>
      <h2 className="text-xl font-display font-bold text-text-primary mb-6">Growth Momentum (YoY TTM)</h2>

      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-subtle" vertical={false} />
          <XAxis 
            dataKey="quarter" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            domain={["auto", "auto"]} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "var(--surface)", 
              borderColor: "var(--border-subtle)",
              borderRadius: "16px",
              boxShadow: "var(--card-shadow)"
            }}
            itemStyle={{ color: "var(--text-primary)", fontWeight: 700 }}
          />

          {/* Raw Growth */}
          <Line
            type="monotone"
            dataKey="growth"
            stroke="var(--text-primary)"
            strokeWidth={3}
            dot={false}
          />

          {/* Regression Line */}
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--color-brand)"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
          />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="var(--border-subtle)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
