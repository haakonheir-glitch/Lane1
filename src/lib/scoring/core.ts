/**
 * Scoring primitives. Pure functions, no I/O. Rules come from the item files' `scoring`
 * blocks and BLUEPRINT.md §7.
 */

/** A response: the chosen value, or null when the item was skipped. */
export type Answer = number | null;

/** If key == -1, score = (max + 1) - response (file 01/02/07: 6 - response on a 1–5 scale). */
export function keyed(value: number, key: 1 | -1, max = 5): number {
  return key === -1 ? max + 1 - value : value;
}

/** Mean of the answered values, or null when fewer than `min` are answered. */
export function meanIfEnough(values: Answer[], min: number): number | null {
  const answered = values.filter((v): v is number => v !== null && v !== undefined);
  if (answered.length < min) return null;
  return answered.reduce((a, b) => a + b, 0) / answered.length;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Pearson correlation; NaN when either side has no variance. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return NaN;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26; |error| < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/* --------------------------------------------------------------------------
   Norm-referenced scores and intervals (BLUEPRINT §7)
   -------------------------------------------------------------------------- */

export type Psychometric = {
  /** Population mean and SD on the instrument's raw metric (e.g. facet item-mean 1–5). */
  mean: number;
  sd: number;
  /** Reliability (coefficient alpha or similar). */
  reliability: number;
};

/** z = 1.645: two-sided 90% interval. */
export const Z90 = 1.645;
/** z = 1.96: 95% criterion for differences. */
export const Z95 = 1.96;

/** SEM = SD × √(1 − r). */
export function sem(sd: number, r: number): number {
  return sd * Math.sqrt(1 - r);
}

export type Normed = {
  z: number;
  /** T score: 50 + 10z. */
  t: number;
  /** 90% interval on the T metric: T ± 1.645 × SEM_T, where SEM_T = 10√(1 − r). */
  ci: [number, number];
  /** Percentile of the point estimate, and of the interval ends. */
  percentile: number;
  percentileBand: [number, number];
  reliability: number;
};

export function normed(raw: number, p: Psychometric): Normed {
  const z = (raw - p.mean) / p.sd;
  const t = 50 + 10 * z;
  const half = Z90 * 10 * Math.sqrt(1 - p.reliability);
  const pct = (x: number) => Math.round(normalCdf((x - 50) / 10) * 100);
  return {
    z,
    t,
    ci: [t - half, t + half],
    percentile: pct(t),
    percentileBand: [pct(t - half), pct(t + half)],
    reliability: p.reliability,
  };
}

/** Standard error of the difference between two of one person's z-scores: √(2 − r₁ − r₂). */
export function diffSE(r1: number, r2: number): number {
  return Math.sqrt(2 - r1 - r2);
}

/**
 * BLUEPRINT §7 step 3–4: a gap between two of your own scores counts only when
 * |z₁ − z₂| > 1.96 × √(2 − r₁ − r₂). With r = .75 for both, that is ≈ 1.39 SD.
 */
export function isClearDifference(z1: number, r1: number, z2: number, r2: number): boolean {
  return Math.abs(z1 - z2) > Z95 * diffSE(r1, r2);
}
