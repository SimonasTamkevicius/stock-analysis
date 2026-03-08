import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TrendingUp, Search, Bell, Settings } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Verso",
  description: "Stock Universe Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="sticky top-0 z-50 w-full bg-white border-b border-border">
          <div className="max-w-[1600px] w-full mx-auto px-6 h-[72px] flex items-center justify-between">
            
            {/* Left section: Logo & Search */}
            <div className="flex items-center flex-1">
              {/* Logo */}
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity">
                <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center shadow-sm relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-white/20"></div>
                  <TrendingUp size={16} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="font-display font-black tracking-tighter text-2xl text-primary">
                  Ver<span className="text-secondary">so</span>
                </span>
              </div>

              {/* Search Bar */}
              <div className="hidden md:flex relative max-w-sm w-full mx-10">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={16} className="text-muted" strokeWidth={2.5} />
                </div>
                <input 
                  type="text" 
                  placeholder="Find inspiration..." 
                  className="w-full bg-background border border-transparent rounded-full py-2.5 pl-10 pr-4 text-sm font-bold text-foreground placeholder:text-muted focus:outline-none focus:border-border transition-all"
                />
              </div>
            </div>

            {/* Center section: Links */}
            <nav className="hidden lg:flex items-center gap-8 mr-12">
              <a href="#" className="flex items-center text-sm font-black text-muted hover:text-foreground transition-colors tracking-tight">Discover</a>
              <a href="#" className="flex items-center text-sm font-black text-muted hover:text-foreground transition-colors tracking-tight">Portfolio</a>
              <a href="#" className="flex items-center text-sm font-black text-muted hover:text-foreground transition-colors tracking-tight">Resources</a>
            </nav>

            {/* Right section: Actions & User */}
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-2 border-r border-border pr-6">
                <button className="p-2 text-muted hover:text-foreground transition-colors rounded-full hover:bg-background">
                  <Bell size={20} strokeWidth={2.5} />
                </button>
                <button className="p-2 text-muted hover:text-foreground transition-colors rounded-full hover:bg-background">
                  <Settings size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-black text-foreground leading-none mb-1 group-hover:text-primary transition-colors tracking-tight">Julian Vane</span>
                  <span className="text-[10px] font-bold text-secondary tracking-widest uppercase">Pro Member</span>
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-border overflow-hidden ring-2 ring-transparent group-hover:ring-secondary/20 transition-all">
                    <img src="https://i.pravatar.cc/150?u=a04258114e29026702d" alt="Julian Vane" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
              </div>
            </div>

          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
