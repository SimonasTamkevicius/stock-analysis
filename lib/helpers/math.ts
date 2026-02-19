export function calculateStdDev(values: number[]) {
  if (values.length === 0) return 0;

  const mean =
    values.reduce((sum, v) => sum + v, 0) / values.length;

  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    values.length;

  return Math.sqrt(variance);
}

export function applyRollingWindow(
  values: number[],
  windowSize: number
) {
  if (values.length <= windowSize) return values;

  return values.slice(-windowSize);
}

export function safeNumber(value: any) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export function calculateZScores(values: number[]) {
  if (values.length === 0) return values;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance) || 1;
  return values.map((v) => (v - mean) / stdDev);
}
