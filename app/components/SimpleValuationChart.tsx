"use client";


import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface SimpleValuationChartProps {
    dates: string[];
    evEbitda: (number | null)[];
    fundamentals: (number | null)[];
    title: string;
}

export default function SimpleValuationChart({
  dates,
  evEbitda,
  fundamentals,
  title,
}: SimpleValuationChartProps) {
    if (!dates?.length) return null;

    // Combine into recharts data shape
    const data = dates.map((date, i) => ({
      date,
      evEbitda: evEbitda[i],
      fundamentals: fundamentals[i],
    }));

    // Find min/max for scaling? 
    // Recharts handles auto-scaling well, but we need dual axes.

    return (
      <div className="w-full bg-[#111] border border-[#222] rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                tick={{ fill: "#666", fontSize: 12 }}
                tickFormatter={(val) => new Date(val).getFullYear().toString()}
                minTickGap={50}
              />
              {/* Left Axis: EV/EBITDA */}
              <YAxis 
                yAxisId="left"
                stroke="#fbbf24" // Amber for Valuation
                tick={{ fill: "#fbbf24", fontSize: 12 }}
                domain={['auto', 'auto']}
                label={{ value: "EV/EBITDA", angle: -90, position: "insideLeft", fill: "#fbbf24" }}
              />
              {/* Right Axis: Fundamentals */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#10b981" // Green for Fundamentals
                tick={{ fill: "#10b981", fontSize: 12 }}
                domain={['auto', 'auto']}
                label={{ value: "Fundamental Trend", angle: 90, position: "insideRight", fill: "#10b981" }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "#111", borderColor: "#333", color: "#fff" }}
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Legend verticalAlign="top" height={36} />
              
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="evEbitda"
                name="EV/EBITDA"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="fundamentals"
                name="Fundamental Trend"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
}
