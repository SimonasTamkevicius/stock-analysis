"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type RawDataGraphsProps = {
  dates: string[];
  revenueTTM: number[];
  operatingIncomeTTM: number[];
  fcfTTM: number[];
  roicTTM: number[];
};

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function MiniChart({ 
  title, 
  data, 
  dataKey, 
  color, 
  formatter 
}: { 
  title: string; 
  data: any[]; 
  dataKey: string; 
  color: string; 
  formatter: (v: number) => string;
}) {
  return (
    <div className="clean-card p-6 flex flex-col h-[300px]">
      <div className="flex justify-between items-start mb-4">
        <span className="section-label">{title}</span>
        <span className="text-xl font-bold" style={{ color }}>
          {data.length > 0 ? formatter(data[data.length - 1][dataKey]) : 'N/A'}
        </span>
      </div>
      <div className="flex-grow w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-subtle" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
              dy={10}
              tickFormatter={(dateStr) => {
                const d = new Date(dateStr);
                return `${d.getFullYear()}`;
              }}
              minTickGap={30}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}
              tickFormatter={formatter}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "var(--surface)", 
                borderColor: "var(--border-subtle)",
                borderRadius: "12px",
                padding: "10px 14px",
                fontSize: "11px",
                boxShadow: "var(--card-shadow-hover)",
                border: "1px solid var(--border-subtle)"
              }}
              itemStyle={{ color: "var(--text-primary)", fontWeight: 700 }}
              labelStyle={{ color: "var(--text-muted)", fontWeight: 800, marginBottom: "4px", textTransform: "uppercase", fontSize: "10px" }}
              cursor={{ stroke: color, strokeWidth: 1.5, strokeDasharray: "4 4" }}
              formatter={(v: any) => [formatter(v), title]}
              labelFormatter={(label) => {
                 const d = new Date(label);
                 return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
              }}
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function RawDataGraphs({
  dates,
  revenueTTM,
  operatingIncomeTTM,
  fcfTTM,
  roicTTM,
}: RawDataGraphsProps) {
  
  // Align data. Assuming all arrays are the same length or aligned to the end.
  const maxLength = Math.max(
    dates?.length || 0,
    revenueTTM?.length || 0,
    operatingIncomeTTM?.length || 0,
    fcfTTM?.length || 0,
    roicTTM?.length || 0
  );

  if (maxLength === 0) return null;

  let data = Array.from({ length: maxLength }).map((_, i) => {
    // Read from the end to align correctly if arrays are shorter than dates
    const getVal = (arr: number[]) => {
      if (!arr || arr.length === 0) return null;
      const idx = arr.length - maxLength + i;
      return idx >= 0 ? arr[idx] : null;
    };
    
    return {
      date: dates[dates.length - maxLength + i] || `Point ${i}`,
      revenue: getVal(revenueTTM),
      operatingIncome: getVal(operatingIncomeTTM),
      fcf: getVal(fcfTTM),
      roic: getVal(roicTTM),
    };
  }).filter(d => Boolean(d.date));

  // Cap at 10 years (40 quarters)
  if (data.length > 40) {
    data = data.slice(-40);
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
         <span className="section-label text-lg">TTM Fundamentals</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniChart 
          title="Revenue (TTM)" 
          data={data} 
          dataKey="revenue" 
          color="var(--color-brand)" 
          formatter={formatCurrency} 
        />
        <MiniChart 
          title="Operating Income (TTM)" 
          data={data} 
          dataKey="operatingIncome" 
          color="#10b981" 
          formatter={formatCurrency} 
        />
        <MiniChart 
          title="Free Cash Flow (TTM)" 
          data={data} 
          dataKey="fcf" 
          color="#3b82f6" 
          formatter={formatCurrency} 
        />
        <MiniChart 
          title="ROIC (TTM)" 
          data={data} 
          dataKey="roic" 
          color="#a855f7" 
          formatter={formatPercent} 
        />
      </div>
    </div>
  );
}
