import { buildRegressionLine, calculateSlope } from "./helpers/slopeCalculation";

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
      score: 0,
      state: "insufficient-data",
    };
  }

  const slope = calculateSlope(growthRates);
  const regressionLine = buildRegressionLine(growthRates, slope);

  let score = 0;

  if (slope > 0.01) score = 2;
  else if (slope > 0.005) score = 1;
  else if (slope < -0.01) score = -2;
  else if (slope < -0.005) score = -1;
  else score = 0;

  let state = "neutral";

  if (score >= 2) state = "explosive-acceleration";
  else if (score === 1) state = "accelerating";
  else if (score === -1) state = "decelerating";
  else if (score <= -2) state = "structural-deceleration";

  return {
    slope,
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
      state: "insufficient-data",
      slope: 0,
    };
  }

  const slope = calculateSlope(margins);
  const regressionLine = buildRegressionLine(margins, slope);

  const epsilon = 0.005; // 0.5%

  if (slope > epsilon) {
    return {
      score: 1,
      state: "expanding",
      slope,
      regressionLine,
      windowValues: margins,
    };
  }

  if (slope < -epsilon) {
    return {
      score: -1,
      state: "compressing",
      slope,
      regressionLine,
      windowValues: margins,
    };
  }

  return {
    score: 0,
    state: "stable",
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
      slope: 0,
      regressionLine: [],
      windowValues: fcfMargins,
    };
  }

  const epsilon = 0.005;

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

  const slope = calculateSlope(fcfMargins);
  const regressionLine = buildRegressionLine(fcfMargins, slope);

  // Persistent Flip Detection
  if (hadNegative && lastTwoPositive && noReversionAfterPositive) {
    return {
      score: 2,
      state: "persistent-inflection",
      slope: 0,
      regressionLine,
      windowValues: fcfMargins,
    };
  }

  // Otherwise evaluate slope

  if (slope > epsilon) {
    return {
      score: 1,
      state: "improving",
      slope,
      regressionLine,
      windowValues: fcfMargins,
    };
  }

  if (slope < -epsilon) {
    return {
      score: -1,
      state: "deteriorating",
      slope,
      regressionLine,
      windowValues: fcfMargins,
    };
  }

  return {
    score: 0,
    state: "stable",
    slope,
    regressionLine,
    windowValues: fcfMargins,
  };
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
      state: "insufficient-data",
      slope: 0,
      regressionLine: [],
    };
  }

  const slope = calculateSlope(efficiencies);
  const regressionLine = buildRegressionLine(efficiencies, slope);

  const epsilon = 0.01;

  if (slope > epsilon) {
    return {
      score: 1,
      state: "improving",
      slope,
      regressionLine,
      windowValues: efficiencies,
    };
  }

  if (slope < -epsilon) {
    return {
      score: -1,
      state: "deteriorating",
      slope,
      regressionLine,
      windowValues: efficiencies,
    };
  }

  return {
    score: 0,
    state: "stable",
    slope,
    regressionLine,
    windowValues: efficiencies,
  };
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

