"use client";
"use client"
import { useState } from "react";
import TrajectoryOverview from "@/app/components/TrajectoryOverview";
import TrajectoryChart from "@/app/components/TrajectoryChart";
import QualityPanel from "@/app/components/QualityPanel";
import BalanceSheetRisk from "@/app/components/BalanceSheetRisk";
import ValuationLagChart from "@/app/components/ValuationChart";
import DateRangePicker from "@/app/components/DateRangePicker";
import DecisionEngineViz from "@/app/components/DecisionEngineViz";
import TradeSimulator from "@/app/components/TradeSimulator";
import ExitMonitor from "@/app/components/ExitMonitor";
import RawDataGraphs from "@/app/components/RawDataGraphs";
import { motion, LayoutGroup } from "framer-motion";
import AnalystMonitor from "./AnalystMonitor";

const tabs = ["Metrics", "Raw Data", "Analysts"];

export default function CompanyDashboard({
  ticker,
  data,
}: {
  ticker: string;
  data: any;
}) {
  const [currentTab, setCurrentTab] = useState("Metrics");

  const trajectory = data.trajectory;
  const quality = data.quality;
  const risk = data.balanceSheetRisk;
  const valuation = data.valuations;

  return (
    <>
      {/* ── Hero: Decision Engine ── */}
      {data.decisionEngineResult && data.companyOverview && (
        <div className="mt-2">
          <DecisionEngineViz
            result={data.decisionEngineResult}
            companyOverview={data.companyOverview}
            ticker={ticker.toUpperCase()}
          />
        </div>
      )}


      {/* ── Tabs Navigation ── */}
      <div className="flex justify-center mb-8 mt-6">
        <LayoutGroup id="dashboard-tabs">
          <div className="flex p-1 gap-1 relative bg-[var(--surface)] border border-[var(--border-subtle)] rounded-full shadow-sm">
            {tabs.map((tab) => {
              const isActive = currentTab === tab;
              return (
                <button
                  key={tab}
                  className={`
                    relative px-6 py-2.5 text-sm font-bold tracking-wide rounded-full transition-colors duration-300 z-10
                    ${isActive 
                      ? "text-[var(--background)]" 
                      : "text-text-secondary hover:text-text-primary"
                    }
                  `}
                  onClick={() => setCurrentTab(tab)}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabBadge"
                      className="absolute inset-0 bg-text-primary border border-border-subtle rounded-full z-[-1] shadow-md"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* ── Tab Content ── */}
      
      {currentTab === "Metrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 items-start animate-entrance">
          {/* Left Column (Charts & Trading) */}
          <div className="lg:col-span-2 space-y-4">
            <ValuationLagChart
              dates={valuation.dates}
              prices={valuation.prices}
              evEBITDAMonthly={valuation.evEBITDAMonthly}
              fundamentalCompositeMonthly={valuation.fundamentalCompositeMonthly}
              epsMonthly={valuation.epsMonthly || []}
              multipleLabel={data.multipleLabel}
              zResidualSeries={valuation.zResidualSeries || []}
              bottomSignalSeries={valuation.bottomSignal || []}
            />

            <TradeSimulator
              ticker={ticker}
              currentPrice={
                valuation?.prices
                  ? valuation.prices[valuation.prices.length - 1]
                  : 0
              }
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
            <ExitMonitor
              ticker={ticker}
              currentPrice={
                valuation?.prices
                  ? valuation.prices[valuation.prices.length - 1]
                  : 0
              }
              monthlyPrices={(valuation?.prices || []).map(Number)}
              yoyGrowthTTM={(data.series?.yoyGrowthTTM || []).map(Number)}
              stockMultiple={
                valuation?.evEBITDAMonthly
                  ? valuation.evEBITDAMonthly[
                      valuation.evEBITDAMonthly.length - 1
                    ]
                  : 0
              }
              sellSignal={data.decisionEngineResult?.sellSignal}
            />
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
      )}

      {currentTab === "Raw Data" && data.series && data.series.quarterlyDates && (
        <div className="animate-entrance">
          <RawDataGraphs
            dates={data.series.quarterlyDates}
            revenueTTM={data.series.revenueTTM || []}
            operatingIncomeTTM={data.series.operatingIncomeTTM || []}
            fcfTTM={data.series.fcfTTM || []}
            roicTTM={data.series.roicTTM || []}
          />
        </div>
      )}

      {currentTab === "Analysts" && (
        <AnalystMonitor companyOverview={data.companyOverview} />
      )}
    </>
  );
}
