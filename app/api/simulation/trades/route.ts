import { connectToDatabase } from "@/lib/data/mongodb";
import SimulatedTrade from "@/lib/models/SimulatedTrade";
import { NextResponse } from "next/server";
import CompanyFinancials from "@/lib/models/CompanyFinancials";
import { fetchMonthlyPrices } from "@/lib/data/alphavantage";
import { safeNumber } from "@/lib/helpers/math";

// Helper to normalize monthly prices similar to route.ts
function normalizeMonthlyPrices(raw: any) {
  const series =
    raw["Monthly Adjusted Time Series"] ||
    raw["Monthly Time Series"] ||
    raw["Time Series (Monthly)"];
  if (!series) return [];

  return Object.entries(series)
    .map(([date, values]: any) => {
      const getVal = (field: string) => {
        const key = Object.keys(values).find((k) =>
          k.toLowerCase().includes(field.toLowerCase())
        );
        return key ? safeNumber(values[key]) : 0;
      };

      const adjKey = Object.keys(values).find(
        (k) =>
          k.toLowerCase().includes("adjusted") &&
          k.toLowerCase().includes("close")
      );

      const adjustedClose = adjKey
        ? safeNumber(values[adjKey])
        : getVal("close") || safeNumber(values["4. close"]);
      const close =
        getVal("close") || safeNumber(values["4. close"]) || adjustedClose;

      return {
        date,
        close,
        adjustedClose: adjustedClose || close,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ticker, buyDate, buyPrice, shares, totalCost, notes } = body;

    // Validate
    if (!ticker || !buyDate || !buyPrice || !shares) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const trade = await SimulatedTrade.create({
      ticker,
      buyDate: new Date(buyDate),
      buyPrice,
      shares,
      totalCost: totalCost || buyPrice * shares,
      notes,
    });

    return NextResponse.json({ success: true, trade });
  } catch (error) {
    console.error("Failed to create trade:", error);
    return NextResponse.json(
      { error: "Failed to create trade" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Fetch all trades
    const trades = await SimulatedTrade.find({}).sort({ buyDate: -1 });

    // 2. Get unique tickers to fetch current prices
    const tickers = Array.from(new Set(trades.map((t) => t.ticker)));

    // 3. Fetch latest prices for each ticker
    // We'll try to get it from CompanyFinancials first, or fetch if needed (simplified for now)
    const priceMap: Record<string, number> = {};

    await Promise.all(
      tickers.map(async (ticker) => {
        // Try DB cache
        const cached = await CompanyFinancials.findOne({ ticker });
        let currentPrice = 0;

        if (cached && cached.monthlyPrices && cached.monthlyPrices.length > 0) {
          // Get latest
          const latest = cached.monthlyPrices[cached.monthlyPrices.length - 1] as any;
          currentPrice = latest.adjustedClose || latest.close || 0;
        } else {
            // Fallback: This might be too slow if we have many tickers
            // For now, we assume if it's in trades, it's likely in our system
            console.warn(`No price data found for ${ticker}`);
        }
        
        priceMap[ticker] = currentPrice;
      })
    );

    // 4. Calculate performance
    const tradesWithPerformance = trades.map((trade) => {
      const currentPrice = priceMap[trade.ticker] || trade.buyPrice; // fallback to break-even if no price
      const currentValue = currentPrice * trade.shares;
      const gainLoss = currentValue - trade.totalCost;
      const gainLossPercent =
        trade.totalCost > 0 ? (gainLoss / trade.totalCost) * 100 : 0;

      return {
        ...trade.toObject(),
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent,
      };
    });

    return NextResponse.json({ trades: tradesWithPerformance });
  } catch (error) {
    console.error("Failed to fetch trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) {
          return NextResponse.json({ error: "Missing ID" }, { status: 400 });
      }

      await connectToDatabase();
      await SimulatedTrade.findByIdAndDelete(id);

      return NextResponse.json({ success: true });
  } catch (error) {
      console.error("Failed to delete trade:", error);
      return NextResponse.json({ error: "Failed to delete trade" }, { status: 500 });
  }
}
