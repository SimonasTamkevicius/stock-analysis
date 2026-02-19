export function calculateSlope(values: number[]): number {
  const clean = values.filter(
    (v) => v !== null && !isNaN(v)
  );

  if (clean.length < 3) return 0;

  const n = clean.length;
  if (n < 2) return 0;

  const xValues = clean.map((_, i) => i);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = clean.reduce((a, b) => a + b, 0);
  const sumXY = clean.reduce((sum, y, i) => sum + xValues[i] * y, 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;

  if (denominator === 0) return 0;

  return numerator / denominator;
}

export function buildRegressionLine(values: number[], slope: number) {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY =
    values.reduce((sum, v) => sum + v, 0) / n;

  return values.map((_, i) => {
    return meanY + slope * (i - meanX);
  });
}
