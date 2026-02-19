const { fetchQuarterlyIncomeStatement } = require('./lib/data/alphavantage');
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    const data = await fetchQuarterlyIncomeStatement('AMZN');
    console.log('Quarterly Reports:', data.quarterlyReports?.length);
    console.log('First Report Date:', data.quarterlyReports?.[0]?.fiscalDateEnding);
    console.log('Last Report Date:', data.quarterlyReports?.[data.quarterlyReports?.length - 1]?.fiscalDateEnding);
  } catch (e) {
    console.error(e);
  }
}
run();
