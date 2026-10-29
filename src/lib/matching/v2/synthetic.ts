/**
 * Synthetic person profiles for validating matching v2: the brief's six archetypal test profiles,
 * and a population generator for the simulation. Inputs are on the Work Design 0–100 scale with
 * the same standard errors real profiles get (src/lib/workdesign/person.ts). Pure.
 */
import type { PersonConstructId } from "../../workdesign/model";
import { PLANNING_SD, fromScale, probit, valueEstimates, type Estimate, type InputOptions } from "../../workdesign/person";
import { normed } from "../../scoring/core";
import { lookup } from "../../scoring/psychometrics";
import { ASSUMED_RELIABILITY } from "../../scoring/self";
import type { PersonProfile } from "./types";

const DOMAINS = ["Neuroticism", "Extraversion", "Openness", "Agreeableness", "Conscientiousness"] as const;
const LETTERS = ["N", "E", "O", "A", "C"] as const;
const VALUES = ["Achievement", "Independence", "Recognition", "Relationships", "Support", "Working Conditions"] as const;
const AREAS = ["reasoning", "spatial", "quantitative", "memory", "speed"] as const;

const SE = {
  interests: PLANNING_SD.interests * Math.sqrt(1 - ASSUMED_RELIABILITY.scale),
  domain: PLANNING_SD.personality * Math.sqrt(1 - ASSUMED_RELIABILITY.scale),
  facet: PLANNING_SD.personality * Math.sqrt(1 - ASSUMED_RELIABILITY.facet),
  values: PLANNING_SD.values * Math.sqrt(1 - ASSUMED_RELIABILITY.scale),
  reasoning: 7,
  /** Single reasoning areas rest on one or two short tasks: real percentile bands give SEs of 14–22 points. */
  area: 17,
  task: PLANNING_SD.task * Math.sqrt(1 - ASSUMED_RELIABILITY.scale),
};

export type SyntheticSpec = {
  interests?: Partial<Record<"R" | "I" | "A" | "S" | "E" | "C", number>>;
  domains?: Partial<Record<(typeof DOMAINS)[number], number>>;
  facets?: Partial<Record<`${(typeof LETTERS)[number]}${1 | 2 | 3 | 4 | 5 | 6}`, number>>;
  values?: Partial<Record<(typeof VALUES)[number], number>>;
  reasoning?: number;
  areas?: Partial<Record<(typeof AREAS)[number], number>>;
  risk?: number;
  patience?: number;
  learning?: number;
};

/** v2-0.4's input rules: everything anchored, work values min–max. */
const ANCHORED: InputOptions = { norms: false, values: "minmax" };

/**
 * A complete profile: every input at 50 unless the spec says otherwise; facets default to their domain.
 *
 * What an interest or personality number in a spec means (`specAs`):
 * - "anchored" (the default, as matching v2 was validated through v2-0.4): a position on the
 *   questionnaire's own scale, 50 = the scale midpoint, i.e. what the person answered.
 * - "percentile": the person's level in the population. It is turned into the raw score a person at
 *   that percentile gives (the published norm: raw = mean + SD · Φ⁻¹(p)), and from there read by
 *   each config's own rule: anchored (v2-0.4) or normed (v2-0.5). The same people under two rulers.
 *   Needed once norms exist, because the scale midpoint is not the population average
 *   (Conscientiousness 3.0 is near the 10th percentile).
 * Either way, with `opts.norms` the raw score is normed against the published table where it has
 * an entry, exactly as personInputs does for a real profile. Scales without a norm stay anchored.
 * Work values are card-sort scores, mapped by `opts.values`.
 */
