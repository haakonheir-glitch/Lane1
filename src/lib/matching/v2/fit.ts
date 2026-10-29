/**
 * Matching v2: person–environment fit on O*NET career profiles. Pure and deterministic (the
 * Monte Carlo seed comes from the profile). No LLM calls. Method: docs/MATCHING_V2.md.
 *
 * Fulfilment fit (needs–supplies, the headline) combines five components, each a 0–1 score per
 * career path:
 * - interests: regularised correlation of the person's RIASEC profile with the career's O*NET OI profile;
 * - values: the same for ranked work values against the career's Work Values extents;
 * - value modes: the same across the nine modes;
 * - environment: per dimension, the model's penalty shape, weighted by the strength of the need;
 * - challenge: under-challenge only (Cognitive challenge, deficit penalty);
 * - strengths: regularised correlation of the person's reasoning areas (each against their own
 *   average) with the career's ability demands across the same areas (each a percentile across
 *   occupations): careers that lean on the person's strongest reasoning areas score higher.
 * Each component is standardised across the person's career paths (so each weight is its real
 * share of the ranking), weighted (V2_CONFIG.weights) and put on a T-like scale: 50 = the person's
 * average career path.
 *
 * Ability fit (demands–abilities, secondary): importance-weighted shortfall of the person's
 * reasoning percentiles against the career's ability demands (0–100). Surplus doesn't count.
 *
 * Uncertainty: the person's inputs are drawn from their standard errors (V2_CONFIG.draws times),
 * every career path is rescored per draw, and bands come from rank stability.
 *
 * Guards: a personality facet's share of any fit is measured per person, and the facet is shrunk
 * towards its domain score until no fit leans on it for more than V2_CONFIG.facetCap. Likewise
 * (v2-0.5) no environment dimension may carry more than V2_CONFIG.envCap of any fit: its need weight
 * is shrunk until it doesn't.
 *
 * Ensemble (v2-0.5): each draw also draws the component weights (Dirichlet around the configured
 * weights) and, half the time, flat environment weighting; a band must hold under both weightings.
 */
import { ENVIRONMENT, VALUE_MODES, type Dimension, type PersonConstructId } from "../../workdesign/model";
import { overlappingModes, relativeOfDimensions, type Relative } from "../../workdesign/person";
import { V2_CONFIG, type V2Config } from "./config";
import {
  RIASEC,
  WORK_VALUES,
  type AbilityArea,
  type ArchetypeBlend,
  type BandV2,
  type Components,
  type Distribution,
  type Driver,
  type EnvGuard,
  type FacetGuard,
  type FitV2,
  type LaneMatchV2,
  type LaneProfileV2,
  type MatchResultV2,
  type PersonProfile,
} from "./types";

const ENV_DIMS = ENVIRONMENT.filter((d) => d.id !== "challenge");
const CHALLENGE = ENVIRONMENT.find((d) => d.id === "challenge")!;
const AREAS: AbilityArea[] = ["reasoning", "quantitative", "spatial", "memory", "speed"];
const RIASEC_NAME: Record<string, string> = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };
const DOMAIN_OF: Record<string, string> = { N: "Neuroticism", E: "Extraversion", O: "Openness", A: "Agreeableness", C: "Conscientiousness" };

type Key = keyof V2Config["weights"];
const KEYS: Key[] = ["interests", "values", "valueModes", "environment", "challenge", "strengths"];
const AREA_NAME: Record<AbilityArea, string> = { reasoning: "Reasoning", quantitative: "Quantitative", spatial: "Spatial", memory: "Memory", speed: "Speed" };
type Values = Partial<Record<PersonConstructId, number>>;

/* ------------------------------------------------------------- statistics ---- */

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};
const clamp = (x: number, lo = 0, hi = 100) => (x < lo ? lo : x > hi ? hi : x);

/** Centred, unit-length vector (null if it has no spread). */
function unit(xs: number[]): number[] | null {
  const m = mean(xs);
  const c = xs.map((x) => x - m);
  const n = Math.sqrt(c.reduce((a, b) => a + b * b, 0));
  return n < 1e-9 ? null : c.map((x) => x / n);
}

/**
 * The person's side of a regularised profile correlation: centred scores divided by
 * max(‖x − x̄‖, floor·√n). Dotted with the career's unit vector this is Pearson r when the person's
 * profile has spread, and shrinks towards 0 (neutral) when it's nearly flat.
 */
function regularised(xs: number[], floor: number): number[] {
  const m = mean(xs);
  const c = xs.map((x) => x - m);
  const n = Math.max(Math.sqrt(c.reduce((a, b) => a + b * b, 0)), floor * Math.sqrt(xs.length));
  return c.map((x) => x / n);
}
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);

function distribution(xs: number[]): Distribution {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]!;
  const r = (x: number) => Math.round(x * 10) / 10;
  return { mean: r(mean(s)), sd: r(sd(s)), p10: r(q(0.1)), p50: r(q(0.5)), p90: r(q(0.9)) };
}
const EMPTY: Distribution = { mean: NaN, sd: NaN, p10: NaN, p50: NaN, p90: NaN };

/** Deterministic PRNG (mulberry32) with standard normal draws (Box–Muller). */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    const u = Math.max(next(), 1e-12);
    const v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

/** Deterministic uniform PRNG (mulberry32), for the ensemble's own draws. */
function uniform(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.max(((t ^ (t >>> 14)) >>> 0) / 4294967296, 1e-12);
  };
}

