// ──────────────────────────────────────────────────────────────────────
// Adaptive Optimal Exit Boundary Module
//
// Mathematically derived per-stock dynamic sell boundaries based on:
//   • Geometric Brownian Motion (GBM) log-normal distribution
//   • Drift-adjusted confidence intervals
//   • Valuation mean-reversion penalty
//   • Volatility scaling
//
// Under GBM: dS = μS dt + σS dW, the log-price at horizon T is:
//   ln(S_T/S₀) ~ N((μ - ½σ²)T, σ²T)
//
// Upper boundary = S₀ · exp((μ - ½σ²)T + z_α · σ√T)
// Lower boundary = S₀ · exp((μ - ½σ²)T - z_α · σ√T)
//
// Where z_α = Φ⁻¹(1 - α) is the normal quantile for risk tolerance α.
//
// References:
//   Hull (2018)       — Options, Futures, and Other Derivatives
//   Merton (1973)     — Continuous-Time Finance
//   Dixit & Pindyck   — Investment Under Uncertainty
// ──────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────

/** Minimum volatility floor to prevent degenerate boundaries */
const SIGMA_MIN = 0.01;

/** Minimum alpha floor to prevent extreme quantiles */
const ALPHA_MIN = 0.01;

/** Valuation penalty sensitivity — arctan-compressed, so this is the
 *  maximum possible penalty as premium → ∞. With γ=0.15, max λ ≈ 0.15. */
const GAMMA_DEFAULT = 0.15;

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export interface ExitBoundaryInput {
  /** Entry price (S₀) */
  entryPrice: number;
  /** Annualized volatility (σ_i), typically 0.15–0.80 */
  annualizedVolatility: number;
  /** Forward earnings growth rate (g_i), e.g. 0.15 for 15% */
  forwardEarningsGrowth: number;
  /** Beta to market (β_i), default 1.0 */
  betaToMarket?: number;
  /** Expected annual market return (μ_m), default 0.10 */
  expectedMarketReturn?: number;
  /** Sector average P/E or EV/EBITDA */
  sectorPE: number;
  /** Stock P/E or EV/EBITDA */
  stockPE: number;
  /** Risk-free rate (r), default 0.045 */
  riskFreeRate?: number;
  /** Risk tolerance alpha (α), probability of acceptable loss, default 0.20 */
  riskToleranceAlpha?: number;
  /** Investment horizon in years (T), default 1 */
  holdingPeriodYears?: number;
  /** Optional enhancement flags */
  options?: ExitBoundaryOptions;
}

export interface ExitBoundaryOptions {
  /**
   * Widen boundaries by 20% to account for unstable realized vol.
   * Use when trailing vol is significantly different from forward vol.
   */
  rollingVolatilityAdjustment?: boolean;
  /**
   * Adjust drift by analyst earnings revision delta.
   * Positive = upward revision → higher expected drift.
   */
  earningsRevisionAdjustment?: { revisionDelta: number };
  /**
   * Scale drift by a macro regime multiplier.
   * < 1.0 for risk-off (recession fears), > 1.0 for risk-on (expansion).
   */
  macroRegimeAdjustment?: { regimeMultiplier: number };
  /**
   * Tighten the downside boundary as the holding period elapses.
   * Provides time-decay driven stop tightening (like a trailing stop).
   */
  timeDecayStopTightening?: { elapsedYears: number };
}

export interface ExitBoundaryResult {
  /** Take-profit target: upper confidence boundary */
  upperBoundary: number;
  /** Stop-loss level: lower confidence boundary */
  lowerBoundary: number;
  /** Risk-adjusted expected drift (μ_i after penalties) */
  expectedDrift: number;
  /** Valuation compression penalty (λ_i) */
  valuationPenalty: number;
  /** z-score used for boundary width */
  zScore: number;
  /** Distance from entry to upper boundary, as fraction of S₀ */
  upsidePotential: number;
  /** Distance from entry to lower boundary, as fraction of S₀ */
  downsideRisk: number;
  /** Reward-to-risk ratio (upside / downside distance) */
  rewardToRisk: number;
  /** Which optional enhancements were applied */
  enhancementsApplied: string[];
}

// ──────────────────────────────────────────────────
// Inverse Normal CDF (Probit)
// ──────────────────────────────────────────────────

/**
 * Abramowitz & Stegun rational approximation (formula 26.2.23).
 * Accurate to |ε| < 4.5 × 10⁻⁴ for p ∈ (0, 1).
 */
export function probitApprox(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Reflect around 0.5
  const isLower = p < 0.5;
  const pp = isLower ? p : 1 - p;

  const t = Math.sqrt(-2 * Math.log(pp));

  // Rational approximation coefficients
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  const z = t - (c0 + c1 * t + c2 * t * t) /
                (1 + d1 * t + d2 * t * t + d3 * t * t * t);

  return isLower ? -z : z;
}

// ──────────────────────────────────────────────────
// Core Computation
// ──────────────────────────────────────────────────

