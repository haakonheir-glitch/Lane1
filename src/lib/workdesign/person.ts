/**
 * Person side of the Work Design model: every input as a 0–100 estimate with a standard error,
 * then each dimension as a weighted combination with its error propagated. Pure; reads computed
 * scores only.
 *
 * The 0–100 scale (all provisional; see docs/WORK_DESIGN.md, "Person-side scale"):
 * - "normed": a population percentile where norms exist (reasoning: provisional norms);
 * - "anchored": interest and personality scores have no transcribed population norms, so the
 *   raw score is placed on the scale with the scale midpoint at 50; the error uses BLUEPRINT §7's
 *   SEM = SD × √(1 − r) with a planning SD and the planning reliabilities from scoring/self.ts;
 * - "ipsative": work values come from a forced card sort, so they are relative to the person;
 * - "task": behaviour tasks, anchored to the task's own range (no norms yet).
 */
import type { ProfileScores } from "../scoring/profile";
import type { ScaleScore } from "../scoring/types";
import { ASSUMED_RELIABILITY } from "../scoring/self";
import { ENVIRONMENT, VALUE_MODES, WORK_DESIGN_VERSION, type Dimension, type PersonConstructId } from "./model";

export type Provenance = "normed" | "anchored" | "ipsative" | "task";
export type Estimate = { value: number; se: number; provenance: Provenance; source: string };

/** Planning SDs on the 0–100 anchored scale, until published norms are transcribed (assumptions, documented). */
export const PLANNING_SD = { personality: 15, interests: 20, values: 20, task: 20 } as const;
const Z90 = 1.645;
const clamp = (x: number, a = 0, b = 100) => Math.min(b, Math.max(a, x));

/** A percentile band (90%) → value and SE on 0–100. */
const fromBand = ([lo, hi]: [number, number], source: string): Estimate => ({ value: (lo + hi) / 2, se: Math.max(1, (hi - lo) / (2 * Z90)), provenance: "normed", source });

function fromScale(s: ScaleScore | undefined, kind: "facet" | "scale", sd: number, source: string): Estimate | null {
  if (!s || s.raw === null) return null;
  if (s.normed) return fromBand(s.normed.percentileBand, source);
  const [lo, hi] = s.rawRange;
  return { value: clamp(((s.raw - lo) / (hi - lo)) * 100), se: sd * Math.sqrt(1 - ASSUMED_RELIABILITY[kind]), provenance: "anchored", source };
}

/** Every person-side input the model can use, from the profile. Missing scores are absent. */
export function personInputs(p: ProfileScores): Partial<Record<PersonConstructId, Estimate>> {
  const out: Partial<Record<PersonConstructId, Estimate>> = {};
  for (const s of p.interests?.scales ?? []) {
    const e = fromScale(s, "scale", PLANNING_SD.interests, `interests.${s.code}`);
    if (e) out[`interests.${s.code}` as PersonConstructId] = e;
  }
  for (const s of p.personality?.domains ?? []) {
    const e = fromScale(s, "scale", PLANNING_SD.personality, `personality.${s.id}`);
    if (e) out[`neo.${s.id}` as PersonConstructId] = e;
  }
  for (const s of p.personality?.facets ?? []) {
    const e = fromScale(s, "facet", PLANNING_SD.personality, `personality.facet.${s.id}`);
    if (e) out[`neo.${s.id}` as PersonConstructId] = e;
  }
  const values = p.values?.filter((v) => v.visibility === "user") ?? [];
  if (values.length >= 3) {
    const xs = values.map((v) => v.score);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    for (const v of values) {
      out[`values.${v.id}` as PersonConstructId] = { value: max === min ? 50 : ((v.score - min) / (max - min)) * 100, se: PLANNING_SD.values * Math.sqrt(1 - ASSUMED_RELIABILITY.scale), provenance: "ipsative", source: `values.${v.id}` };
    }
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

export function personWorkDesign(p: ProfileScores, version = WORK_DESIGN_VERSION): WorkDesignProfile {
  const inputs = personInputs(p);
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
