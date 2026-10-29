/**
 * Person side of the Work Design model: every input as a 0–100 estimate with a standard error,
 * then each dimension as a weighted combination with its error propagated. Pure; reads computed
 * scores only.
 *
 * The 0–100 scale (all provisional; see docs/WORK_DESIGN.md, "Person-side scale"):
 * - "normed": a population percentile where norms exist (interests: the published O*NET Short-IP
 *   norms; reasoning: provisional norms), with the error from the published reliability;
 * - "anchored": a scale without transcribed population norms (personality, for now) is placed on
 *   the scale with the scale midpoint at 50; the error uses BLUEPRINT §7's SEM = SD × √(1 − r) with
 *   a planning SD and the planning reliabilities from scoring/self.ts;
 * - "ipsative": work values come from a forced card sort, so they are relative to the person
 *   (mapped by expected normal order statistics; see valueEstimates);
 * - "task": behaviour tasks, anchored to the task's own range (no norms yet).
 */
import type { ProfileScores } from "../scoring/profile";
import type { ScaleScore } from "../scoring/types";
import { ASSUMED_RELIABILITY } from "../scoring/self";
import { normalCdf } from "../scoring/core";
import { ENVIRONMENT, VALUE_MODES, WORK_DESIGN_VERSION, type Dimension, type PersonConstructId } from "./model";

export type Provenance = "normed" | "anchored" | "ipsative" | "task";
export type Estimate = { value: number; se: number; provenance: Provenance; source: string };

/** Planning SDs on the 0–100 anchored scale, until published norms are transcribed (assumptions, documented). */
export const PLANNING_SD = { personality: 15, interests: 20, values: 20, task: 20 } as const;
const Z90 = 1.645;
const clamp = (x: number, a = 0, b = 100) => Math.min(b, Math.max(a, x));

/**
 * How person inputs are built (part of each matching config, so older configs stay reproducible):
 * - norms: use population norms where the scoring has them (false: every interest and personality
 *   score anchored, as before the norms were transcribed);
 * - values: "orderStats" (expected normal order statistics, shrunk) or "minmax" (lowest 0, highest 100).
 */
export type InputOptions = { norms: boolean; values: "orderStats" | "minmax" };
export const DEFAULT_INPUT_OPTIONS: InputOptions = { norms: true, values: "orderStats" };

/**
 * Expected values of the normal order statistics for n = 6 (Harter 1961; Teichroew 1956), largest
 * first. A rank in a forced sort is evidence about where a value sits in the person's own
 * distribution, not that the top value is "100": this is the best estimate of the underlying
 * standard-normal score of the value ranked i-th of 6.
 */
export const ORDER_STATS_6 = [1.267, 0.642, 0.202, -0.202, -0.642, -1.267] as const;
/**
 * Order-statistic z-scores are multiplied by this before becoming a percentile. A six-card sort
 * separates adjacent values only roughly (test–retest of single ranks is far from perfect), so the
 * estimate is pulled towards the middle: the top value becomes the 81st percentile, not the 90th.
 * Provisional, like the other planning values.
 */
export const VALUES_SHRINKAGE = 0.7;

/** Blom's approximation to the expected normal order statistic, for sorts that aren't of 6. */
const blom = (i: number, n: number) => -probit((i - 0.375) / (n + 0.25));

/**
 * Work values (forced card sort scores, higher = more important) → 0–100 estimates.
 * orderStats: each value's rank (ties take the average of the order statistics they span) → its
 * expected normal order statistic × VALUES_SHRINKAGE → percentile. minmax: lowest 0, highest 100.
 */
export function valueEstimates(scores: number[], method: InputOptions["values"]): number[] {
  if (method === "minmax") {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    return scores.map((x) => (max === min ? 50 : ((x - min) / (max - min)) * 100));
  }
  const n = scores.length;
  const stat = (i: number) => (n === 6 ? ORDER_STATS_6[i]! : blom(i + 1, n));
  const order = scores.map((x, i) => [x, i] as const).sort((a, b) => b[0] - a[0]);
  const z = new Array<number>(n);
  for (let r = 0; r < n; ) {
    let e = r;
    while (e + 1 < n && order[e + 1]![0] === order[r]![0]) e++;
    let sum = 0;
    for (let k = r; k <= e; k++) sum += stat(k);
    for (let k = r; k <= e; k++) z[order[k]![1]] = sum / (e - r + 1);
    r = e + 1;
  }
  return z.map((x) => normalCdf(VALUES_SHRINKAGE * x) * 100);
}

