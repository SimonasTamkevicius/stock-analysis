import CompanyList from "./components/CompanyList";
import PortfolioTracker from "./components/PortfolioTracker";
import SectionHeader from "./components/SectionHeader";
import SearchStock from "./components/SearchStock";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 space-y-16 mb-20 animate-entrance">

      {/* ── Search ── */}
      <section>
        <SearchStock />
      </section>

      {/* ── Coverage Universe ── */}
      <section>
        <SectionHeader
          title="Coverage Universe"
          description="Active companies ranked by decision engine score across growth, quality, risk, and valuation."
        />
        <CompanyList />
      </section>

      {/* ── Simulation Tracker ── */}
      <section>
        <SectionHeader
          title="Simulation Tracker"
          description="Performance tracking of simulated portfolio positions."
        />
        <PortfolioTracker />
      </section>
    </main>
  );
}
