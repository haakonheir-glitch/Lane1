/**
 * Ability estimates for the accuracy tasks from the provisional difficulty table
 * (assessment/calibration/output/difficulty_table.json, PLAN D50). Deterministic: no model is
 * called at runtime; the table is fixed until it is recalibrated.
 *
 * Model per task × level: P(θ) = c + (1 − c)·σ(a(θ − b)), θ in SD units of the target
 * population (adults 18–35, Norway). Items within a level vary in difficulty (sd_b_within);
 * that spread is folded into the slope (probit approximation, D = 1.702):
 *   a_eff = a / √(1 + (a·sd_b_within / 1.702)²)
 * θ is the EAP estimate under a standard-normal prior on a fixed grid; its posterior SD gives
 * the 90% interval. EAP stays finite when every answer is right or wrong. Pure.
 */
import { normalCdf, Z90, type Normed } from "../core";

export type LevelParams = { a: number; b: number; c: number; sdBWithin: number };
export type LevelCount = { level: number; correct: number; scored: number };

const D = 1.702;
const GRID = Array.from({ length: 801 }, (_, i) => -4 + i * 0.01);

export const effectiveSlope = (p: LevelParams) => p.a / Math.sqrt(1 + ((p.a * p.sdBWithin) / D) ** 2);

export const pCorrect = (theta: number, p: LevelParams) => p.c + (1 - p.c) / (1 + Math.exp(-effectiveSlope(p) * (theta - p.b)));

/** EAP θ and posterior SD; null when there is nothing to score. */
export function estimateTheta(counts: { params: LevelParams; correct: number; scored: number }[]): { theta: number; psd: number } | null {
  const used = counts.filter((x) => x.scored > 0);
  if (!used.length) return null;
  const logPost = GRID.map((t) => {
    let l = -(t * t) / 2;
    for (const x of used) {
      const p = pCorrect(t, x.params);
      l += x.correct * Math.log(p) + (x.scored - x.correct) * Math.log(1 - p);
    }
    return l;
  });
  const max = Math.max(...logPost);
  const w = logPost.map((l) => Math.exp(l - max));
  const sum = w.reduce((s, v) => s + v, 0);
  const theta = GRID.reduce((s, t, i) => s + t * w[i]!, 0) / sum;
  const psd = Math.sqrt(GRID.reduce((s, t, i) => s + (t - theta) ** 2 * w[i]!, 0) / sum);
  return { theta, psd };
}

const pct = (z: number) => Math.round(normalCdf(z) * 100);

/**
 * A z score with its standard error as the app's `Normed` shape. Reliability is the share of
 * population variance (1) not explained by error: 1 − se².
 */
export function normedFromZ(z: number, se: number): Normed {
  const half = Z90 * se;
  return {
    z,
    t: 50 + 10 * z,
    ci: [50 + 10 * (z - half), 50 + 10 * (z + half)],
    percentile: pct(z),
    percentileBand: [pct(z - half), pct(z + half)],
    reliability: Math.max(0, 1 - se * se),
  };
}
