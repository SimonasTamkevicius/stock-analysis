"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

export default function SearchStock() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim() && !loading) {
      setLoading(true);
      router.push(`/company/${ticker.trim().toUpperCase()}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-4 p-4 bg-surface border rounded-xl transition-all duration-300
        ${loading 
          ? 'border-brand/50 shadow-lg shadow-brand/10 opacity-80' 
          : 'border-border-subtle hover:shadow-lg hover:shadow-brand/5 focus-within:border-brand/50'
        }`}
    >
      {loading 
        ? <Loader2 size={18} className="text-brand shrink-0 animate-spin" />
        : <Search size={18} className="text-text-muted shrink-0" />
      }
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Search for a ticker..."
        disabled={loading}
        className="flex-1 bg-transparent text-text-primary text-sm font-bold uppercase tracking-wider placeholder:normal-case placeholder:font-medium placeholder:tracking-normal placeholder:text-text-muted focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!ticker.trim() || loading}
        className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap
          ${loading
            ? 'bg-brand/80 text-white cursor-wait'
            : 'bg-brand text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90'
          }`}
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}