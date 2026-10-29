/**
 * Shared pieces for the precision pass scripts (validate-precision.mts, precision-steps.mts):
 * the cumulative step configs, career offsets for any config, the synthetic "typical incumbent"
 * of a career path, and Holland-code congruence (C index, Iachan's M).
 */
import { LANE_PROFILES_V2, V2_CONFIGS, offsetsFor, populationOffsets, type LaneProfileV2, type Offsets, type V2Config } from "../src/lib/matching/v2";
import { population, type SyntheticSpec } from "../src/lib/matching/v2/synthetic";
import onetFile from "../taxonomy/derived/lane_onet_profiles.json";

export const V3 = V2_CONFIGS["v2-0.3"]!;
export const V4 = V2_CONFIGS["v2-0.4"]!;
export const V5 = V2_CONFIGS["v2-0.5"]!;

/**
 * The precision pass applied one step at a time on top of v2-0.4 (step 9). Step 5 is v2-0.5 itself
 * (whose starting-role change doesn't move career paths).
 */
export const STEPS: { id: string; label: string; cfg: V2Config }[] = (() => {
  const s1: V2Config = { ...V4, version: "step1-norms", inputs: { norms: true, values: "minmax" } };
  const s2: V2Config = { ...s1, version: "step2-values", inputs: { norms: true, values: "orderStats" } };
  const s3: V2Config = { ...s2, version: "step3-cap", envCap: V5.envCap };
  const s4: V2Config = { ...s3, version: "step4-weights", weights: V5.weights, validationStatus: V5.validationStatus, validationMultiplier: V5.validationMultiplier };
  return [
    { id: "v2-0.4", label: "v2-0.4 (before)", cfg: V4 },
    { id: "step1", label: "1. Norms only", cfg: s1 },
    { id: "step2", label: "2. + values (order statistics)", cfg: s2 },
    { id: "step3", label: "3. + environment cap", cfg: s3 },
    { id: "step4", label: "4. + weights", cfg: s4 },
    { id: "step5", label: "5. + ensemble (= v2-0.5)", cfg: V5 },
  ];
})();

/** The bundled offsets for a registry config; for a step config, built from the same reference population. */
const built = new Map<string, Offsets>();
export function offsetsForConfig(cfg: V2Config): Offsets {
  if (V2_CONFIGS[cfg.version]) return offsetsFor(cfg);
  let o = built.get(cfg.version);
  if (!o) {
    o = populationOffsets(population(1000, 424242, cfg.inputs), LANE_PROFILES_V2, cfg);
    built.set(cfg.version, o);
  }
  return o;
}

/* ------------------------------------------------------------ incumbents ---- */

type Desc = Record<string, Record<string, Record<string, { raw: number; pct: number }>>>;
const ONET = (onetFile as unknown as { lanes: Record<string, { descriptors: Desc }> }).lanes;

/**
 * O*NET Work Styles (31.0) → IPIP-NEO facets: each facet takes the style closest to it in content.
 * Domains are the mean of their mapped styles; Neuroticism is the reverse of Stress Tolerance and
 * Self-Control. The style's percentile across occupations stands in for the incumbent's answer
 * position (0–100). A documented approximation: Work Styles are importance ratings for the job,
 * not trait scores of the people in it.
 */
export const WORK_STYLE_MAP: { facet: string; style: string; reverse?: boolean }[] = [
  { facet: "C1", style: "Self-Confidence" },
  { facet: "C2", style: "Attention to Detail" },
  { facet: "C3", style: "Dependability" },
  { facet: "C4", style: "Achievement Orientation" },
  { facet: "C5", style: "Perseverance" },
  { facet: "C6", style: "Cautiousness" },
  { facet: "E1", style: "Social Orientation" },
  { facet: "E2", style: "Social Orientation" },
  { facet: "E3", style: "Leadership Orientation" },
  { facet: "E4", style: "Initiative" },
  { facet: "E6", style: "Optimism" },
  { facet: "O1", style: "Innovation" },
  { facet: "O4", style: "Tolerance for Ambiguity" },
  { facet: "O5", style: "Intellectual Curiosity" },
  { facet: "A2", style: "Sincerity" },
  { facet: "A4", style: "Cooperation" },
  { facet: "A5", style: "Humility" },
  { facet: "A6", style: "Empathy" },
  { facet: "N2", style: "Self-Control", reverse: true },
  { facet: "N5", style: "Self-Control", reverse: true },
  { facet: "N6", style: "Stress Tolerance", reverse: true },
];
const DOMAIN_OF: Record<string, "Neuroticism" | "Extraversion" | "Openness" | "Agreeableness" | "Conscientiousness"> = { N: "Neuroticism", E: "Extraversion", O: "Openness", A: "Agreeableness", C: "Conscientiousness" };
const WV = ["Achievement", "Independence", "Recognition", "Relationships", "Support", "Working Conditions"] as const;
const AREAS = ["reasoning", "quantitative", "spatial", "memory", "speed"] as const;