/** Inverse normal CDF (Acklam's rational approximation, relative error < 1.2e-9). */
export function probit(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155211572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  if (q < 0.02425) {
    const u = Math.sqrt(-2 * Math.log(q));
    return (((((c[0]! * u + c[1]!) * u + c[2]!) * u + c[3]!) * u + c[4]!) * u + c[5]!) / ((((d[0]! * u + d[1]!) * u + d[2]!) * u + d[3]!) * u + 1);
  }
  if (q > 1 - 0.02425) return -probit(1 - q);
  const u = q - 0.5;
  const r = u * u;
  return ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * u) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** A percentile band (90%) → value and SE on 0–100. */
const fromBand = ([lo, hi]: [number, number], source: string): Estimate => ({ value: (lo + hi) / 2, se: Math.max(1, (hi - lo) / (2 * Z90)), provenance: "normed", source });

export function fromScale(s: ScaleScore | undefined, kind: "facet" | "scale", sd: number, source: string, norms = true): Estimate | null {
  if (!s || s.raw === null) return null;
  if (s.normed && norms) return fromBand(s.normed.percentileBand, source);
  const [lo, hi] = s.rawRange;
  return { value: clamp(((s.raw - lo) / (hi - lo)) * 100), se: sd * Math.sqrt(1 - ASSUMED_RELIABILITY[kind]), provenance: "anchored", source };
}

/** Every person-side input the model can use, from the profile. Missing scores are absent. */
export function personInputs(p: ProfileScores, opts: InputOptions = DEFAULT_INPUT_OPTIONS): Partial<Record<PersonConstructId, Estimate>> {
  const out: Partial<Record<PersonConstructId, Estimate>> = {};
  for (const s of p.interests?.scales ?? []) {
    const e = fromScale(s, "scale", PLANNING_SD.interests, `interests.${s.code}`, opts.norms);
    if (e) out[`interests.${s.code}` as PersonConstructId] = e;
  }
  for (const s of p.personality?.domains ?? []) {
    const e = fromScale(s, "scale", PLANNING_SD.personality, `personality.${s.id}`, opts.norms);
    if (e) out[`neo.${s.id}` as PersonConstructId] = e;
  }
  for (const s of p.personality?.facets ?? []) {
    const e = fromScale(s, "facet", PLANNING_SD.personality, `personality.facet.${s.id}`, opts.norms);
    if (e) out[`neo.${s.id}` as PersonConstructId] = e;
  }
  const values = p.values?.filter((v) => v.visibility === "user") ?? [];
  if (values.length >= 3) {
    const est = valueEstimates(values.map((v) => v.score), opts.values);
    values.forEach((v, i) => {
      out[`values.${v.id}` as PersonConstructId] = { value: est[i]!, se: PLANNING_SD.values * Math.sqrt(1 - ASSUMED_RELIABILITY.scale), provenance: "ipsative", source: `values.${v.id}` };
    });
  }
  const r = p.reasoning;
  if (r?.generalAbility) out["reasoning.general"] = fromBand(r.generalAbility.percentileBand, "reasoning.general");
  for (const a of r?.areas ?? []) if (a.normed) out[`reasoning.${a.id}` as PersonConstructId] = fromBand(a.normed.percentileBand, `reasoning.${a.id}`);
  const b = p.behaviour;
  const taskSe = PLANNING_SD.task * Math.sqrt(1 - ASSUMED_RELIABILITY.scale);
  if (b?.risk?.adjustedPumps != null) out["behaviour.risk"] = { value: clamp((b.risk.adjustedPumps / 64) * 100), se: taskSe, provenance: "task", source: "behaviour.balloon.adjustedPumps" };
  if (b?.patience?.auc != null) out["behaviour.patience"] = { value: clamp(b.patience.auc * 100), se: taskSe, provenance: "task", source: "behaviour.discount.auc" };
  // Improvement against your own start: 0% maps to 50, +50% or more to 100, −50% or less to 0.
  if (b?.learning?.relativeRate != null) out["behaviour.learning"] = { value: clamp(50 + b.learning.relativeRate * 100), se: taskSe, provenance: "task", source: "behaviour.learning.relativeRate" };
  return out;
}

export type DimensionScore = {
  id: string;
  name: string;
  archetype?: string;
  /** null when less than half of the dimension's input weight is measured. */
  value: number | null;
  se: number | null;
  /** Share of the dimension's input weight that was measured (0–1). */
  coverage: number;
  /** "provisional" while any input is anchored, ipsative or task-based (always, for now). */
  provenance: "provisional" | "normed";
  inputs: { id: PersonConstructId; weight: number; reverse: boolean; value: number; se: number }[];
};

