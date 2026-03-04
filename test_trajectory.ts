import { config } from "dotenv";
config({ path: ".env.local" });

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

async function run() {
  const ticker = "NFLX";
  const incRes = await fetch(`https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
  const inc = await incRes.json();
  const cfRes = await fetch(`https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
  const cf = await cfRes.json();
  const balRes = await fetch(`https://www.alphavantage.co/query?function=BALANCE_SHEET&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
  const bal = await balRes.json();
  
  const anchoredIncome = inc.quarterlyReports;
  const revenues = [...anchoredIncome].reverse().map((q: any) => Number(q.totalRevenue));
  
  console.log("Revenues len:", revenues.length);
  // simulate TTM
  const revTTM = [];
  for(let i=3; i<revenues.length; i++) {
    revTTM.push(revenues[i] + revenues[i-1] + revenues[i-2] + revenues[i-3]);
  }
  console.log("TTM len:", revTTM.length);
  const yoy = [];
  for(let i=4; i<revTTM.length; i++) {
    yoy.push((revTTM[i]-revTTM[i-4])/revTTM[i-4]);
  }
  console.log("YoY len:", yoy.length);
  console.log("YoY values:", yoy.map(y => (y*100).toFixed(1) + "%"));
  console.log("Last 12 YoY:", yoy.slice(-12).map(y => (y*100).toFixed(1) + "%"));
  console.log("Last 12 Quarters ending:", [...anchoredIncome].reverse().slice(-12).map(q => q.fiscalDateEnding));
}
run();
