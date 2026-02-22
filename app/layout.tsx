import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

import { ThemeProvider } from "./components/ThemeProvider";
import ThemeToggle from "./components/ThemeToggle";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <header className="sticky top-0 z-50 w-full bg-bg-main/80 backdrop-blur-xl border-b border-border-subtle shadow-sm">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-lg shadow-brand/20">
                  <span className="text-white font-black text-lg italic leading-none">V</span>
                </div>
                <span className="font-display font-black tracking-tighter text-xl text-text-primary">
                  Ver<span className="text-brand">so</span>
                </span>
              </div>
              <ThemeToggle />
            </div>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
