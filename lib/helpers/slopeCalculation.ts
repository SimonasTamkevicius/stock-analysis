export function calculateSlope(values: number[]): number {
  const clean = values.filter((v) => v !== null && !isNaN(v));

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

export function trendScore(slope: number, r2: number, threshold: number): number {
  return Math.sign(slope) * Math.min(1, Math.abs(slope) / threshold) * r2;
}

export function calculateSlopeV2(values: number[]): {slope: number, r2: number} {
  const cleanVals = values.filter((v) => v !== null && !isNaN(v));
  if (cleanVals.length < 3) return { slope: 0, r2: 0 };

  const n = cleanVals.length

  if (n < 2) return { slope: 0, r2: 0 };

  const xValues = cleanVals.map((_, i: number) => i);
  const yValues = cleanVals;

  let slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) { 
    for (let j = i + 1; j < n; j++) {
      slopes.push((yValues[j] - yValues[i]) / (xValues[j] - xValues[i]))
    }
  }

  slopes.sort((a, b) => a - b);

  const mid = Math.floor(slopes.length / 2);

  let TheilSenSlope = 0

  if (slopes.length % 2 === 0) {
    TheilSenSlope = (slopes[mid - 1] + slopes[mid]) / 2;
  } else {
    TheilSenSlope =  slopes[mid];
  }

  const xMean = (n-1) /2
  const yMean = yValues.reduce((sum, val) => sum + val, 0) / n;

  const intercept = yMean - TheilSenSlope * xMean;

  // how much the data varies around the mean
  let SS_total = 0;
  // how much error there is after fitting our line to the data
  let SS_residual = 0;

  // compute the predicted yHat vals
  for (let i = 0; i < n; i ++) {
    const y = yValues[i];
    const x = xValues[i];

    // predicted y value at the given time step x
    const yHat = intercept + TheilSenSlope * x;

    SS_total += (y - yMean)**2;
    SS_residual += (y - yHat)**2;
  }

  // compute how good the line is aka R^2
  const r2 =  SS_total === 0 ? 0 : 1 - (SS_residual / SS_total);

  return { slope: TheilSenSlope, r2 };
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

console.log(calculateSlopeV2([1,2,3,4,5]));