export function synthetic(spec: SyntheticSpec, opts: InputOptions = ANCHORED, specAs: "anchored" | "percentile" = "anchored"): PersonProfile {
  const inputs: Partial<Record<PersonConstructId, Estimate>> = {};
  const put = (id: string, value: number, se: number, provenance: Estimate["provenance"]) => {
    inputs[id as PersonConstructId] = { value: Math.min(100, Math.max(0, value)), se, provenance, source: `synthetic.${id}` };
  };
  /** An anchored position → the estimate personInputs would make of the same raw score. */
  const scale = (id: string, key: string, anchored: number, range: [number, number], kind: "facet" | "scale", sd: number, se: number) => {
    const level = Math.min(100, Math.max(0, anchored));
    const norm = lookup(key);
    // The raw score: from the anchored position, or from the population percentile through the norm.
    const raw =
      specAs === "percentile" && norm
        ? Math.min(range[1], Math.max(range[0], norm.mean + norm.sd * probit(Math.min(0.995, Math.max(0.005, level / 100)))))
        : range[0] + (level / 100) * (range[1] - range[0]);
    const p = opts.norms ? norm : null;
    // Anchored: the given position itself (exact, so v2-0.4 inputs are unchanged), or the raw score's.
    if (!p) return put(id, specAs === "percentile" && norm ? ((raw - range[0]) / (range[1] - range[0])) * 100 : level, se, "anchored");
    const e = fromScale({ id, label: id, raw, rawRange: range, answered: 1, items: 1, normed: normed(raw, p), visibility: "user" }, kind, sd, id)!;
    put(id, e.value, e.se, e.provenance);
  };
  for (const k of ["R", "I", "A", "S", "E", "C"] as const) scale(`interests.${k}`, `onet.${k}`, spec.interests?.[k] ?? 50, [10, 50], "scale", PLANNING_SD.interests, SE.interests);
  DOMAINS.forEach((d, i) => {
    const v = spec.domains?.[d] ?? 50;
    scale(`neo.${d}`, `neo.${d}`, v, [1, 5], "scale", PLANNING_SD.personality, SE.domain);
    for (let f = 1; f <= 6; f++) {
      const id = `${LETTERS[i]}${f}` as keyof NonNullable<SyntheticSpec["facets"]>;
      scale(`neo.${id}`, `neo.${id}`, spec.facets?.[id] ?? v, [1, 5], "facet", PLANNING_SD.personality, SE.facet);
    }
  });
  // Work values are ipsative, mapped as personInputs maps them.
  const est = valueEstimates(VALUES.map((v) => spec.values?.[v] ?? 50), opts.values);
  VALUES.forEach((v, i) => put(`values.${v}`, est[i]!, SE.values, "ipsative"));
  const g = spec.reasoning ?? 50;
  put("reasoning.general", g, SE.reasoning, "normed");
  for (const a of AREAS) put(`reasoning.${a}`, spec.areas?.[a] ?? g, SE.area, "normed");
  put("behaviour.risk", spec.risk ?? 50, SE.task, "task");
  put("behaviour.patience", spec.patience ?? 50, SE.task, "task");
  put("behaviour.learning", spec.learning ?? 50, SE.task, "task");
  return { inputs };
}

