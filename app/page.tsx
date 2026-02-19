import CompanyList from "./components/CompanyList";
import PortfolioTracker from "./components/PortfolioTracker";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-main p-8 md:p-12 lg:p-20">
      <div className="max-w-7xl mx-auto space-y-20">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-text-primary mb-2">
              Market Value Monitor
            </h1>
            <p className="text-lg text-text-secondary font-medium max-w-2xl">
              Real-time valuation analysis tracking fundamental divergence across your covered universe.
            </p>
          </div>
        </header>
        
        <CompanyList />
        <PortfolioTracker />
      </div>
    </main>
  );
}
