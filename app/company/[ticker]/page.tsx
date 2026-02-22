import TrajectoryOverview from "@/app/components/TrajectoryOverview";
import TrajectoryChart from "@/app/components/TrajectoryChart";
import QualityPanel from "@/app/components/QualityPanel";
import BalanceSheetRisk from "@/app/components/BalanceSheetRisk";
import SectionHeader from "@/app/components/SectionHeader";
import ValuationLagChart from "@/app/components/ValuationChart";
import DateRangePicker from "@/app/components/DateRangePicker";
import DecisionEngineViz from "@/app/components/DecisionEngineViz";
import TradeSimulator from "@/app/components/TradeSimulator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ window?: string; startDate?: string; endDate?: string }>;
}) {
  const { ticker } = await params;
  const { window, startDate, endDate } = await searchParams;

  return (
    <AsyncPageContent 
      ticker={ticker} 
      window={window} 
      startDate={startDate} 
      endDate={endDate} 
    />
  );
}

async function AsyncPageContent({ 
  ticker, 
  window, 
  startDate, 
  endDate 
}: { 
  ticker: string; 
  window?: string; 
  startDate?: string; 
  endDate?: string; 
}) {
  const params = new URLSearchParams();
  if (window) params.set("window", window);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const windowQuery = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/company/${ticker}${windowQuery}`,
    { cache: "no-store" }
  );

  const data = await res.json();
  console.log(data);

  if (data.error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <h1 className="text-8xl font-display font-black tracking-tighter text-text-primary mb-6 uppercase">
          {ticker}
        </h1>
        <p className="text-text-muted text-xl font-medium">
          {data.error}
        </p>
      </div>
    );
  }

  const trajectory = data.trajectory;
  const quality = data.quality;
  const risk = data.balanceSheetRisk;
  const valuation = data.valuations;

  return (
    <main className="max-w-7xl mx-auto px-6 pt-2 pb-16 animate-entrance">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors text-[10px] font-bold uppercase tracking-widest group"
      >
        <ArrowLeft size={11} className="group-hover:-translate-x-1 transition-transform" />
        Universe
      </Link>

      {/* ── Hero: Decision Engine ── */}
      {data.decisionEngineResult && (
        <div className="mt-2">
          <DecisionEngineViz result={data.decisionEngineResult} ticker={ticker.toUpperCase()} />
        </div>
      )}

      {/* ── Main Content: 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 items-start">
        {/* Left Column (Charts & Trading) */}
        <div className="lg:col-span-2 space-y-4">
          <ValuationLagChart
            dates={valuation?.dates || []}
            evEBITDAMonthly={valuation?.evEBITDAMonthly || []}
            fundamentalCompositeMonthly={valuation?.fundamentalCompositeMonthly || []}
            prices={valuation?.prices || []}
            multipleLabel={valuation?.multipleLabel}
            windowSize={data.dynamicWindow || 36}
          />
          
          <TradeSimulator 
            ticker={ticker}
            currentPrice={valuation?.prices ? valuation.prices[valuation.prices.length - 1] : 0}
            dates={valuation?.dates || []}
            prices={valuation?.prices || []}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trajectory?.growth && (
              <TrajectoryChart
                title="Growth Momentum"
                windowValues={trajectory.growth.windowValues ?? []}
                regressionLine={trajectory.growth.regressionLine ?? []}
                score={trajectory.growth.score}
                state={trajectory.growth.state}
              />
            )}
            {trajectory?.operatingMargin && (
              <TrajectoryChart
                title="Operating Margins"
                windowValues={trajectory.operatingMargin.windowValues ?? []}
                regressionLine={trajectory.operatingMargin.regressionLine ?? []}
                score={trajectory.operatingMargin.score}
                state={trajectory.operatingMargin.state}
              />
            )}
            {trajectory?.fcf && (
              <TrajectoryChart
                title="FCF Trajectory"
                windowValues={trajectory.fcf.windowValues ?? []}
                regressionLine={trajectory.fcf.regressionLine ?? []}
                score={trajectory.fcf.score}
                state={trajectory.fcf.state}
              />
            )}
            {trajectory?.capitalEfficiency && (
              <TrajectoryChart
                title="Capital Efficiency"
                windowValues={trajectory.capitalEfficiency.windowValues ?? []}
                regressionLine={trajectory.capitalEfficiency.regressionLine ?? []}
                score={trajectory.capitalEfficiency.score}
                state={trajectory.capitalEfficiency.state}
                formatAsPercent={false}
              />
            )}
          </div>
        </div>

        {/* Right Column (Sidebar Panels) */}
        <div className="space-y-4">
          <DateRangePicker />
          {quality && <QualityPanel quality={quality} />}
          {risk && <BalanceSheetRisk risk={risk} />}
          {trajectory?.total && (
            <TrajectoryOverview
              ticker={ticker.toUpperCase()}
              total={trajectory.total}
              growth={trajectory.growth}
              operatingMargin={trajectory.operatingMargin}
              fcf={trajectory.fcf}
              capitalEfficiency={trajectory.capitalEfficiency}
            />
          )}
        </div>
      </div>
    </main>
  );
}
