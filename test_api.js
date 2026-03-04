async function run() {
  const res = await fetch("http://localhost:3000/api/company/AAPL?startDate=2018-01&endDate=2021-12");
  const data = await res.json();
  console.log("Trajectory Growth windowValues length:", data.trajectory?.growth?.windowValues?.length);
  console.log("Valuation Dates length:", data.valuations?.dates?.length);
}
run();