/** Gamma(shape, 1) by Marsaglia–Tsang (shape < 1 boosted by U^(1/shape)). */
function gamma(shape: number, u: () => number, normal: () => number): number {
  if (shape < 1) return gamma(shape + 1, u, normal) * u() ** (1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal();
      v = 1 + c * x;
    } while (v <= 0);
    v = v ** 3;
    const w = u();
    if (w < 1 - 0.0331 * x ** 4 || Math.log(w) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** One Dirichlet draw centred on `w` (α = concentration × w, over the keys with w > 0). */
function dirichlet(w: Record<Key, number>, concentration: number, u: () => number, normal: () => number): Record<Key, number> {
  const g = KEYS.map((k) => (w[k] > 0 ? gamma(concentration * w[k], u, normal) : 0));
  const t = g.reduce((a, b) => a + b, 0);
  return Object.fromEntries(KEYS.map((k, i) => [k, g[i]! / t])) as Record<Key, number>;
}

/**
 * The weights that apply: configured weight × its validation multiplier, renormalised over the
 * components the person and career field have (`present`).
 */
export function effectiveWeights(cfg: V2Config, present: Key[] = KEYS): Record<Key, number> {
  const raw = KEYS.map((k) => (present.includes(k) ? cfg.weights[k] * cfg.validationMultiplier[cfg.validationStatus[k]] : 0));
  const t = raw.reduce((a, b) => a + b, 0);
  return Object.fromEntries(KEYS.map((k, i) => [k, t ? raw[i]! / t : 0])) as Record<Key, number>;
}

/** FNV-1a over the profile's numbers: the same profile always gets the same draws. */
export function profileSeed(p: PersonProfile): number {
  let h = 0x811c9dc5;
  const s = (Object.keys(p.inputs) as PersonConstructId[])
    .sort()
    .map((k) => `${k}:${p.inputs[k]!.value.toFixed(3)}:${p.inputs[k]!.se.toFixed(3)}`)
    .join("|");
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/* ---------------------------------------------------------- person side ---- */

/** A compiled dimension: its measured inputs with weights renormalised over what was measured. */
type Compiled = { parts: { key: PersonConstructId; w: number; reverse: boolean }[]; sources: string[] } | null;

function compile(d: Dimension, p: PersonProfile): Compiled {
  const total = d.person.reduce((a, x) => a + x.weight, 0);
  const used = d.person.filter((x) => p.inputs[x.id]);
  const w = used.reduce((a, x) => a + x.weight, 0);
  if (!used.length || w / total < 0.5) return null;
  return { parts: used.map((x) => ({ key: x.id, w: x.weight / w, reverse: !!x.reverse })), sources: used.map((x) => p.inputs[x.id]!.source) };
}
const evalDim = (c: Compiled, v: Values) => (c ? c.parts.reduce((a, x) => a + x.w * (x.reverse ? 100 - v[x.key]! : v[x.key]!), 0) : null);

type CompiledPerson = {
  modes: Compiled[];
  env: Compiled[];
  challenge: Compiled;
  hasInterests: boolean;
  hasValues: boolean;
  areas: (PersonConstructId | null)[];
  /** Each reasoning area's standard error (null when not measured). */
  areaSe: (number | null)[];
  /** BLUEPRINT §7 at the estimates: an area is a relative strength or weakness only when the gap from the person's own mean beats 1.96 × its error. */
  areaRelative: Relative[];
};

function compilePerson(p: PersonProfile): CompiledPerson {
  const has = (k: string) => !!p.inputs[k as PersonConstructId];
  return {
    modes: VALUE_MODES.map((m) => compile(m, p)),
    env: ENV_DIMS.map((d) => compile(d, p)),
    challenge: compile(CHALLENGE, p),
    hasInterests: RIASEC.every((k) => has(`interests.${k}`)),
    hasValues: WORK_VALUES.every((k) => has(`values.${k}`)),
    areas: AREAS.map((a) => (has(`reasoning.${a}`) ? (`reasoning.${a}` as PersonConstructId) : null)),
    areaSe: AREAS.map((a) => p.inputs[`reasoning.${a}` as PersonConstructId]?.se ?? null),
    areaRelative: (() => {
      const scores = AREAS.map((a) => {
        const e = p.inputs[`reasoning.${a}` as PersonConstructId];
        return { id: a, name: a, value: e ? e.value : null, se: e ? e.se : null, coverage: e ? 1 : 0, provenance: "provisional" as const, inputs: [] };
      });
      const rel = relativeOfDimensions(scores);
      return AREAS.map((a) => rel[a] ?? "none");
    })(),
  };
}

/** The person's vectors at one point (the estimates, or one Monte Carlo draw). */
type PersonPoint = {
  interests: number[] | null;
  interestsReg: number[] | null;
  valuesReg: number[] | null;
  modes: (number | null)[];
  modesReg: number[] | null;
  env: (number | null)[];
  challenge: number | null;
  areas: (number | null)[];
  /** The environment guard's multiplier per environment dimension, then challenge last (1 = untouched). */
  envScale: number[];
};

/** Seven working conditions plus challenge: the dimensions the environment guard can shrink. */
const GUARDED = [...ENV_DIMS.map((d) => d.id), CHALLENGE.id];
const ONES = GUARDED.map(() => 1);

function personPoint(cp: CompiledPerson, v: Values, cfg: V2Config, envScale: number[] = ONES): PersonPoint {
  const interests = cp.hasInterests ? RIASEC.map((k) => v[`interests.${k}` as PersonConstructId]!) : null;
  const values = cp.hasValues ? WORK_VALUES.map((k) => v[`values.${k}` as PersonConstructId]!) : null;
  const modes = cp.modes.map((c) => evalDim(c, v));
  return {
    interests,
    interestsReg: interests ? regularised(interests, cfg.correlationFloor) : null,
    valuesReg: values ? regularised(values, cfg.correlationFloor) : null,
    modes,
    modesReg: modes.every((x) => x !== null) ? regularised(modes as number[], cfg.correlationFloor) : null,
    env: cp.env.map((c) => evalDim(c, v)),
    challenge: evalDim(cp.challenge, v),
    areas: cp.areas.map((k) => (k ? v[k]! : null)),
    envScale,
  };
}

/* ---------------------------------------------------------- career side ---- */

type LaneCtx = {
  id: string;
  lane: LaneProfileV2;
  interestsUnit: number[] | null;
  valuesUnit: number[] | null;
  modes: (number | null)[];
  modesUnit: number[] | null;
  env: (number | null)[];
  challenge: number | null;
  abilities: ({ demand: number; importance: number } | null)[];
  direction: string | null;
  /** The career's general advantage on the one-sided components, removed before scoring (see Offsets). */
  offset: Offsets[string] | undefined;
};

/**
 * Per career path, how much it gains on the one-sided components (environment and challenge) for
 * people in general: its mean component score over a reference population minus the mean over all
 * career paths. Those components only ever penalise in one direction (a career can't have "too much"
 * autonomy or challenge), so demanding, autonomous, calm careers would otherwise suit nearly
 * everyone. Subtracting the offset credits a career only for fitting this person better than it fits
 * people in general. Built by taxonomy/build/build_v2_offsets.mts.
 */
export type Offsets = Record<string, { environment: number; challenge: number; environmentFlat?: number }>;

function laneCtx(id: string, lane: LaneProfileV2, offsets?: Offsets): LaneCtx {
  const modes = VALUE_MODES.map((m) => lane.modes[m.id] ?? null);
  const best = VALUE_MODES.map((m, i) => [m.id, modes[i]] as const)
    .filter(([, x]) => x !== null)
    .sort((a, b) => b[1]! - a[1]!)[0];
  return {
    id,
    lane,
    interestsUnit: unit(lane.interests),
    valuesUnit: lane.values ? unit(lane.values) : null,
    modes,
    modesUnit: modes.every((x) => x !== null) ? unit(modes as number[]) : null,
    env: ENV_DIMS.map((d) => lane.environment[d.id] ?? null),
    challenge: lane.environment[CHALLENGE.id] ?? null,
    abilities: AREAS.map((a) => {
      const x = lane.abilities.find((y) => y.area === a);
      return x && x.demand !== null && x.importance !== null ? { demand: x.demand, importance: x.importance } : null;
    }),
    direction: best ? best[0] : null,
    offset: offsets?.[id],
  };
}

/**
 * The two sides of the reasoning-strengths correlation, over the areas both have, each centred on
 * its own average and regularised: the person's by max(correlationFloor, strengthsSeFactor × RMS
 * SE) per area (wide measurement error counts as flat), the career's by strengthsCareerFloor
 * (near-flat demands count as neutral). Null with fewer than cfg.minAreas areas.
 */
function strengthVectors(pt: PersonPoint, l: LaneCtx, cp: CompiledPerson, cfg: V2Config): { idx: number[]; a: number[]; b: number[] } | null {
  const idx = AREAS.flatMap((_, i) => (pt.areas[i] != null && l.abilities[i] ? [i] : []));
  if (idx.length < cfg.minAreas) return null;
  const se = Math.sqrt(mean(idx.map((i) => (cp.areaSe[i] ?? 0) ** 2)));
  return {
    idx,
    a: regularised(idx.map((i) => pt.areas[i]!), Math.max(cfg.correlationFloor, cfg.strengthsSeFactor * se)),
    b: regularised(idx.map((i) => l.abilities[i]!.demand), cfg.strengthsCareerFloor),
  };
}

/** Value-mode correlation over the modes both sides have (regularised on the person's side). */
function modesR(pt: PersonPoint, l: LaneCtx, cfg: V2Config): number | null {
  if (l.modesUnit && pt.modesReg) return dot(pt.modesReg, l.modesUnit);
  const pairs = pt.modes.flatMap((x, i) => (x !== null && l.modes[i] !== null ? [[x, l.modes[i]!] as const] : []));
  if (pairs.length < cfg.minPairs) return null;
  const b = unit(pairs.map((p) => p[1]));
  return b ? dot(regularised(pairs.map((p) => p[0]), cfg.correlationFloor), b) : 0;
}

/** Penalty points for a career value c against the person's p, on the side that can hurt (0 = no shortfall). Pure. */
export const penaltyOf = (shape: Dimension["penalty"], p: number, c: number): number => (shape === "deficit" ? Math.max(0, p - c) : shape === "excess" ? Math.max(0, c - p) : Math.abs(p - c));

/** How strong the need is on this dimension, given which side of it can hurt. */
export const needWeight = (shape: Dimension["penalty"], p: number, floor: number) =>
  floor + (shape === "deficit" ? Math.max(0, p - 50) : shape === "excess" ? Math.max(0, 50 - p) : Math.abs(p - 50)) / 50;

/* ------------------------------------------------------------------ fit ---- */

type Raw = { comps: Components; values: Record<Key, number | null>; ability: number | null };

function raw(pt: PersonPoint, l: LaneCtx, cfg: V2Config, cp: CompiledPerson): Raw {
  const r2c = (r: number | null) => (r === null ? null : (1 + Math.max(-1, Math.min(1, r))) / 2);
  const interests = pt.interestsReg && l.interestsUnit ? r2c(dot(pt.interestsReg, l.interestsUnit)) : null;
  const values = pt.valuesReg && l.valuesUnit ? r2c(dot(pt.valuesReg, l.valuesUnit)) : null;
  const valueModes = r2c(modesR(pt, l, cfg));
  const environment = ENV_DIMS.flatMap((d, i) => {
    const p = pt.env[i];
    const c = l.env[i];
    if (p == null || c == null) return [];
    const penalty = d.penalty ?? "two_sided";
    const need = cfg.envWeighting === "flat" ? 1 : needWeight(penalty, p, cfg.environmentWeightFloor);
    return [{ id: d.id, person: p, career: c, fit: 1 - penaltyOf(penalty, p, c) / 100, weight: need * pt.envScale[i]!, penalty }];
  });
  const challenge = pt.challenge !== null && l.challenge !== null ? 1 - Math.max(0, pt.challenge - l.challenge) / 100 : null;
  const sv = strengthVectors(pt, l, cp, cfg);
  const strengths = sv ? r2c(dot(sv.a, sv.b)) : null;
  const ew = environment.reduce((a, e) => a + e.weight, 0);
  const envFit = ew ? environment.reduce((a, e) => a + e.weight * e.fit, 0) / ew : null;
  const o = l.offset;
  const envOffset = cfg.envWeighting === "flat" ? (o?.environmentFlat ?? o?.environment ?? 0) : (o?.environment ?? 0);
  // The guard's challenge multiplier scales the component's deviation from the person's average exactly (it is linear).
  const chScale = pt.envScale[GUARDED.length - 1]!;
  return {
    comps: { interests, values, valueModes, environment, challenge, strengths, imputed: [] },
    values: { interests, values, valueModes, environment: envFit === null ? null : envFit - envOffset, challenge: challenge === null ? null : chScale * (challenge - (o?.challenge ?? 0)), strengths },
    ability: abilityOf(pt, l),
  };
}

/**
 * Importance-weighted shortfall; surplus doesn't count. Needs at least half the career's ability
 * importance measured (the same coverage rule as the Work Design dimensions), else null.
 */
function abilityOf(pt: PersonPoint, l: LaneCtx): number | null {
  let total = 0;
  let w = 0;
  let short = 0;
  AREAS.forEach((_, i) => {
    const d = l.abilities[i];
    if (!d) return;
    total += d.importance;
    const p = pt.areas[i];
    if (p == null) return;
    w += d.importance;
    short += d.importance * Math.max(0, d.demand - p);
  });
  return w && w / total >= 0.5 ? 100 - short / w : null;
}

/** Per component: the person's mean across career paths (centring) and the fixed reference spread. */
type Scale = Record<Key, { mean: number; sd: number } | null>;

function scaleOf(raws: Raw[], cfg: V2Config): Scale {
  const out = {} as Scale;
  for (const k of KEYS) {
    const xs = raws.flatMap((r) => (r.values[k] === null ? [] : [r.values[k]!]));
    out[k] = xs.length ? { mean: mean(xs), sd: cfg.componentRefSd[k] } : null;
  }
  return out;
}

type Scored = Raw & { fulfilment: number | null; weights: Record<Key, number>; scale: Scale };

/**
 * Standardised, weighted combination on a T-like scale. A component the person has but a career
 * path lacks (e.g. no O*NET Work Values) counts as the person's average (z = 0): unknown is neutral,
 * neither a bonus nor a penalty. A component the person lacks is left out and the weights renormalise.
 */
function combine(r: Raw, scale: Scale, cfg: V2Config): Scored {
  const weights = { interests: 0, values: 0, valueModes: 0, environment: 0, challenge: 0, strengths: 0 };
  // Interests are required: without them a fit would lean on too few scores.
  if (r.values.interests === null) return { ...r, fulfilment: null, weights, scale };
  const w = effectiveWeights(cfg, KEYS.filter((k) => scale[k]));
  const imputed: string[] = [];
  let s = 0;
  for (const k of KEYS) {
    const sc = scale[k];
    if (!sc) continue;
    weights[k] = w[k];
    if (r.values[k] === null) {
      imputed.push(k);
      continue;
    }
    s += weights[k] * ((r.values[k]! - sc.mean) / sc.sd);
  }
  return { ...r, comps: { ...r.comps, imputed }, fulfilment: clamp(50 + 10 * s), weights, scale };
}

function scoreAll(pt: PersonPoint, ctxs: LaneCtx[], cfg: V2Config, cp: CompiledPerson): Scored[] {
  const raws = ctxs.map((l) => raw(pt, l, cfg, cp));
  const scale = scaleOf(raws, cfg);
  return raws.map((r) => combine(r, scale, cfg));
}

/* ------------------------------------------------------------ facet guard ---- */

const isFacet = (id: string) => /^neo\.[NEOAC][1-6]$/.test(id);
const domainOf = (facet: string) => `neo.${DOMAIN_OF[facet[4]!]!}` as PersonConstructId;

/** Facets shrunk towards their domain score: x' = domain + λ·(x − domain). */
type Shrink = Partial<Record<PersonConstructId, number>>;
function applyShrink(v: Values, shrink: Shrink): Values {
  const keys = Object.keys(shrink) as PersonConstructId[];
  if (!keys.length) return v;
  const out = { ...v };
  for (const f of keys) {
    const d = v[domainOf(f)] ?? 50;
    out[f] = d + shrink[f]! * (v[f]! - d);
  }
  return out;
}

/** Every input's effect on every career path's fit (see inputShares), and the floored totals. */
function inputEffects(cp: CompiledPerson, v: Values, ctxs: LaneCtx[], cfg: V2Config, envScale: number[] = ONES) {
  const base = scoreAll(personPoint(cp, v, cfg, envScale), ctxs, cfg, cp).map((s) => s.fulfilment);
  const keys = Object.keys(v) as PersonConstructId[];
  const effects = new Map<PersonConstructId, number[]>();
  for (const k of keys) {
    const ref = isFacet(k) ? (v[domainOf(k)] ?? 50) : 50;
    if (Math.abs(v[k]! - ref) < 1e-9) {
      effects.set(k, base.map(() => 0));
      continue;
    }
    const s = scoreAll(personPoint(cp, { ...v, [k]: ref }, cfg, envScale), ctxs, cfg, cp);
    effects.set(
      k,
      s.map((x, j) => (x.fulfilment === null || base[j] === null ? 0 : Math.abs(x.fulfilment - base[j]!))),
    );
  }
  // The summed effects are floored, so a tiny effect on a near-flat profile isn't "100% of the fit".
  const totals = base.map((_, j) => Math.max(cfg.guardMinTotal, keys.reduce((a, k) => a + effects.get(k)![j]!, 0)));
  return { base, keys, effects, totals };
}

/**
 * Each input's share of each career path's fit, at the person's estimates: the input's effect
 * (|fit − fit with the input set to its reference|; a facet's reference is its domain score,
 * anything else's is 50) over the summed effects of all inputs.
 */
function inputShares(cp: CompiledPerson, v: Values, ctxs: LaneCtx[], cfg: V2Config, only?: PersonConstructId[], envScale: number[] = ONES) {
  const { keys, effects, totals } = inputEffects(cp, v, ctxs, cfg, envScale);
  const share = (k: PersonConstructId) => Math.max(0, ...effects.get(k)!.map((e, j) => e / totals[j]!));
  return new Map((only ?? keys.filter(isFacet)).map((k) => [k, share(k)]));
}

/**
 * Shrinks facets whose share of some fit is above the cap, repeating the pass until no facet is
 * over (shrinking one facet changes the others' shares). Reports each facet's share before and
 * its final share after.
 */
function facetGuard(cp: CompiledPerson, v: Values, ctxs: LaneCtx[], cfg: V2Config): { shrink: Shrink; guard: FacetGuard[] } {
  const shrink: Shrink = {};
  const first = inputShares(cp, v, ctxs, cfg);
  let current = first;
  for (let pass = 0; pass < 6; pass++) {
    const over = [...current].filter(([, s]) => s > cfg.facetCap).sort((a, b) => b[1] - a[1]);
    if (!over.length) break;
    for (const [f] of over) {
      const share = (lambda: number) => inputShares(cp, applyShrink(v, { ...shrink, [f]: lambda }), ctxs, cfg, [f as PersonConstructId]).get(f)!;
      let lo = 0;
      let hi = shrink[f as PersonConstructId] ?? 1;
      if (share(hi) <= cfg.facetCap) continue;
      for (let it = 0; it < 8; it++) {
        const mid = (lo + hi) / 2;
        if (share(mid) <= cfg.facetCap) lo = mid;
        else hi = mid;
      }
      shrink[f as PersonConstructId] = lo;
    }
    current = inputShares(cp, applyShrink(v, shrink), ctxs, cfg);
  }
  const guard = (Object.keys(shrink) as PersonConstructId[]).map((f) => ({
    facet: f,
    shrink: Math.round(shrink[f]! * 1000) / 1000,
    maxShareBefore: Math.round(first.get(f)! * 1000) / 1000,
    maxShareAfter: Math.round(current.get(f)! * 1000) / 1000,
  }));
  return { shrink, guard };
}

/* ------------------------------------------------------ environment guard ---- */

/**
 * Each guarded dimension's largest share of any career path's fit: its effect (|fit − fit with the
 * dimension left out|: its need weight, or for challenge its component, set to 0) over the summed
 * effects of all inputs, floored at guardMinTotal (the facet guard's measure). `totals` can be
 * passed in to hold them fixed while one dimension is searched.
 */
function envShares(cp: CompiledPerson, v: Values, ctxs: LaneCtx[], cfg: V2Config, envScale: number[], only?: number[], totals?: number[]): Map<number, number> {
  const base = scoreAll(personPoint(cp, v, cfg, envScale), ctxs, cfg, cp).map((s) => s.fulfilment);
  const tot = totals ?? inputEffects(cp, v, ctxs, cfg, envScale).totals;
  const out = new Map<number, number>();
  for (const d of only ?? GUARDED.map((_, i) => i)) {
    if (envScale[d] === 0) {
      out.set(d, 0);
      continue;
    }
    const off = envScale.map((x, i) => (i === d ? 0 : x));
    const s = scoreAll(personPoint(cp, v, cfg, off), ctxs, cfg, cp);
    out.set(d, Math.max(0, ...s.map((x, j) => (x.fulfilment === null || base[j] === null ? 0 : Math.abs(x.fulfilment - base[j]!) / tot[j]!))));
  }
  return out;
}

/**
 * Shrinks the need weight of any environment dimension (or the challenge component) whose share of
 * some fit is above cfg.envCap, by bisection, repeating until none is over. Reports every
 * dimension's share before and after.
 */
function envGuard(cp: CompiledPerson, v: Values, ctxs: LaneCtx[], cfg: V2Config): { envScale: number[]; guard: EnvGuard[] } {
  const scale = [...ONES];
  if (cfg.envCap === null) return { envScale: scale, guard: [] };
  const cap = cfg.envCap;
  const first = envShares(cp, v, ctxs, cfg, scale);
  let current = first;
  for (let pass = 0; pass < 6; pass++) {
    const over = [...current].filter(([, x]) => x > cap).sort((a, b) => b[1] - a[1]);
    if (!over.length) break;
    const totals = inputEffects(cp, v, ctxs, cfg, scale).totals;
    for (const [d] of over) {
      const share = (lambda: number) => envShares(cp, v, ctxs, cfg, scale.map((x, i) => (i === d ? lambda : x)), [d], totals).get(d)!;
      let lo = 0;
      let hi = scale[d]!;
      if (share(hi) <= cap) continue;
      for (let it = 0; it < 10; it++) {
        const mid = (lo + hi) / 2;
        if (share(mid) <= cap) lo = mid;
        else hi = mid;
      }
      scale[d] = lo;
    }
    current = envShares(cp, v, ctxs, cfg, scale);
  }
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  const guard = GUARDED.map((id, i) => ({ dimension: id, scale: r3(scale[i]!), maxShareBefore: r3(first.get(i)!), maxShareAfter: r3(current.get(i)!) }));
  return { envScale: scale, guard };
}

/** Every facet's largest share of any fit for this person, after the guard (for tests and reports). */
export function facetShares(person: PersonProfile, lanes: Record<string, LaneProfileV2>, cfg: V2Config = V2_CONFIG, offsets?: Offsets): Map<string, number> {
  const ctxs = Object.entries(lanes).map(([id, l]) => laneCtx(id, l, offsets));
  const cp = compilePerson(person);
  const v: Values = Object.fromEntries((Object.keys(person.inputs) as PersonConstructId[]).map((k) => [k, person.inputs[k]!.value]));
  const { shrink } = facetGuard(cp, v, ctxs, cfg);
  return inputShares(cp, applyShrink(v, shrink), ctxs, cfg);
}

/* ------------------------------------------------------- drivers / frictions ---- */

const ENV_BY_ID = new Map(ENVIRONMENT.map((d) => [d.id, d]));
type Pole = "high" | "low" | "mixed";
type Part = Driver & { pole: Pole; friction: string };
const poleOf = (person: number, career: number): Pole => (person >= 0 && career >= 0 ? "high" : person < 0 && career < 0 ? "low" : "mixed");

/** Labels for a profile-shape part as a driver and as a friction, from which side is high. */
function shapeLabels(name: string, kind: "interests" | "value" | "mode", pole: Pole, personHigher: boolean): { label: string; friction: string } {
  const what = kind === "interests" ? `${name} interests` : kind === "value" ? `Work value: ${name}` : name;
  const work = kind === "value" ? name : `${name} work`;
  if (pole === "high") return { label: what, friction: `Less ${work} than most of your options` };
  if (pole === "low") return { label: kind === "value" ? `Less emphasis on ${name}, which matters less to you` : `Little ${work}, which suits you`, friction: `More ${work} than most of your options` };
  return personHigher
    ? { label: what, friction: kind === "value" ? `Offers less ${name} than you value` : kind === "interests" ? `Little use of your ${name} interests` : `Little use of your ${name} side` }
    : { label: what, friction: kind === "value" ? `Emphasis on ${name}, which matters less to you` : `${work} you're less drawn to` };
}

/**
 * Reasoning-strength labels for an area that passed the BLUEPRINT §7 test (a relative strength or
 * weakness against the person's own other areas); other areas move the fit but are never named.
 */
function strengthLabels(area: AbilityArea, rel: "strength" | "weakness", careerHigh: boolean): { label: string; friction: string } {
  const name = AREA_NAME[area];
  const lower = name.toLowerCase();
  return rel === "strength"
    ? careerHigh
      ? { label: `${name}: a relative strength of yours, and this work leans on it`, friction: `Leans less on ${lower}, a relative strength of yours, than most of your options` }
      : { label: `${name}: a relative strength of yours`, friction: `Little use of ${lower}, a relative strength of yours` }
    : careerHigh
      ? { label: `${name} demands`, friction: `Leans on ${lower}, a relatively weaker area of yours` }
      : { label: `Little call on ${lower}, a relatively weaker area of yours`, friction: `Leans more on ${lower}, a relatively weaker area of yours, than most of your options` };
}

/** Environment labels from the person's side and the career's. */
function envLabels(id: string, person: number, career: number, fit: number): { label: string; friction: string } {
  const name = ENV_BY_ID.get(id)!.name;
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  return {
    label:
      fit < 0.9
        ? `${name}: a smaller gap than most of your options`
        : person >= 60
          ? career >= person - 5
            ? `${name}: as much as you need`
            : `${name}: close to what you need`
          : person <= 40
            ? career <= person + 5
              ? `Little ${lower}, which suits you`
              : `${name}: within what suits you`
            : `${name}: about what suits you`,
    friction: career < person ? (person >= 60 ? `${name}: less than you need` : `${name}: less than suits you`) : `${name}: more than suits you`,
  };
}

/** Each component split into named parts, on the same standardised T-scale as the fit. */
function parts(pt: PersonPoint, l: LaneCtx, s: Scored, cp: CompiledPerson, p: PersonProfile, cfg: V2Config): Part[] {
  const out: Part[] = [];
  const src = (k: string) => p.inputs[k as PersonConstructId]?.source ?? k;
  // A component's contribution in fit points per unit of its 0–1 score.
  const k = (key: Key) => (s.scale[key] ? (10 * s.weights[key]) / s.scale[key]!.sd : 0);
  if (s.values.interests !== null && pt.interestsReg && l.interestsUnit)
    RIASEC.forEach((r, i) => {
      const [a, b] = [pt.interestsReg![i]!, l.interestsUnit![i]!];
      out.push({ id: `interests.${r}`, ...shapeLabels(RIASEC_NAME[r]!, "interests", poleOf(a, b), a > b), pole: poleOf(a, b), component: "interests", contribution: (k("interests") * a * b) / 2, sources: [src(`interests.${r}`)] });
    });
  if (s.values.values !== null && pt.valuesReg && l.valuesUnit)
    WORK_VALUES.forEach((w, i) => {
      const [a, b] = [pt.valuesReg![i]!, l.valuesUnit![i]!];
      out.push({ id: `values.${w}`, ...shapeLabels(w, "value", poleOf(a, b), a > b), pole: poleOf(a, b), component: "values", contribution: (k("values") * a * b) / 2, sources: [src(`values.${w}`)] });
    });
  if (s.values.valueModes !== null && pt.modesReg && l.modesUnit)
    VALUE_MODES.forEach((m, i) => {
      const [a, b] = [pt.modesReg![i]!, l.modesUnit![i]!];
      out.push({ id: `mode.${m.id}`, ...shapeLabels(`${m.name} (${m.archetype})`, "mode", poleOf(a, b), a > b), pole: poleOf(a, b), component: "valueModes", contribution: (k("valueModes") * a * b) / 2, sources: cp.modes[i]?.sources ?? [] });
    });
  if (s.values.environment !== null) {
    const ew = s.comps.environment.reduce((a, e) => a + e.weight, 0);
    for (const e of s.comps.environment) {
      const i = ENV_DIMS.findIndex((d) => d.id === e.id);
      out.push({ id: `env.${e.id}`, ...envLabels(e.id, e.person, e.career, e.fit), pole: "high", component: "environment", contribution: (k("environment") * e.weight * e.fit) / ew, sources: cp.env[i]?.sources ?? [] });
    }
  }
  const sv = s.values.strengths !== null ? strengthVectors(pt, l, cp, cfg) : null;
  if (sv)
    sv.idx.forEach((i, j) => {
      const rel = cp.areaRelative[i];
      if (rel !== "strength" && rel !== "weakness") return;
      const area = AREAS[i]!;
      const [a, b] = [sv.a[j]!, sv.b[j]!];
      const pole: Pole = rel === "strength" ? (b >= 0 ? "high" : "mixed") : b < 0 ? "low" : "mixed";
      out.push({ id: `reasoning.${area}`, ...strengthLabels(area, rel, b >= 0), pole, component: "strengths", contribution: (k("strengths") * a * b) / 2, sources: [src(`reasoning.${area}`)] });
    });
  if (s.values.challenge !== null)
    out.push({ id: "env.challenge", label: s.values.challenge! >= 0.95 ? `${CHALLENGE.name}: enough for your reasoning range` : `${CHALLENGE.name}: closer to your range than most of your options`, friction: `${CHALLENGE.name}: less than your reasoning range`, pole: "high", component: "challenge", contribution: k("challenge") * s.values.challenge!, sources: cp.challenge?.sources ?? [] });
  return out;
}

/** Drivers and frictions: each part against the same part averaged over all career paths. */
function driversFrictions(own: Part[], baseline: Map<string, number>): { drivers: Driver[]; frictions: Driver[] } {
  const rel = own.map(({ pole, friction, ...d }) => ({ d: { ...d, contribution: Math.round((d.contribution - (baseline.get(d.id) ?? 0)) * 10) / 10 }, pole, friction }));
  // Shared strengths lead; shared absences ("little X work, which suits you") come after them.
  const rank = (x: (typeof rel)[number]) => (x.pole === "low" ? 1 : 0);
  return {
    // Mixed parts (one side high, the other low) only ever count against a fit, never as a reason for it.
    drivers: rel.filter((x) => x.d.contribution >= 0.3 && x.pole !== "mixed").sort((a, b) => rank(a) - rank(b) || b.d.contribution - a.d.contribution).slice(0, 4).map((x) => x.d),
    frictions: rel.filter((x) => x.d.contribution <= -0.3).sort((a, b) => a.d.contribution - b.d.contribution).slice(0, 3).map((x) => ({ ...x.d, label: x.friction })),
  };
}

/* ------------------------------------------------------------- archetypes ---- */

function archetypeBlend(pt: PersonPoint, drawsModes: (number | null)[][], cfg: V2Config): ArchetypeBlend | null {
  if (pt.modes.some((x) => x === null)) return null;
  const xs = pt.modes as number[];
  const max = Math.max(...xs);
  const e = xs.map((x) => Math.exp((x - max) / cfg.archetypeTemperature));
  const z = e.reduce((a, b) => a + b, 0);
  const blend = VALUE_MODES.map((m, i) => ({ id: m.id, archetype: m.archetype!, name: m.name, share: Math.round((1000 * e[i]!) / z) / 10 })).sort((a, b) => b.share - a.share);
  const [a, b] = blend;
  const ia = VALUE_MODES.findIndex((m) => m.id === a!.id);
  const ib = VALUE_MODES.findIndex((m) => m.id === b!.id);
  // The draws redraw shared inputs jointly, so they already say whether the two separate.
  const ahead = drawsModes.filter((d) => d[ia]! > d[ib]!).length / Math.max(1, drawsModes.length);
  const tentative = ahead < cfg.archetypeConfidence;
  const pair = overlappingModes().some(([x, y]) => (x === a!.id && y === b!.id) || (x === b!.id && y === a!.id));
  return {
    blend,
    top2: [a!, b!].map((x) => ({ id: x.id, archetype: x.archetype, share: x.share })),
    tentative,
    reason: tentative ? `You sit between ${a!.archetype} and ${b!.archetype}: ${a!.archetype} comes out ahead in ${Math.min(Math.floor(ahead * 100), Math.ceil(cfg.archetypeConfidence * 100) - 1)}% of draws once measurement error is allowed for, so read the two together rather than as a ranking.` : null,
    caveat: pair ? `${a!.archetype} and ${b!.archetype} are built from largely the same scores, so read them as one pattern.` : null,
  };
}

/* ---------------------------------------------------------------- main ---- */

export type MatchOptions = { config?: V2Config; draws?: number; seed?: number; offsets?: Offsets };

/** Every career path for one person: fits as distributions, drivers, bands from rank stability. */
export function matchAllV2(person: PersonProfile, lanes: Record<string, LaneProfileV2>, opts: MatchOptions = {}): MatchResultV2 {
  const cfg = opts.config ?? V2_CONFIG;
  const draws = opts.draws ?? cfg.draws;
  const ctxs = Object.entries(lanes).map(([id, l]) => laneCtx(id, l, opts.offsets));
  const cp = compilePerson(person);
  const keys = Object.keys(person.inputs) as PersonConstructId[];
  const est: Values = Object.fromEntries(keys.map((k) => [k, person.inputs[k]!.value]));

  // Guard first, at the estimates; the same shrink applies to every draw.
  const { shrink, guard } = cp.hasInterests ? facetGuard(cp, est, ctxs, cfg) : { shrink: {}, guard: [] };
  const { envScale, guard: envGuardOut } = cp.hasInterests ? envGuard(cp, applyShrink(est, shrink), ctxs, cfg) : { envScale: ONES, guard: [] };
  const pt = personPoint(cp, applyShrink(est, shrink), cfg, envScale);

  // Monte Carlo: redraw every input from its standard error, rescore every career path. With the
  // ensemble, each draw also gets its own weights and environment weighting, from a separate stream
  // so the input draws are the same with and without it.
  const n = ctxs.length;
  const F = new Float64Array(draws * n);
  const A = new Float64Array(draws * n);
  const flatDraw = new Uint8Array(draws);
  const drawModes: (number | null)[][] = [];
  const seed = opts.seed ?? profileSeed(person);
  const normal = rng(seed);
  const ens = cfg.ensemble;
  const eu = uniform(seed ^ 0x9e3779b9);
  const en = rng(seed ^ 0x85ebca6b);
  // The ensemble is centred on the weights over the components this person actually has.
  const scored = scoreAll(pt, ctxs, cfg, cp);
  const centre = effectiveWeights(cfg, KEYS.filter((k) => scored[0]?.scale[k]));
  for (let d = 0; d < draws; d++) {
    const v: Values = {};
    for (const k of keys) v[k] = clamp(person.inputs[k]!.value + person.inputs[k]!.se * normal());
    const dp = personPoint(cp, applyShrink(v, shrink), cfg, envScale);
    drawModes.push(dp.modes);
    let dcfg = cfg;
    if (ens) {
      const flat = eu() < ens.flatEnvShare;
      flatDraw[d] = flat ? 1 : 0;
      // Validation multipliers are already in `centre`, so the drawn weights are used as they are.
      dcfg = { ...cfg, weights: dirichlet(centre, ens.concentration, eu, en), validationMultiplier: { validated: 1, derived: 1, provisional: 1 }, envWeighting: flat ? "flat" : cfg.envWeighting };
    }
    const all = scoreAll(dp, ctxs, dcfg, cp);
    for (let j = 0; j < n; j++) {
      F[d * n + j] = all[j]!.fulfilment ?? NaN;
      A[d * n + j] = all[j]!.ability ?? NaN;
    }
  }

  // Rank stability: share of draws in the person's top 10% and bottom 40% (ranked among scored paths),
  // overall and, with the ensemble, separately for need-weighted and flat draws.
  const pTop = new Float64Array(n);
  const pBottom = new Float64Array(n);
  const byTop = [new Float64Array(n), new Float64Array(n)];
  const byBottom = [new Float64Array(n), new Float64Array(n)];
  const nBy = [0, 0];
  for (let d = 0; d < draws; d++) nBy[flatDraw[d]!]!++;
  for (let d = 0; d < draws; d++) {
    const idx: number[] = [];
    for (let j = 0; j < n; j++) if (!Number.isNaN(F[d * n + j]!)) idx.push(j);
    if (!idx.length) continue;
    idx.sort((a, b) => F[d * n + b]! - F[d * n + a]!);
    const top = Math.max(1, Math.ceil(cfg.bands.topShare * idx.length));
    const bottom = Math.max(1, Math.floor(cfg.bands.bottomShare * idx.length));
    const g = flatDraw[d]!;
    for (let r = 0; r < top; r++) {
      pTop[idx[r]!]! += 1 / draws;
      byTop[g]![idx[r]!]! += 1 / nBy[g]!;
    }
    for (let r = idx.length - bottom; r < idx.length; r++) {
      pBottom[idx[r]!]! += 1 / draws;
      byBottom[g]![idx[r]!]! += 1 / nBy[g]!;
    }
  }
  // A band must hold under both weightings: the smaller of the two shares decides.
  const split = !!ens && nBy[0]! > 0 && nBy[1]! > 0;
  const bandTop = (j: number) => (split ? Math.min(byTop[0]![j]!, byTop[1]![j]!) : pTop[j]!);
  const bandBottom = (j: number) => (split ? Math.min(byBottom[0]![j]!, byBottom[1]![j]!) : pBottom[j]!);

  // Point-estimate parts, and their average over all career paths (the baseline for drivers).
  const allParts = ctxs.map((l, j) => parts(pt, l, scored[j]!, cp, person, cfg));
  const baseline = new Map<string, number>();
  for (const ps of allParts) for (const p of ps) baseline.set(p.id, (baseline.get(p.id) ?? 0) + p.contribution / n);

  const col = (M: Float64Array, j: number) => {
    const xs: number[] = [];
    for (let d = 0; d < draws; d++) {
      const x = M[d * n + j]!;
      if (!Number.isNaN(x)) xs.push(x);
    }
    return xs;
  };
  const results: LaneMatchV2[] = ctxs.map((l, j) => {
    const f = col(F, j);
    const a = col(A, j);
    const insufficient = f.length === 0;
    const band: BandV2 = insufficient ? "insufficient" : bandTop(j) >= cfg.bands.strong ? "strong" : bandBottom(j) >= cfg.bands.unlikely ? "unlikely" : "possible";
    const r3 = (x: number) => Math.round(x * 1000) / 1000;
    const { drivers, frictions } = insufficient ? { drivers: [], frictions: [] } : driversFrictions(allParts[j]!, baseline);
    return {
      laneId: l.id,
      name: l.lane.name,
      provenance: l.lane.provenance,
      band,
      pTop: Math.round(pTop[j]! * 1000) / 1000,
      pBottom: Math.round(pBottom[j]! * 1000) / 1000,
      ...(split ? { pBy: { need: { top: r3(byTop[0]![j]!), bottom: r3(byBottom[0]![j]!) }, flat: { top: r3(byTop[1]![j]!), bottom: r3(byBottom[1]![j]!) } } } : {}),
      direction: l.direction,
      fulfilmentFit: insufficient ? EMPTY : distribution(f),
      abilityFit: a.length ? distribution(a) : null,
      components: scored[j]!.comps,
      drivers,
      frictions,
    } satisfies LaneMatchV2;
  });

  const bandCounts: Record<BandV2, number> = { strong: 0, possible: 0, unlikely: 0, insufficient: 0 };
  for (const r of results) bandCounts[r.band]++;
  return { version: cfg.version, draws, lanes: results, bandCounts, archetype: archetypeBlend(pt, drawModes, cfg), guard, envGuard: envGuardOut, notes: notesFor(cp, pt, bandCounts, guard, cfg) };
}

/** Plain-language notes about the result as a whole: why there are few strong fits, missing data, the guard. */
function notesFor(cp: CompiledPerson, pt: PersonPoint, bands: Record<BandV2, number>, guard: FacetGuard[], cfg: V2Config): MatchResultV2["notes"] {
  const notes: MatchResultV2["notes"] = [];
  if (!cp.hasInterests) notes.push({ code: "missing_interests", text: "Career paths can't be matched until the interests questionnaire is done." });
  if (!cp.areas.some(Boolean)) notes.push({ code: "no_reasoning", text: "Ability fit needs the reasoning tasks; until then only fulfilment fit is shown." });
  if (cp.hasInterests && bands.strong < cfg.flat.minStrong) {
    const flatInterests = pt.interests !== null && sd(pt.interests) < cfg.flat.interestsSd;
    const flatModes = pt.modes.every((x) => x !== null) && sd(pt.modes as number[]) < cfg.flat.modesSd;
    const n = `${bands.strong} strong ${bands.strong === 1 ? "fit" : "fits"}`;
    if (flatInterests || flatModes)
      notes.push({
        code: "flat_profile",
        text: `Your ${flatInterests && flatModes ? "interest and value-mode scores are" : flatInterests ? "interest scores are" : "value-mode scores are"} close together, so few career paths stand out once measurement error is allowed for (${n}). That is a result in itself: several directions suit you about equally well.`,
      });
    else notes.push({ code: "few_strong", text: `Several career paths fit you about equally well, so only ${bands.strong === 0 ? "none" : `${bands.strong}`} stand${bands.strong === 1 ? "s" : ""} out reliably once measurement error is allowed for (${n}). The possible fits nearest the top are worth the same look.` });
  }
  if (guard.length) {
    const names = (gs: FacetGuard[]) => gs.map((g) => g.facet.replace("neo.", "")).join(", ");
    const replaced = guard.filter((g) => g.shrink < 0.05);
    const weighted = guard.filter((g) => g.shrink >= 0.05);
    const parts = [
      weighted.length ? `${names(weighted)} ${weighted.length === 1 ? "was" : "were"} weighted down towards ${weighted.length === 1 ? "its" : "their"} domain score` : null,
      replaced.length ? `${names(replaced)} ${replaced.length === 1 ? "was" : "were"} replaced by ${replaced.length === 1 ? "its" : "their"} domain score` : null,
    ].filter(Boolean);
    notes.push({ code: "facet_guard", text: `So that no single personality facet decides a match, ${parts.join(" and ")}.` });
  }
  return notes;
}

/**
 * One career path for one person (the brief's computeFit). It needs the field of all career paths:
 * fit is standardised across them, missing data is filled from them, and drivers are relative to
 * them. `lane` is the career path's id in `field` (or its profile, matched by id or content).
 */
export function computeFit(person: PersonProfile, lane: string | LaneProfileV2, field: Record<string, LaneProfileV2>, opts: MatchOptions = {}): FitV2 {
  let id = typeof lane === "string" ? lane : Object.entries(field).find(([, l]) => l === lane || JSON.stringify(l) === JSON.stringify(lane))?.[0];
  let all = field;
  if (!id) {
    id = "__lane";
    all = { ...field, __lane: lane as LaneProfileV2 };
  }
  if (!all[id]) throw new Error(`Unknown career path ${id}`);
  const r = matchAllV2(person, all, opts).lanes.find((x) => x.laneId === id)!;
  return { fulfilmentFit: r.fulfilmentFit, abilityFit: r.abilityFit, components: r.components, drivers: r.drivers, frictions: r.frictions };
}

/** Each component's spread across career paths at the person's estimates, before standardising (for calibrating V2_CONFIG.componentRefSd). */
export function componentSpreads(person: PersonProfile, lanes: Record<string, LaneProfileV2>, cfg: V2Config = V2_CONFIG): Record<string, number | null> {
  const ctxs = Object.entries(lanes).map(([id, l]) => laneCtx(id, l));
  const cp = compilePerson(person);
  const v: Values = Object.fromEntries((Object.keys(person.inputs) as PersonConstructId[]).map((k) => [k, person.inputs[k]!.value]));
  const raws = ctxs.map((l) => raw(personPoint(cp, v, cfg), l, cfg, cp));
  return Object.fromEntries(KEYS.map((k) => {
    const xs = raws.flatMap((r) => (r.values[k] === null ? [] : [r.values[k]!]));
    return [k, xs.length ? sd(xs) : null];
  }));
}

/** The career offsets (see Offsets) from a reference population, at each person's estimates. */
export function populationOffsets(people: PersonProfile[], lanes: Record<string, LaneProfileV2>, cfg: V2Config = V2_CONFIG): Offsets {
  const ctxs = Object.entries(lanes).map(([id, l]) => laneCtx(id, l));
  const sums = ctxs.map(() => ({ environment: 0, challenge: 0, flat: 0, ne: 0, nc: 0 }));
  const flatCfg: V2Config = { ...cfg, envWeighting: "flat" };
  for (const p of people) {
    const cp = compilePerson(p);
    const v: Values = Object.fromEntries((Object.keys(p.inputs) as PersonConstructId[]).map((k) => [k, p.inputs[k]!.value]));
    const pt = personPoint(cp, v, cfg);
    ctxs.forEach((l, j) => {
      const r = raw(pt, l, cfg, cp);
      if (r.values.environment !== null) {
        sums[j]!.environment += r.values.environment;
        sums[j]!.flat += raw(pt, l, flatCfg, cp).values.environment!;
        sums[j]!.ne++;
      }
      if (r.values.challenge !== null) {
        sums[j]!.challenge += r.values.challenge;
        sums[j]!.nc++;
      }
    });
  }
  const means = sums.map((s) => ({ environment: s.ne ? s.environment / s.ne : 0, challenge: s.nc ? s.challenge / s.nc : 0, flat: s.ne ? s.flat / s.ne : 0 }));
  const avgE = mean(means.map((m) => m.environment));
  const avgC = mean(means.map((m) => m.challenge));
  const avgF = mean(means.map((m) => m.flat));
  const r4 = (x: number) => Math.round(x * 10000) / 10000;
  return Object.fromEntries(ctxs.map((l, j) => [l.id, { environment: r4(means[j]!.environment - avgE), challenge: r4(means[j]!.challenge - avgC), environmentFlat: r4(means[j]!.flat - avgF) }]));
}
