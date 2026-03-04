"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, DatabaseBackup, Info } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRefreshPrices = async () => {
    setIsRefreshingPrices(true);
    try {
      const queryParams = new URLSearchParams(searchParams.toString());
      queryParams.set("refresh", "prices");
      const ticker = params.ticker;
      await fetch(`/api/company/${ticker}?${queryParams.toString()}`);
      router.refresh();
    } catch (e) {
      console.error("Failed to refresh prices", e);
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  const handleRefreshAll = async () => {
    setShowConfirmDialog(false);
    setIsRefreshingAll(true);
    try {
      const queryParams = new URLSearchParams(searchParams.toString());
      queryParams.set("refresh", "true");
      const ticker = params.ticker;
      await fetch(`/api/company/${ticker}?${queryParams.toString()}`);
      router.refresh();
    } catch (e) {
      console.error("Failed to refresh all data", e);
    } finally {
      setIsRefreshingAll(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefreshPrices}
          disabled={isRefreshingPrices || isRefreshingAll}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200
            ${
              isRefreshingPrices
                ? "bg-[var(--surface-raised)] text-text-muted cursor-not-allowed"
                : "bg-[var(--surface-raised)] text-text-secondary hover:text-brand hover:bg-brand/10 border border-[var(--border-subtle)] hover:border-brand/30"
            }
          `}
        >
          <RefreshCw size={11} className={isRefreshingPrices ? "animate-spin" : ""} />
          {isRefreshingPrices ? "Syncing..." : "Update Prices"}
        </button>

        <button
          onClick={() => setShowConfirmDialog(true)}
          disabled={isRefreshingPrices || isRefreshingAll}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-200
            ${
              isRefreshingAll
                ? "bg-brand/20 text-brand cursor-not-allowed border outline-none"
                : "bg-bg-main text-text-muted hover:text-text-primary hover:bg-[var(--surface-raised)] border border-transparent hover:border-[var(--border-subtle)]"
            }
          `}
        >
          <DatabaseBackup size={11} className={isRefreshingAll ? "animate-bounce" : ""} />
          {isRefreshingAll ? "Rebuilding DB..." : "Refresh All"}
        </button>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-main border border-border-subtle rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand/10 rounded-full text-brand shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black font-display tracking-tight text-text-primary mb-1">
                    Confirm Deep Refresh
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed font-medium">
                    Refreshing all financial statements and historical context takes approximately <strong>40 seconds</strong> due to strict API rate limits.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefreshAll}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-brand text-white hover:bg-brand-hover active:scale-95 transition-all shadow-lg shadow-brand/20"
                >
                  Begin Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