/**
 * A dimension as the weighted mean of its measured inputs; weights are renormalised over what
 * was measured. SE = √Σ(wᵢ²·seᵢ²) with normalised weights, assuming independent errors (an
 * approximation: correlated inputs would widen it a little).
 */
export function scoreDimension(d: Dimension, inputs: Partial<Record<PersonConstructId, Estimate>>): DimensionScore {
  const total = d.person.reduce((a, x) => a + x.weight, 0);
  const used = d.person.flatMap((x) => {
    const e = inputs[x.id];
    return e ? [{ id: x.id, weight: x.weight, reverse: !!x.reverse, value: x.reverse ? 100 - e.value : e.value, se: e.se, normed: e.provenance === "normed" }] : [];
  });
  const w = used.reduce((a, x) => a + x.weight, 0);
  const coverage = total ? w / total : 0;
  const base = { id: d.id, name: d.name, archetype: d.archetype, coverage, inputs: used.map((x) => ({ id: x.id, weight: x.weight, reverse: x.reverse, value: x.value, se: x.se })) };
  if (!used.length || coverage < 0.5) return { ...base, value: null, se: null, provenance: "provisional" };
  const value = used.reduce((a, x) => a + (x.weight / w) * x.value, 0);
  const se = Math.sqrt(used.reduce((a, x) => a + (x.weight / w) ** 2 * x.se ** 2, 0));
  return { ...base, value, se, provenance: used.every((x) => x.normed) ? "normed" : "provisional" };
}

export type Relative = "strength" | "weakness" | "none";

/**
 * BLUEPRINT §7's reliability rule applied to a profile of dimensions: a dimension is a strength
 * (or weakness) only when its gap from the person's own mean beats 1.96 × the error of that gap.
 * The error of (xᵢ − mean) is √(seᵢ²(1 − 1/n)² + Σⱼ≠ᵢ seⱼ²/n²), assuming independent errors.
 */
export function relativeOfDimensions(scores: DimensionScore[]): Record<string, Relative> {
  const ok = scores.filter((s) => s.value !== null && s.se !== null);
  const out: Record<string, Relative> = Object.fromEntries(scores.map((s) => [s.id, "none" as Relative]));
  const n = ok.length;
  if (n < 3) return out;
  const mean = ok.reduce((a, s) => a + s.value!, 0) / n;
  for (const s of ok) {
    const others = ok.filter((o) => o !== s).reduce((a, o) => a + o.se! ** 2, 0) / n ** 2;
    const seGap = Math.sqrt(s.se! ** 2 * (1 - 1 / n) ** 2 + others);
    const gap = s.value! - mean;
    out[s.id] = gap > 1.96 * seGap ? "strength" : gap < -1.96 * seGap ? "weakness" : "none";
  }
  return out;
}

/**
 * Pairs of value modes that share at least half their input weight. They are built from the same
 * scores, so they will usually not separate for one person; the report says so instead of forcing
 * a distinction.
 */
export function overlappingModes(modes: Dimension[] = VALUE_MODES, threshold = 0.5): [string, string][] {
  const share = (a: Dimension, b: Dimension) => {
    const ta = a.person.reduce((s, x) => s + x.weight, 0);
    const tb = b.person.reduce((s, x) => s + x.weight, 0);
    let shared = 0;
    for (const x of a.person) {
      const y = b.person.find((z) => z.id === x.id && !!z.reverse === !!x.reverse);
      if (y) shared += Math.min(x.weight / ta, y.weight / tb);
    }
    return shared;
  };
  const out: [string, string][] = [];
  for (let i = 0; i < modes.length; i++) for (let j = i + 1; j < modes.length; j++) if (share(modes[i]!, modes[j]!) >= threshold) out.push([modes[i]!.id, modes[j]!.id]);
  return out;
}

export type WorkDesignProfile = {
  version: string;
  valueModes: (DimensionScore & { relative: Relative })[];
  environment: DimensionScore[];
  /** Mode pairs that can't be told apart by design (shared inputs). */
  inseparable: [string, string][];
  inputs: Partial<Record<PersonConstructId, Estimate>>;
};

export function personWorkDesign(p: ProfileScores, version = WORK_DESIGN_VERSION, opts: InputOptions = DEFAULT_INPUT_OPTIONS): WorkDesignProfile {
  const inputs = personInputs(p, opts);
  const modes = VALUE_MODES.map((d) => scoreDimension(d, inputs));
  const rel = relativeOfDimensions(modes);
  return {
    version,
    valueModes: modes.map((m) => ({ ...m, relative: rel[m.id] ?? "none" })),
    environment: ENVIRONMENT.map((d) => scoreDimension(d, inputs)),
    inseparable: overlappingModes(),
    inputs,
  };
}