/**
 * A synthetic typical incumbent of a career path, on the questionnaire's own scales:
 * interests from O*NET OI ((OI − 1) / 6 → 0–100), work values from EX (their order), personality
 * from Work Styles (WORK_STYLE_MAP), reasoning areas from the career's ability demand percentiles.
 */
export function incumbent(laneId: string, lane: LaneProfileV2 = LANE_PROFILES_V2[laneId]!): SyntheticSpec {
  const d = ONET[laneId]?.descriptors ?? {};
  const style = (name: string) => d["Work Styles"]?.[name]?.["WI"]?.pct ?? null;
  const facets: Record<string, number> = {};
  for (const m of WORK_STYLE_MAP) {
    const v = style(m.style);
    if (v !== null) facets[m.facet] = m.reverse ? 100 - v : v;
  }
  const domains: Record<string, number> = {};
  for (const [letter, dom] of Object.entries(DOMAIN_OF)) {
    const xs = Object.entries(facets).filter(([f]) => f[0] === letter).map(([, v]) => v);
    if (xs.length) domains[dom] = xs.reduce((a, b) => a + b, 0) / xs.length;
  }
  const areas = Object.fromEntries(AREAS.flatMap((a) => {
    const x = lane.abilities.find((y) => y.area === a);
    return x?.demand != null ? [[a, x.demand]] : [];
  }));
  const av = Object.values(areas) as number[];
  return {
    interests: Object.fromEntries(["R", "I", "A", "S", "E", "C"].map((k, i) => [k, ((lane.interests[i]! - 1) / 6) * 100])),
    values: lane.values ? Object.fromEntries(WV.map((v, i) => [v, lane.values![i]! * 10])) : undefined,
    domains,
    facets: facets as SyntheticSpec["facets"],
    reasoning: av.length ? av.reduce((a, b) => a + b, 0) / av.length : undefined,
    areas,
  };
}

/* ------------------------------------------------------------ congruence ---- */

const HEX = ["R", "I", "A", "S", "E", "C"];
/** Hexagon closeness: same 3, adjacent 2, alternate 1, opposite 0. */
const close = (a: string, b: string) => {
  const d = Math.abs(HEX.indexOf(a) - HEX.indexOf(b));
  return 3 - Math.min(d, 6 - d);
};
/** Brown & Gore's (1994) C index for two three-letter codes: 3·c₁ + 2·c₂ + c₃ (0–18). */
export const cIndex = (p: string, c: string) => 3 * close(p[0]!, c[0]!) + 2 * close(p[1]!, c[1]!) + close(p[2]!, c[2]!);
/** Iachan's (1984) M index (0–28): weights for a letter shared at person position i, career position j. */
const IACHAN = [
  [22, 10, 4],
  [10, 5, 2],
  [4, 2, 1],
];
export const iachan = (p: string, c: string) => [...p].reduce((a, x, i) => a + (c.indexOf(x) >= 0 ? IACHAN[i]![c.indexOf(x)]! : 0), 0);
/** The three highest of six RIASEC scores as a code (ties keep R-I-A-S-E-C order). */
export const code3 = (xs: number[]) =>
  xs
    .map((x, i) => [x, i] as const)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, 3)
    .map(([, i]) => HEX[i])
    .join("");

/** Ranks, 1 = highest, ties take the average rank. */
export function ranks(xs: number[]): number[] {
  const order = xs.map((x, i) => [x, i] as const).sort((a, b) => b[0] - a[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    for (let k = i; k <= j; k++) r[order[k]![1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
export function spearman(a: number[], b: number[]): number {
  const ra = ranks(a);
  const rb = ranks(b);
  const m = (ra.length + 1) / 2;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < ra.length; i++) {
    num += (ra[i]! - m) * (rb[i]! - m);
    da += (ra[i]! - m) ** 2;
    db += (rb[i]! - m) ** 2;
  }
  return num / Math.sqrt(da * db);
}

/** Seeded standard normal draws (mulberry32 + Box–Muller). */
export function normals(seed: number) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.max(((t ^ (t >>> 14)) >>> 0) / 4294967296, 1e-12);
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
