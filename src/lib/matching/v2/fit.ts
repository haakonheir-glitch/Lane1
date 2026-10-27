/**
 * Matching v2: person–environment fit on O*NET career profiles. Pure and deterministic (the
 * Monte Carlo seed comes from the profile). No LLM calls.
 *
 * Fulfilment fit (needs–supplies, the headline) combines:
 * - interests: correlation of the person's RIASEC profile shape with the career's O*NET OI shape;
 * - values: correlation of the person's ranked work values with the career's Work Values extents;
 * - value modes: correlation across the nine modes;
 * - environment: per dimension, the model's penalty shape, each dimension weighted by how far the
 *   person sits from the middle (strong needs matter more);
 * - challenge: under-challenge only (Cognitive challenge, deficit penalty).
 * Correlations r become (1 + r) / 2; the components are combined with V2_CONFIG.weights,
 * renormalised over what's available, on 0–100.
 *
 * Ability fit (demands–abilities, secondary): importance-weighted shortfall of the person's
 * reasoning percentiles against the career's ability demands. Surplus doesn't count.
 *
 * Uncertainty: the person's inputs are drawn from their standard errors (V2_CONFIG.draws times)
 * and every career path is rescored per draw; bands come from rank stability.
 */
import { ENVIRONMENT, VALUE_MODES, type Dimension, type PersonConstructId } from "../../workdesign/model";
import { overlappingModes } from "../../workdesign/person";
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

/* ------------------------------------------------------------------ guard ---- */

const isFacet = (id: string) => /^neo\.[NEOAC][1-6]$/.test(id);

/**
 * The most any single personality facet can carry of a fulfilment fit, over every possible person
 * and career: its share of the value-mode correlation (each mode counts 1/9) plus, in the worst
 * case, all of the environment weight on the one dimension where the facet weighs most, divided
 * by the smallest weight total a fit can have (interests are required; values and challenge may
 * be missing). Facets enter no other component.
 */
export function facetShareBound(cfg: V2Config = V2_CONFIG): { facet: string; share: number }[] {
  const facets = new Set<string>();
  for (const d of [...VALUE_MODES, ...ENVIRONMENT]) for (const x of d.person) if (isFacet(x.id)) facets.add(x.id);
  const within = (d: Dimension, id: string) => {
    const total = d.person.reduce((a, x) => a + x.weight, 0);
    return d.person.filter((x) => x.id === id).reduce((a, x) => a + x.weight, 0) / total;
  };
  const minTotal = cfg.weights.interests + cfg.weights.valueModes + cfg.weights.environment;
  return [...facets]
    .map((f) => {
      const modes = VALUE_MODES.reduce((a, m) => a + within(m, f), 0) / VALUE_MODES.length;
      const env = Math.max(0, ...ENV_DIMS.map((d) => within(d, f)));
      return { facet: f, share: (cfg.weights.valueModes * modes + cfg.weights.environment * env) / minTotal };
    })
    .sort((a, b) => b.share - a.share);
}

/** Throws when the configuration would let a facet exceed the cap. */
export function checkConfig(cfg: V2Config = V2_CONFIG) {
  const worst = facetShareBound(cfg)[0];
  if (worst && worst.share > cfg.facetCap) throw new Error(`Matching v2 config lets ${worst.facet} carry ${(worst.share * 100).toFixed(1)}% of a fit (cap ${cfg.facetCap * 100}%)`);
}

/* ------------------------------------------------------------- statistics ---- */

/** Centred, unit-length vector (null if it has no spread). */
function unit(xs: number[]): number[] | null {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const c = xs.map((x) => x - m);
  const n = Math.sqrt(c.reduce((a, b) => a + b * b, 0));
  return n < 1e-9 ? null : c.map((x) => x / n);
}
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);
const sd = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};
const clamp = (x: number) => (x < 0 ? 0 : x > 100 ? 100 : x);

function distribution(xs: Float64Array | number[]): Distribution {
  const s = Array.from(xs).sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]!;
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const r = (x: number) => Math.round(x * 10) / 10;
  return { mean: r(mean), sd: r(sd(s)), p10: r(q(0.1)), p50: r(q(0.5)), p90: r(q(0.9)) };
}

/** Deterministic PRNG (mulberry32) and standard normal draws (Box–Muller). */
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