/** The brief's six test profiles. */
export const TEST_PROFILES: Record<string, { label: string; spec: SyntheticSpec; expectFamilies: string[] }> = {
  analyst: {
    label: "Investigative / conventional analyst",
    spec: {
      interests: { R: 40, I: 88, A: 30, S: 30, E: 35, C: 78 },
      domains: { Extraversion: 35, Openness: 62, Conscientiousness: 75, Neuroticism: 40 },
      facets: { O5: 85, C2: 78, C3: 72, C6: 70 },
      values: { Achievement: 80, Independence: 75, "Working Conditions": 65, Recognition: 40, Relationships: 30, Support: 35 },
      reasoning: 85,
      areas: { quantitative: 90 },
      risk: 35,
      patience: 75,
    },
    expectFamilies: ["data_ai", "finance", "science", "software"],
  },
  carer: {
    label: "Social / artistic carer",
    spec: {
      interests: { R: 25, I: 40, A: 75, S: 92, E: 40, C: 35 },
      domains: { Agreeableness: 80, Extraversion: 62, Openness: 68 },
      facets: { A6: 88, A3: 88 },
      values: { Relationships: 92, Support: 70, Achievement: 55, Independence: 40, Recognition: 30, "Working Conditions": 45 },
    },
    expectFamilies: ["healthcare", "care_social", "education"],
  },
  maker: {
    label: "Realistic maker",
    spec: {
      interests: { R: 92, I: 55, A: 40, S: 25, E: 30, C: 45 },
      domains: { Extraversion: 40, Openness: 45, Conscientiousness: 62 },
      values: { Independence: 70, "Working Conditions": 75, Achievement: 65, Recognition: 30, Relationships: 40, Support: 35 },
      reasoning: 60,
      areas: { spatial: 82 },
    },
    expectFamilies: ["trades", "engineering", "manufacturing", "craft", "maritime_energy", "primary", "transport"],
  },
  hunter: {
    label: "Enterprising hunter",
    spec: {
      interests: { R: 30, I: 35, A: 35, S: 60, E: 92, C: 45 },
      domains: { Extraversion: 82, Neuroticism: 28, Agreeableness: 42 },
      facets: { E3: 88, C4: 80 },
      values: { Recognition: 88, Achievement: 82, Independence: 60, Relationships: 45, Support: 30, "Working Conditions": 40 },
      risk: 78,
    },
    expectFamilies: ["sales", "marketing", "real_estate", "entrepreneurship", "management"],
  },
  storyteller: {
    label: "Artistic storyteller",
    spec: {
      interests: { R: 30, I: 45, A: 94, S: 55, E: 50, C: 22 },
      domains: { Openness: 85, Extraversion: 55, Conscientiousness: 45 },
      facets: { O1: 88, O2: 92 },
      values: { Independence: 88, Achievement: 72, Recognition: 60, Relationships: 45, Support: 25, "Working Conditions": 30 },
    },
    expectFamilies: ["creative", "media", "performance", "creator", "marketing", "product_design", "craft"],
  },
  flat: { label: "Flat profile", spec: {}, expectFamilies: [] },
};

/**
 * A plausible population for the simulation: three latent factors (people–things, data–ideas,
 * drive) shape interests, personality and values, plus independent noise. Seeded, deterministic.
 */
export function population(n: number, seed = 1, opts: InputOptions = ANCHORED, specAs: "anchored" | "percentile" = "anchored"): PersonProfile[] {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const z = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
  const out: PersonProfile[] = [];
  for (let i = 0; i < n; i++) {
    const people = z();
    const ideas = z();
    const drive = z();
    const s = (load: number, sd = 15) => 50 + sd * (load + z() * 0.8);
    // Reasoning areas share a general level and differ around it (spatial leans to things, quantitative to ideas).
    const g = s(0.4 * ideas, 18);
    const area = (load: number) => g + 10 * (load + z() * 0.9);
    out.push(
      synthetic({
        interests: { R: s(-0.7 * people), I: s(0.8 * ideas), A: s(0.5 * ideas + 0.2 * people), S: s(0.8 * people), E: s(0.7 * drive + 0.3 * people), C: s(-0.5 * ideas + 0.2 * drive) },
        domains: { Extraversion: s(0.5 * people + 0.4 * drive, 12), Openness: s(0.6 * ideas, 12), Agreeableness: s(0.5 * people - 0.2 * drive, 12), Conscientiousness: s(0.3 * drive, 12), Neuroticism: s(-0.2 * drive, 12) },
        values: { Achievement: s(0.5 * drive), Independence: s(0.4 * ideas), Recognition: s(0.6 * drive), Relationships: s(0.6 * people), Support: s(0.2 * people), "Working Conditions": s(-0.3 * drive) },
        reasoning: g,
        areas: { reasoning: area(0), quantitative: area(0.3 * ideas), spatial: area(-0.4 * people), memory: area(0), speed: area(0) },
        risk: s(0.4 * drive),
        patience: s(0.2 * ideas),
      }, opts, specAs),
    );
  }
  return out;
}
