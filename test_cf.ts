import { config } from "dotenv";
config({ path: ".env.local" });

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

async function run() {
  const ticker = "AAPL";
  const cfRes = await fetch(`https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`);
  const cf = await cfRes.json();
  const q = cf.quarterlyReports[0];
  console.log("OCF:", q.operatingCashflow);
  console.log("CAPEX:", q.capitalExpenditures);
  console.log("FCF if ocf - capex:", Number(q.operatingCashflow) - Number(q.capitalExpenditures));
  console.log("FCF if ocf + capex:", Number(q.operatingCashflow) + Number(q.capitalExpenditures));
}
run();