export function computeExitBoundaries(input: ExitBoundaryInput): ExitBoundaryResult {
  const {
    entryPrice: S0,
    forwardEarningsGrowth: g,
    sectorPE,
    stockPE,
    options,
  } = input;

  // Apply defaults
  const beta = input.betaToMarket ?? 1.0;
  const mu_m = input.expectedMarketReturn ?? 0.10;
  const alpha = Math.max(ALPHA_MIN, input.riskToleranceAlpha ?? 0.20);
  const T = Math.max(0.01, input.holdingPeriodYears ?? 1.0);
  const enhancementsApplied: string[] = [];

  // ─── VOLATILITY ────────────────────────────────
  let sigma = Math.max(SIGMA_MIN, input.annualizedVolatility);

  if (options?.rollingVolatilityAdjustment) {
    sigma *= 1.2;
    enhancementsApplied.push("rolling-volatility-adjustment");
  }

  // ─── STEP 1: VALUATION COMPRESSION RISK ────────
  // Uses arctan compression to prevent extreme penalties for
  // high-multiple growth stocks. Without compression, a stock at
  // 5× sector PE would get λ = 1.50 (150% annual penalty) — absurd.
  //
  // With arctan: λ = γ · (2/π) · arctan(premium)
  //   premium = 0  → λ = 0
  //   premium = 1  → λ ≈ 0.075  (modest 7.5% penalty)
  //   premium = 3  → λ ≈ 0.12   (12% penalty)
  //   premium = 10 → λ ≈ 0.14   (saturates around 14%)
  const pePremium = sectorPE > 0
    ? Math.max(0, (stockPE - sectorPE) / sectorPE)
    : 0;

  const lambda = GAMMA_DEFAULT * (2 / Math.PI) * Math.atan(pePremium);

  // ─── STEP 2: EXPECTED DRIFT ────────────────────
  // μ = g + β·μ_m − λ
  // Floor: penalty should never push drift below -20% annualized.
  // Even a bearish thesis doesn't predict >20%/yr structural decline.
  const rawMu = g + beta * mu_m - lambda;
  let mu = Math.max(-0.20, rawMu);

  if (options?.earningsRevisionAdjustment) {
    mu += options.earningsRevisionAdjustment.revisionDelta;
    enhancementsApplied.push("earnings-revision-adjustment");
  }

  if (options?.macroRegimeAdjustment) {
    mu *= options.macroRegimeAdjustment.regimeMultiplier;
    enhancementsApplied.push("macro-regime-adjustment");
  }

  // ─── STEP 3: Z-SCORE FOR BOUNDARIES ────────────
  // z_α = Φ⁻¹(1 − α)
  // α = 0.05 → z ≈ 1.645 (tight, aggressive)
  // α = 0.20 → z ≈ 0.842 (wider, conservative)
  // α = 0.10 → z ≈ 1.282 (balanced)
  const z = probitApprox(1 - alpha);

  // ─── STEP 4: GBM CONFIDENCE BOUNDARIES ─────────
  // Under GBM, ln(S_T/S₀) ~ N(drift_term, vol_term²) where:
  //   drift_term = (μ − ½σ²) · T
  //   vol_term   = σ · √T
  //
  // Upper = S₀ · exp(drift_term + z · vol_term)   [take-profit]
  // Lower = S₀ · exp(drift_term − z · vol_term)   [stop-loss]

  let effectiveT = T;

  if (options?.timeDecayStopTightening) {
    const elapsed = Math.max(0, options.timeDecayStopTightening.elapsedYears);
    effectiveT = Math.max(0.01, T - elapsed);
    enhancementsApplied.push("time-decay-stop-tightening");
  }

  const sigma2 = sigma * sigma;
  
  // Asymmetric drift logic:
  // - Upper Boundary (Target): Uses positive drift if any, cap negative drift to 0 (we only target positive moves).
  // - Lower Boundary (Stop): Uses negative drift if any, ignores positive drift (stops protect against the growth thesis failing).
  //
  // Note: We remove the Ito correction (-0.5 * sigma^2) from the drift terms.
  // In a strict GBM, the median path drifts downward from S0 by this amount.
  // However, for practical trading stops, traders don't want their stops mechanically widened
  // by volatility drag. They want symmetric risk bands around their expected log-returns.
  const upperMu = Math.max(0, mu);
  const lowerMu = Math.min(0, mu);
  
  const upperDriftTerm = upperMu * effectiveT;
  const lowerDriftTerm = lowerMu * effectiveT;
  
  const volTerm = sigma * Math.sqrt(effectiveT);

  const upperBoundary = S0 * Math.exp(upperDriftTerm + z * volTerm);
  const lowerBoundary = S0 * Math.exp(lowerDriftTerm - z * volTerm);

  // ─── STEP 5: DERIVED METRICS ──────────────────

  const upsidePotential = (upperBoundary - S0) / S0;
  const downsideRisk = (S0 - lowerBoundary) / S0;
  const rewardToRisk = downsideRisk > 0 ? upsidePotential / downsideRisk : 99.9;

  return {
    upperBoundary,
    lowerBoundary,
    expectedDrift: mu,
    valuationPenalty: lambda,
    zScore: z,
    upsidePotential,
    downsideRisk,
    rewardToRisk,
    enhancementsApplied,
  };
}

// ──────────────────────────────────────────────────
// Portfolio-Level Vectorization
// ──────────────────────────────────────────────────

/**
 * Compute exit boundaries for an entire portfolio in one call.
 * Pure map — trivially parallelizable, no cross-stock dependencies.
 */
export function computePortfolioExitBoundaries(
  inputs: ExitBoundaryInput[]
): ExitBoundaryResult[] {
  return inputs.map(computeExitBoundaries);
}
