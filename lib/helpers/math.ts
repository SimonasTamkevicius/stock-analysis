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
  const clean = values.filter((v) => Number.isFinite(v));

  if (clean.length === 0) {
    return values.map(() => 0);
  }

  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  const variance = clean.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / clean.length;
  const std = Math.sqrt(variance);

  if (std === 0) {
    return values.map(() => 0);
  }

  return values.map((v) =>
    Number.isFinite(v) ? (v - mean) / std : 0
  );
}

export function rollingZScore(values: number[], window: number) {
  const result = new Array(values.length).fill(NaN);

  for (let i = 0; i < values.length; i++) {
    const startIndex = Math.max(0, i - window + 1);
    const slice = values.slice(startIndex, i + 1).filter(Number.isFinite);
    
    // Z-score cannot be calculated on a single data point
    if (slice.length < 2) {
      result[i] = 0;
      continue;
    }

    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance =
      slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
    const std = Math.sqrt(variance);

    if (std === 0) {
      result[i] = 0;
      continue;
    }

    result[i] = (values[i] - mean) / std;
  }

  return result;
}