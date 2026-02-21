"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchStock() {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      setLoading(true);
      router.push(`/company/${ticker.trim().toUpperCase()}`);
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-4 p-4 bg-surface border border-border-subtle rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-brand/5 focus-within:border-brand/50"
    >
      <Search size={18} className="text-text-muted shrink-0" />
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        placeholder="Search for a ticker..."
        className="flex-1 bg-transparent text-text-primary text-sm font-medium placeholder:text-text-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={!ticker.trim()}
        className="px-4 py-2 rounded-lg bg-brand text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity whitespace-nowrap"
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}