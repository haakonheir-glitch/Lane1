/**
 * Career side of the Work Design model: each career path's score on every dimension, from its
 * O*NET profile (taxonomy/derived/lane_onet_profiles.json). A dimension is the weighted mean of
 * its elements' percentiles (0–100 across all O*NET occupations); "reverse" uses 100 − percentile.
 * Pure.
 */
import { DIMENSIONS, PAYOFF_VARIANCE, type CareerInput, type Dimension } from "./model";

/** The shape build_onet_profiles.py writes for one career path. */
export type LaneOnetProfile = {
  name: string;
  provenance: "onet" | "estimated" | "unlinked";
  n_occupations: number;
  coverage_confidence: number | null;
  taxonomy: { payoff: string; payoff_variance: number | null };
  descriptors: Record<string, Record<string, Record<string, { raw: number; pct: number; adjusted?: number }>>>;
};

export type CareerDimensionScore = {
  id: string;
  /** 0–100, or null when less than half the dimension's element weight is in the profile. */
  value: number | null;
  coverage: number;
  provenance: LaneOnetProfile["provenance"];
};

function inputValue(c: CareerInput, p: LaneOnetProfile): number | null {
  if ("taxonomy" in c) return p.taxonomy.payoff_variance ?? PAYOFF_VARIANCE[p.taxonomy.payoff] ?? null;
  const cell = p.descriptors[c.source.file]?.[c.element]?.[c.source.scale];
  if (!cell) return null;
  return c.reverse ? 100 - cell.pct : cell.pct;
}

export function careerDimension(d: Dimension, p: LaneOnetProfile): CareerDimensionScore {
  const total = d.career.reduce((a, c) => a + c.weight, 0);
  let w = 0;
  let sum = 0;
  for (const c of d.career) {
    const v = inputValue(c, p);
    if (v === null) continue;
    w += c.weight;
    sum += c.weight * v;
  }
  const coverage = total ? w / total : 0;
  return { id: d.id, value: w && coverage >= 0.5 ? sum / w : null, coverage, provenance: p.provenance };
}

export function careerWorkDesign(p: LaneOnetProfile, dims: Dimension[] = DIMENSIONS): Record<string, CareerDimensionScore> {
  return Object.fromEntries(dims.map((d) => [d.id, careerDimension(d, p)]));
}