/** FNV-1a over the profile's numbers: the same profile always gets the same draws. */
export function profileSeed(p: PersonProfile): number {
  let h = 0x811c9dc5;
  const s = Object.keys(p.inputs)
    .sort()
    .map((k) => `${k}:${p.inputs[k as PersonConstructId]!.value.toFixed(3)}:${p.inputs[k as PersonConstructId]!.se.toFixed(3)}`)
    .join("|");
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/* ---------------------------------------------------------- person side ---- */

/** A compiled dimension: its measured inputs with weights renormalised over what was measured. */
type Compiled = { id: string; parts: { key: PersonConstructId; w: number; reverse: boolean }[]; sources: string[] } | null;

function compile(d: Dimension, p: PersonProfile): Compiled {
  const total = d.person.reduce((a, x) => a + x.weight, 0);
  const used = d.person.filter((x) => p.inputs[x.id]);
  const w = used.reduce((a, x) => a + x.weight, 0);
  if (!used.length || w / total < 0.5) return null;
  return { id: d.id, parts: used.map((x) => ({ key: x.id, w: x.weight / w, reverse: !!x.reverse })), sources: used.map((x) => p.inputs[x.id]!.source) };
}

type Values = Partial<Record<PersonConstructId, number>>;
const evalDim = (c: Compiled, v: Values) => (c ? c.parts.reduce((a, x) => a + x.w * (x.reverse ? 100 - v[x.key]! : v[x.key]!), 0) : null);

/** The person's vectors at one point (the estimates, or one Monte Carlo draw). */
type PersonPoint = {
  interests: number[] | null;
  interestsUnit: number[] | null;
  values: number[] | null;
  valuesUnit: number[] | null;
  modes: (number | null)[];
  env: (number | null)[];
  challenge: number | null;
  areas: (number | null)[];
};

type CompiledPerson = { modes: Compiled[]; env: Compiled[]; challenge: Compiled; hasInterests: boolean; hasValues: boolean; areas: (PersonConstructId | null)[] };

function compilePerson(p: PersonProfile): CompiledPerson {
  const has = (k: string) => !!p.inputs[k as PersonConstructId];
  return {
    modes: VALUE_MODES.map((m) => compile(m, p)),
    env: ENV_DIMS.map((d) => compile(d, p)),
    challenge: compile(CHALLENGE, p),
    hasInterests: RIASEC.every((k) => has(`interests.${k}`)),
    hasValues: WORK_VALUES.every((k) => has(`values.${k}`)),
    areas: AREAS.map((a) => (has(`reasoning.${a}`) ? (`reasoning.${a}` as PersonConstructId) : null)),
  };
}

function personPoint(cp: CompiledPerson, v: Values): PersonPoint {
  const interests = cp.hasInterests ? RIASEC.map((k) => v[`interests.${k}` as PersonConstructId]!) : null;
  const values = cp.hasValues ? WORK_VALUES.map((k) => v[`values.${k}` as PersonConstructId]!) : null;
  return {
    interests,
    interestsUnit: interests ? unit(interests) : null,
    values,
    valuesUnit: values ? unit(values) : null,
    modes: cp.modes.map((c) => evalDim(c, v)),
    env: cp.env.map((c) => evalDim(c, v)),
    challenge: evalDim(cp.challenge, v),
    areas: cp.areas.map((k) => (k ? v[k]! : null)),
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
};

function laneCtx(id: string, lane: LaneProfileV2): LaneCtx {
  const modes = VALUE_MODES.map((m) => lane.modes[m.id] ?? null);
  const complete = modes.every((x) => x !== null);
  const best = VALUE_MODES.map((m, i) => [m.id, modes[i]] as const).filter(([, x]) => x !== null).sort((a, b) => b[1]! - a[1]!)[0];
  return {
    id,
    lane,
    interestsUnit: unit(lane.interests),
    valuesUnit: lane.values ? unit(lane.values) : null,
    modes,
    modesUnit: complete ? unit(modes as number[]) : null,
    env: ENV_DIMS.map((d) => lane.environment[d.id] ?? null),
    challenge: lane.environment[CHALLENGE.id] ?? null,
    abilities: AREAS.map((a) => {
      const x = lane.abilities.find((y) => y.area === a);
      return x && x.demand !== null && x.importance !== null ? { demand: x.demand, importance: x.importance } : null;
    }),
    direction: best ? best[0] : null,
  };
}

/** Correlation of the person's modes with a career's, over the modes both have. */
function modesR(pt: PersonPoint, l: LaneCtx, minPairs: number): number | null {
  if (l.modesUnit && pt.modes.every((x) => x !== null)) {
    const u = unit(pt.modes as number[]);
    return u ? dot(u, l.modesUnit) : 0;
  }
  const pairs = pt.modes.flatMap((x, i) => (x !== null && l.modes[i] !== null ? [[x, l.modes[i]!] as const] : []));
  if (pairs.length < minPairs) return null;
  const a = unit(pairs.map((p) => p[0]));
  const b = unit(pairs.map((p) => p[1]));
  return a && b ? dot(a, b) : 0;
}

const penaltyOf = (shape: Dimension["penalty"], p: number, c: number): number => (shape === "deficit" ? Math.max(0, p - c) : shape === "excess" ? Math.max(0, c - p) : Math.abs(p - c));

/* ------------------------------------------------------------------ fit ---- */

type Key = keyof V2Config["weights"];
const KEYS: Key[] = ["interests", "values", "valueModes", "environment", "challenge"];
type Raw = { comps: Components; values: Record<Key, number | null>; ability: number | null };
type Scored = Raw & { fulfilment: number | null; weights: Record<Key, number> };

/** The components for one career path, before they are combined. */
function raw(pt: PersonPoint, l: LaneCtx, cfg: V2Config): Raw {
  const r2c = (r: number | null) => (r === null ? null : (1 + r) / 2);
  const interests = pt.interests && l.interestsUnit ? r2c(pt.interestsUnit ? dot(pt.interestsUnit, l.interestsUnit) : 0) : null;
  const values = pt.values && l.valuesUnit ? r2c(pt.valuesUnit ? dot(pt.valuesUnit, l.valuesUnit) : 0) : null;
  const valueModes = r2c(modesR(pt, l, cfg.minPairs));
  const environment = ENV_DIMS.flatMap((d, i) => {
    const p = pt.env[i];
    const c = l.env[i];
    if (p == null || c == null) return [];
    return [{ id: d.id, person: p, career: c, fit: 1 - penaltyOf(d.penalty, p, c) / 100, weight: cfg.environmentWeightFloor + Math.abs(p - 50) / 50, penalty: d.penalty ?? "two_sided" }];
  });
  const challenge = pt.challenge !== null && l.challenge !== null ? 1 - Math.max(0, pt.challenge - l.challenge) / 100 : null;
  const ew = environment.reduce((a, e) => a + e.weight, 0);
  const envFit = ew ? environment.reduce((a, e) => a + e.weight * e.fit, 0) / ew : null;
  return { comps: { interests, values, valueModes, environment, challenge, imputed: [] }, values: { interests, values, valueModes, environment: envFit, challenge }, ability: abilityOf(pt, l) };
}

/**
 * Each component's mean over the career paths that have it. A career path missing a component the
 * person does have (e.g. no O*NET Work Values) gets this mean: unknown counts as neutral, neither a
 * bonus nor a penalty. (Dropping it instead would favour career paths with missing data.)
 */
function componentMeans(raws: Raw[]): Record<Key, number | null> {
  const out = {} as Record<Key, number | null>;
  for (const k of KEYS) {
    const xs = raws.flatMap((r) => (r.values[k] === null ? [] : [r.values[k]!]));
    out[k] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  }
  return out;
}

function combine(r: Raw, means: Record<Key, number | null>, cfg: V2Config): Scored {
  const weights = { interests: 0, values: 0, valueModes: 0, environment: 0, challenge: 0 };
  // Interests are required: without them a fit would lean on too few scores (and the facet guard assumes them).
  if (r.values.interests === null) return { ...r, fulfilment: null, weights };
  const imputed: string[] = [];
  const v = {} as Record<Key, number | null>;
  for (const k of KEYS) {
    v[k] = r.values[k] ?? means[k];
    if (r.values[k] === null && means[k] !== null) imputed.push(k);
  }
  const total = KEYS.reduce((a, k) => a + (v[k] === null ? 0 : cfg.weights[k]), 0);
  for (const k of KEYS) if (v[k] !== null) weights[k] = cfg.weights[k] / total;
  const fulfilment = 100 * KEYS.reduce((a, k) => a + (v[k] === null ? 0 : weights[k] * v[k]!), 0);
  return { ...r, comps: { ...r.comps, imputed }, fulfilment, weights };
}

function scoreAll(pt: PersonPoint, ctxs: LaneCtx[], cfg: V2Config): Scored[] {
  const raws = ctxs.map((l) => raw(pt, l, cfg));
  const means = componentMeans(raws);
  return raws.map((r) => combine(r, means, cfg));
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

/* ------------------------------------------------------- drivers / frictions ---- */

const MODE_BY_ID = new Map(VALUE_MODES.map((m) => [m.id, m]));
const ENV_BY_ID = new Map(ENVIRONMENT.map((d) => [d.id, d]));

/**
 * How a profile-shape part reads, from which side is high: both high is a shared strength, both
 * low a shared "not this", and a mismatch says which side carries it.
 */
function shapeLabel(name: string, kind: "interests" | "value" | "mode", person: number, career: number): { label: string; alt: string } {
  const both = person >= 0 && career >= 0;
  const neither = person < 0 && career < 0;
  if (kind === "interests")
    return both
      ? { label: `${name} interests`, alt: `${name} interests` }
      : neither
        ? { label: `Little ${name} work, which suits you`, alt: `Little ${name} work` }
        : { label: `${name} interests`, alt: person > career ? `Little use of your ${name} interests` : `${name} work you're less drawn to` };
  if (kind === "value")
    return both
      ? { label: `Work value: ${name}`, alt: `Work value: ${name}` }
      : neither
        ? { label: `Less emphasis on ${name}, which matters less to you`, alt: `Less emphasis on ${name}` }
        : { label: `Work value: ${name}`, alt: person > career ? `Offers less ${name} than you value` : `Emphasis on ${name}, which matters less to you` };
  return both
    ? { label: name, alt: name }
    : neither
      ? { label: `Little ${name} work, which suits you`, alt: `Little ${name} work` }
      : { label: name, alt: person > career ? `Little use of your ${name} side` : `Asks for ${name} work you're less drawn to` };
}

/** `pole`: both sides high, both low, or mixed; drivers lead with shared strengths. */
type Part = Driver & { alt: string; pole: "high" | "low" | "mixed" };
const poleOf = (person: number, career: number): Part["pole"] => (person >= 0 && career >= 0 ? "high" : person < 0 && career < 0 ? "low" : "mixed");

/** Each component split into named parts, in fulfilment points (0–100 scale), at the point estimate. */
function parts(pt: PersonPoint, l: LaneCtx, s: Scored, cp: CompiledPerson, p: PersonProfile): Part[] {
  const out: Part[] = [];
  const src = (k: string) => p.inputs[k as PersonConstructId]?.source ?? k;
  if (s.weights.interests && pt.interestsUnit && l.interestsUnit)
    RIASEC.forEach((k, i) => {
      const [a, b] = [pt.interestsUnit![i]!, l.interestsUnit![i]!];
      out.push({ id: `interests.${k}`, ...shapeLabel(RIASEC_NAME[k]!, "interests", a, b), pole: poleOf(a, b), component: "interests", contribution: (100 * s.weights.interests * a * b) / 2, sources: [src(`interests.${k}`)] });
    });
  if (s.weights.values && pt.valuesUnit && l.valuesUnit)
    WORK_VALUES.forEach((k, i) => {
      const [a, b] = [pt.valuesUnit![i]!, l.valuesUnit![i]!];
      out.push({ id: `values.${k}`, ...shapeLabel(k, "value", a, b), pole: poleOf(a, b), component: "values", contribution: (100 * s.weights.values * a * b) / 2, sources: [src(`values.${k}`)] });
    });
  if (s.weights.valueModes && l.modesUnit && pt.modes.every((x) => x !== null)) {
    const u = unit(pt.modes as number[]);
    if (u)
      VALUE_MODES.forEach((m, i) => {
        const [a, b] = [u[i]!, l.modesUnit![i]!];
        out.push({ id: `mode.${m.id}`, ...shapeLabel(`${m.name} (${m.archetype})`, "mode", a, b), pole: poleOf(a, b), component: "valueModes", contribution: (100 * s.weights.valueModes * a * b) / 2, sources: cp.modes[i]?.sources ?? [] });
      });
  }
  if (s.weights.environment) {
    const ew = s.comps.environment.reduce((a, e) => a + e.weight, 0);
    for (const e of s.comps.environment) {
      const i = ENV_DIMS.findIndex((d) => d.id === e.id);
      const name = ENV_BY_ID.get(e.id)!.name;
      const alt = e.career < e.person ? `${name}: less than you need` : `${name}: more than suits you`;
      out.push({ id: `env.${e.id}`, label: name, alt, pole: "high", component: "environment", contribution: (100 * s.weights.environment * e.weight * e.fit) / ew, sources: cp.env[i]?.sources ?? [] });
    }
  }
  if (s.weights.challenge && s.comps.challenge !== null)
    out.push({ id: "env.challenge", label: CHALLENGE.name, alt: `${CHALLENGE.name}: less than your reasoning range`, pole: "high", component: "challenge", contribution: 100 * s.weights.challenge * s.comps.challenge, sources: cp.challenge?.sources ?? [] });
  return out;
}

/** Drivers and frictions: each part against the same part averaged over all career paths. */
function driversFrictions(own: Part[], baseline: Map<string, number>): { drivers: Driver[]; frictions: Driver[] } {
  const rel = own.map(({ alt, pole, ...d }) => ({ d: { ...d, contribution: Math.round((d.contribution - (baseline.get(d.id) ?? 0)) * 10) / 10 }, alt, pole }));
  // Shared strengths lead; shared absences ("little X work, which suits you") come after them.
  const rank = (x: (typeof rel)[number]) => (x.pole === "low" ? 1 : 0);
  return {
    drivers: rel.filter((x) => x.d.contribution >= 0.5).sort((a, b) => rank(a) - rank(b) || b.d.contribution - a.d.contribution).slice(0, 4).map((x) => x.d),
    frictions: rel.filter((x) => x.d.contribution <= -0.5).sort((a, b) => a.d.contribution - b.d.contribution).slice(0, 3).map((x) => ({ ...x.d, label: x.alt })),
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
  const ahead = drawsModes.filter((d) => d[ia]! > d[ib]!).length / Math.max(1, drawsModes.length);
  const pair = overlappingModes().find(([x, y]) => (x === a!.id && y === b!.id) || (x === b!.id && y === a!.id));
  const tentative = !!pair || ahead < cfg.archetypeConfidence;
  const reason = pair
    ? `${a!.archetype} and ${b!.archetype} are built from largely the same scores, so they can't be told apart.`
    : ahead < cfg.archetypeConfidence
      ? `${a!.archetype} leads ${b!.archetype} in only ${Math.round(ahead * 100)}% of draws once measurement error is allowed for.`
      : null;
  return { blend, top2: [a!, b!].map((x) => ({ id: x.id, archetype: x.archetype, share: x.share })), tentative, reason };
}

/* ---------------------------------------------------------------- main ---- */

export type MatchOptions = { config?: V2Config; draws?: number; seed?: number };

/** Every career path for one person: fits as distributions, drivers, bands from rank stability. */
export function matchAllV2(person: PersonProfile, lanes: Record<string, LaneProfileV2>, opts: MatchOptions = {}): MatchResultV2 {
  const cfg = opts.config ?? V2_CONFIG;
  checkConfig(cfg);
  const draws = opts.draws ?? cfg.draws;
  const ctxs = Object.entries(lanes).map(([id, l]) => laneCtx(id, l));
  const cp = compilePerson(person);
  const keys = Object.keys(person.inputs) as PersonConstructId[];
  const est: Values = Object.fromEntries(keys.map((k) => [k, person.inputs[k]!.value]));
  const pt = personPoint(cp, est);

  // Monte Carlo: redraw every input from its standard error, rescore every career path.
  const n = ctxs.length;
  const F = new Float64Array(draws * n);
  const A = new Float64Array(draws * n);
  const drawModes: (number | null)[][] = [];
  const normal = rng(opts.seed ?? profileSeed(person));
  for (let d = 0; d < draws; d++) {
    const v: Values = {};
    for (const k of keys) v[k] = clamp(person.inputs[k]!.value + person.inputs[k]!.se * normal());
    const dp = personPoint(cp, v);
    drawModes.push(dp.modes);
    const all = scoreAll(dp, ctxs, cfg);
    for (let j = 0; j < n; j++) {
      F[d * n + j] = all[j]!.fulfilment ?? NaN;
      A[d * n + j] = all[j]!.ability ?? NaN;
    }
  }

  // Rank stability: share of draws in the person's top 10% and bottom 40%.
  const top = Math.max(1, Math.ceil(cfg.bands.topShare * n));
  const bottom = Math.max(1, Math.floor(cfg.bands.bottomShare * n));
  const pTop = new Float64Array(n);
  const pBottom = new Float64Array(n);
  const idx = Array.from({ length: n }, (_, j) => j);
  for (let d = 0; d < draws; d++) {
    const row = F.subarray(d * n, d * n + n);
    if (Number.isNaN(row[0]!)) continue;
    idx.sort((a, b) => row[b]! - row[a]!);
    for (let r = 0; r < top; r++) pTop[idx[r]!]! += 1 / draws;
    for (let r = n - bottom; r < n; r++) pBottom[idx[r]!]! += 1 / draws;
  }

  // Point-estimate parts, and their average over all career paths (the baseline for drivers).
  const scored = scoreAll(pt, ctxs, cfg);
  const allParts = ctxs.map((l, j) => parts(pt, l, scored[j]!, cp, person));
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
    const band: BandV2 = insufficient ? "insufficient" : pTop[j]! >= cfg.bands.strong ? "strong" : pBottom[j]! >= cfg.bands.unlikely ? "unlikely" : "possible";
    const { drivers, frictions } = driversFrictions(allParts[j]!, baseline);
    return {
      laneId: l.id,
      name: l.lane.name,
      provenance: l.lane.provenance,
      band,
      pTop: Math.round(pTop[j]! * 1000) / 1000,
      pBottom: Math.round(pBottom[j]! * 1000) / 1000,
      direction: l.direction,
      fulfilmentFit: insufficient ? { mean: NaN, sd: NaN, p10: NaN, p50: NaN, p90: NaN } : distribution(f),
      abilityFit: a.length ? distribution(a) : null,
      components: scored[j]!.comps,
      drivers,
      frictions,
    } satisfies LaneMatchV2;
  });

  const bandCounts: Record<BandV2, number> = { strong: 0, possible: 0, unlikely: 0, insufficient: 0 };
  for (const r of results) bandCounts[r.band]++;

  const notes: MatchResultV2["notes"] = [];
  if (!cp.hasInterests) notes.push({ code: "missing_interests", text: "Career paths can't be matched until the interests questionnaire is done." });
  if (!cp.areas.some(Boolean)) notes.push({ code: "no_reasoning", text: "Ability fit needs the reasoning tasks; until then only fulfilment fit is shown." });
  const flat =
    pt.interests !== null &&
    sd(pt.interests) < cfg.flat.interestsSd &&
    pt.modes.every((x) => x !== null) &&
    sd(pt.modes as number[]) < cfg.flat.modesSd;
  if (flat)
    notes.push({
      code: "flat_profile",
      text: `Your interest and value-mode scores are close together, so few career paths stand out once measurement error is allowed for (${bandCounts.strong} strong ${bandCounts.strong === 1 ? "fit" : "fits"}). That is a result in itself: several directions suit you about equally well.`,
    });

  return { version: cfg.version, draws, lanes: results, bandCounts, archetype: archetypeBlend(pt, drawModes, cfg), notes };
}

/**
 * One career path for one person (the brief's computeFit). Drivers and frictions are relative to
 * the average of `field` (all career paths by default), so they mean "better or worse than a
 * typical career path for you". Same draws as matchAllV2 for the same profile.
 */
export function computeFit(person: PersonProfile, lane: LaneProfileV2, field: Record<string, LaneProfileV2>, opts: MatchOptions = {}): FitV2 {
  const id = Object.entries(field).find(([, l]) => l === lane)?.[0] ?? "__lane";
  const all = id === "__lane" ? { ...field, __lane: lane } : field;
  const r = matchAllV2(person, all, opts).lanes.find((x) => x.laneId === id)!;
  return { fulfilmentFit: r.fulfilmentFit, abilityFit: r.abilityFit, components: r.components, drivers: r.drivers, frictions: r.frictions };
}

export const MODE_LABEL = (id: string) => {
  const m = MODE_BY_ID.get(id);
  return m ? `${m.name} (${m.archetype})` : id;
};
