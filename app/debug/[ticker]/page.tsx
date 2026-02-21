"use client";

import React, { use, useEffect, useState } from "react";
import SectionHeader from "@/app/components/SectionHeader";
import { Loader2, Bug, ArrowLeft } from "lucide-react";
import DebugChart from "@/app/components/DebugChart";
import Link from "next/link";

type Props = {
  params: Promise<{ ticker: string }>;
};

export default function DebugDashboardPage({ params }: Props) {
  const { ticker } = use(params);
  const [data, setData] = useState<any>(null);
  const [valData, setValData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDebug() {
      try {
        setLoading(true);
        // Fetch concurrently from both the main and debug APIs
        const [debugRes, valRes] = await Promise.all([
          fetch(`/api/debug/${ticker}`),
          fetch(`/api/company/${ticker}`)
        ]);

        if (!debugRes.ok || !valRes.ok) throw new Error("Failed to load debug data");

        const debugJson = await debugRes.json();
        const valJson = await valRes.json();

        console.log(debugJson);
        console.log(valJson);
        

        setData(debugJson);
        setValData(valJson);
        setError(null);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDebug();
  }, [ticker]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-bg-main gap-4">
        <Loader2 className="animate-spin text-brand" size={48} />
        <p className="text-text-muted font-bold tracking-widest uppercase text-sm animate-pulse">Running Diagnostics Pipeline...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-bg-main">
        <div className="clean-card text-center max-w-md w-full">
          <Bug className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-xl font-display font-black mb-2 text-text-primary">Diagnostic Failure</h2>
          <p className="text-text-muted mb-6">{error || "No data available."}</p>
          <Link href={`/company/${ticker}`} className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity">
            <ArrowLeft size={16} /> Return to Company
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main p-4 md:p-8 space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto">
        <Link href={`/company/${ticker}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm font-bold tracking-widest uppercase w-fit">
          <ArrowLeft size={16} /> Load Core Dashboard
        </Link>
        <div>
          <div className="flex items-center gap-3">
             <Bug className="text-brand" size={32} />
             <h1 className="text-4xl font-display font-black tracking-tighter text-text-primary">
              Pipeline Diagnostics
             </h1>
          </div>
          <p className="text-text-muted mt-2 max-w-2xl font-medium leading-relaxed">
            Verify the intermediate states of the structural evaluation engine for <strong className="text-text-primary">{ticker.toUpperCase()}</strong>. Plotted chronologically (x-axis reverse index).
          </p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto space-y-16">
        {/* Tier 1: Raw Inputs */}
        <section className="space-y-6">
          <SectionHeader title="Raw Quarterly Inputs" description="Unadjusted quarterly financials pulled from cache" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <DebugChart title="Total Revenues" data={data.rawQuarterly.revenues} type="bar" color="var(--text-secondary)" />
            <DebugChart title="Operating Income" data={data.rawQuarterly.operatingIncome} type="bar" color="var(--text-secondary)" />
            <DebugChart title="Free Cash Flow" data={data.rawQuarterly.freeCashFlow} type="bar" color="var(--text-secondary)" />
            <DebugChart title="Invested Capital" data={data.rawQuarterly.investedCapital} type="bar" color="var(--text-secondary)" />
          </div>
        </section>

        {/* Tier 2: TTM Transformations */}
        <section className="space-y-6">
          <SectionHeader title="TTM Calculations" description="Smoothing via trailing twelve-month windows" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DebugChart title="Revenue (TTM)" data={data.ttm.revenue} color="var(--color-brand)" />
            <DebugChart title="Operating Income (TTM)" data={data.ttm.operatingIncome} color="var(--color-brand)" />
             <DebugChart title="Free Cash Flow (TTM)" data={data.ttm.fcf} color="var(--color-brand)" />
          </div>
        </section>

        {/* Tier 3: Derived Ratios (Windowed) */}
        <section className="space-y-6">
          <SectionHeader title="Derived Model Math" description="Rate-of-change and structural margins evaluated over the trailing window" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
             <DebugChart 
                title="YoY Revenue Growth" 
                data={data.windowed.yoyGrowth} 
                formatAsPercent 
                description={`Growth Slope: ${data.intermediates.growth.slope.toFixed(4)}`} 
                color="var(--color-brand)"
              />
              <DebugChart 
                title="Operating Margins" 
                data={data.windowed.margins} 
                formatAsPercent 
                description={`Margin Slope: ${data.intermediates.margins.slope.toFixed(4)}`} 
                color="var(--color-brand)"
              />
              <DebugChart 
                title="FCF Margins" 
                data={data.windowed.fcfMargins} 
                formatAsPercent 
                description={`FCF Slope: ${data.intermediates.fcf.slope.toFixed(4)}`} 
                color="var(--color-brand)"
              />
               <DebugChart 
                title="Return on Invested Capital" 
                data={data.windowed.roic} 
                formatAsPercent 
                description={`ROIC Slope: ${data.intermediates.capital.slope.toFixed(4)}`} 
                color="var(--color-brand)"
              />
          </div>
        </section>

        {/* Tier 4: Valuation Engine */}
        {valData?.valuations && (
           <section className="space-y-6">
            <SectionHeader title="Valuation Composite" description="Comparing multiple vs underlying structural state" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <DebugChart 
                  title="Pricing Multiple" 
                  data={valData.valuations.evEBITDAMonthly} 
                  description="EV/EBITDA (or EV/Rev if unprofitable) tracked monthly" 
                  color="var(--text-primary)"
                />
                 <DebugChart 
                  title="Fundamental Composite" 
                  data={valData.valuations.fundamentalCompositeMonthly} 
                  description="Abstract composite tracking structural state (Growth + ROIC + Margins)" 
                  color="#10B981"
                />
            </div>
           </section>
        )}
      </div>
    </div>
  );
}
