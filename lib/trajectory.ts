import { buildRegressionLine, calculateSlope, calculateSlopeV2, trendScore } from "./helpers/slopeCalculation";

// Calculate the growth rate of the revenues
export function calculateQoQGrowth(revenues: number[]) {
  const growthRates: number[] = [];

  for (let i = 1; i < revenues.length; i++) {
    const growth =
      (revenues[i] - revenues[i - 1]) / revenues[i - 1];
    growthRates.push(growth);
  }

  return growthRates;
}

export function calculateYoYGrowth(values: number[]) {
  const growth: number[] = [];

  for (let i = 4; i < values.length; i++) {
    const prev = values[i - 4];
    const current = values[i];

    if (prev === 0) {
      growth.push(0);
    } else {
      growth.push((current - prev) / prev);
    }
  }

  return growth;
}

export function scoreGrowthMomentum(growthRates: number[], windowSize: number) {
  if (growthRates.length < 3) {
    return {
      slope: 0,
      r2: 0,
      score: 0,
      state: "insufficient-data",
    };
  }

  const { slope, r2 } = calculateSlopeV2(growthRates);
  const regressionLine = buildRegressionLine(growthRates, slope);

  const rawTrend = trendScore(slope, r2, 0.01);
  const score = Math.round(rawTrend * 2); // maps [-1,+1] → [-2,+2]

  let state = "neutral";

  if (score >= 2) state = "explosive-acceleration";
  else if (score === 1) state = "accelerating";
  else if (score === -1) state = "decelerating";
  else if (score <= -2) state = "structural-deceleration";

  return {
    slope,
    r2,
    score,
    state,
    regressionLine,
    windowValues: growthRates,
  };
}
// Calculate the operating margins of the company
export function calculateOperatingMargins(
  revenues: number[],
  operatingIncome: number[]
) {
  return revenues.map((rev, i) => {
    if (!rev) return 0;
    return operatingIncome[i] / rev;
  });
}

export function scoreMarginDynamics(margins: number[]) {
  if (margins.length < 3) {
    return {
      score: 0,
      r2: 0,
      state: "insufficient-data",
      slope: 0,
    };
  }
  
  const {slope, r2} = calculateSlopeV2(margins);
  const regressionLine = buildRegressionLine(margins, slope);

  const rawScore = trendScore(slope, r2, 0.005);
  const score = Math.round(rawScore); 

  let state = "stable";
  if (score >= 1) state = "expanding";
  else if (score <= -1) state = "compressing";

  return {
    score,
    r2,
    state,
    slope,
    regressionLine,
    windowValues: margins,
  };
}

// Calculate the free cash flow margins
export function calculateFCFMargins(
  revenues: number[],
  freeCashFlow: number[]
) {
  return revenues.map((rev, i) => {
    if (!rev) return 0;
    return freeCashFlow[i] / rev;
  });
}

export function scoreFCFTrajectory(fcfMargins: number[]) {
  if (fcfMargins.length < 2) {
    return {
      score: 0,
      state: "insufficient-data",
      r2: 0,
      slope: 0,
      regressionLine: [],
      windowValues: fcfMargins,
    };
  }

  const hadNegative = fcfMargins.some(m => m < 0);

  const lastTwoPositive =
    fcfMargins.length >= 2 &&
    fcfMargins[fcfMargins.length - 1] > 0 &&
    fcfMargins[fcfMargins.length - 2] > 0;

  const noReversionAfterPositive = (() => {
    let flipped = false;
    for (let i = 0; i < fcfMargins.length; i++) {
      if (fcfMargins[i] > 0) flipped = true;
      if (flipped && fcfMargins[i] < 0) return false;
    }
    return true;
  })();

  const {slope, r2} = calculateSlopeV2(fcfMargins);
  const regressionLine = buildRegressionLine(fcfMargins, slope);

  const rawScore = trendScore(slope, r2, 0.005);
  const score = Math.round(rawScore) // round the raw value to -1, 0, or 1

  // Persistent Flip Detection
  if (hadNegative && lastTwoPositive && noReversionAfterPositive) {
    return {
      score: 2,
      r2,
      state: "persistent-inflection",
      slope: 0,
      regressionLine,
      windowValues: fcfMargins,
    };
  }

  let state = "";
  if (score >= 1) state = "improving";
  else if (score <= -1) state = "deteriorating";
  else state = "stable";
  
  return {
    score,
    r2,
    state,
    slope,
    regressionLine,
    windowValues: fcfMargins
  }
}

// Calculate the incremental efficiency of the company
export function calculateIncrementalEfficiency(
  operatingIncome: number[],
  investedCapital: number[]
) {
  const efficiencies: number[] = [];

  for (let i = 1; i < operatingIncome.length; i++) {
    const changeInOI = operatingIncome[i] - operatingIncome[i - 1];
    const changeInIC = investedCapital[i] - investedCapital[i - 1];

    if (changeInIC === 0) {
      efficiencies.push(0);
    } else {
      efficiencies.push(changeInOI / changeInIC);
    }
  }

  return efficiencies;
}

export function scoreCapitalEfficiency(efficiencies: number[]) {
  if (efficiencies.length < 2) {
    return {
      score: 0,
      r2: 0,
      state: "insufficient-data",
      slope: 0,
      regressionLine: [],
    };
  }

  const {slope, r2} = calculateSlopeV2(efficiencies);
  const regressionLine = buildRegressionLine(efficiencies, slope);

  const rawScore = trendScore(slope, r2, 0.01);
  const score = Math.round(rawScore);

  let state = "";
  if (score >= 1) state = "improving";
  else if (score <= -1) state = "deteriorating";
  else state = "stable";

  return {
    score,
    r2, 
    state,
    slope,
    regressionLine,
    windowValues: efficiencies
  }
}

// Calculate total trajectory strength
export function calculateTrajectoryStrength(
  growthScore: number,
  marginScore: number,
  fcfScore: number,
  capitalScore: number
) {
  const total = growthScore + marginScore + fcfScore + capitalScore;

  let state: string;

  if (total >= 3) {
    state = "structural-compounder";
  } else if (total >= 1) {
    state = "positive-trajectory";
  } else if (total === 0) {
    state = "neutral";
  } else if (total <= -3) {
    state = "structural-deterioration";
  } else {
    state = "negative-trajectory";
  }

  return {
    total,
    state,
  };
}

