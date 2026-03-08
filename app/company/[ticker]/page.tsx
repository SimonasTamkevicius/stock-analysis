import RefreshButton from "@/app/components/RefreshButton";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CompanyDashboard from "@/app/components/CompanyDashboard";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ preset?: string; startDate?: string; endDate?: string }>;
}) {
  const { ticker } = await params;
  const { preset, startDate, endDate } = await searchParams;

  const urlParams = new URLSearchParams();
  if (preset) urlParams.set("preset", preset);
  if (startDate) urlParams.set("startDate", startDate);
  if (endDate) urlParams.set("endDate", endDate);

  const windowQuery = urlParams.toString() ? `?${urlParams.toString()}` : "";
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/company/${ticker}${windowQuery}`,
    { cache: "no-store" }
  );

  const data = await res.json();
  console.log("Fetched Data in Server Component", !!data);

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

  return (
    <main className="max-w-7xl mx-auto px-6 pt-2 pb-16 animate-entrance">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-brand transition-colors text-[10px] font-bold uppercase tracking-widest group"
        >
          <ArrowLeft size={11} className="group-hover:-translate-x-1 transition-transform" />
          Stock-Universe
        </Link>
        <RefreshButton />
      </div>

      <CompanyDashboard ticker={ticker.toUpperCase()} data={data} />
    </main>
  );
}
