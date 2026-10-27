/**
 * Synthetic person profiles for validating matching v2: the brief's six archetypal test profiles,
 * and a population generator for the simulation. Inputs are on the Work Design 0–100 scale with
 * the same standard errors real profiles get (src/lib/workdesign/person.ts). Pure.
 */
import type { PersonConstructId } from "../../workdesign/model";
import { PLANNING_SD, type Estimate } from "../../workdesign/person";
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

/** A complete profile: every input at 50 unless the spec says otherwise; facets default to their domain. */
export function synthetic(spec: SyntheticSpec): PersonProfile {
  const inputs: Partial<Record<PersonConstructId, Estimate>> = {};
  const put = (id: string, value: number, se: number, provenance: Estimate["provenance"]) => {
    inputs[id as PersonConstructId] = { value: Math.min(100, Math.max(0, value)), se, provenance, source: `synthetic.${id}` };
  };
  for (const k of ["R", "I", "A", "S", "E", "C"] as const) put(`interests.${k}`, spec.interests?.[k] ?? 50, SE.interests, "anchored");
  DOMAINS.forEach((d, i) => {
    const v = spec.domains?.[d] ?? 50;
    put(`neo.${d}`, v, SE.domain, "anchored");
    for (let f = 1; f <= 6; f++) {
      const id = `${LETTERS[i]}${f}` as keyof NonNullable<SyntheticSpec["facets"]>;
      put(`neo.${id}`, spec.facets?.[id] ?? v, SE.facet, "anchored");
    }
  });
  // Work values are ipsative: lowest 0, highest 100, as personInputs produces them.
  const raw = VALUES.map((v) => spec.values?.[v] ?? 50);
  const [lo, hi] = [Math.min(...raw), Math.max(...raw)];
  VALUES.forEach((v, i) => put(`values.${v}`, hi === lo ? 50 : ((raw[i]! - lo) / (hi - lo)) * 100, SE.values, "ipsative"));
  const g = spec.reasoning ?? 50;
  put("reasoning.general", g, SE.reasoning, "normed");
  for (const a of AREAS) put(`reasoning.${a}`, spec.areas?.[a] ?? g, SE.reasoning + 2, "normed");
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
export function population(n: number, seed = 1): PersonProfile[] {
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
    out.push(
      synthetic({
        interests: { R: s(-0.7 * people), I: s(0.8 * ideas), A: s(0.5 * ideas + 0.2 * people), S: s(0.8 * people), E: s(0.7 * drive + 0.3 * people), C: s(-0.5 * ideas + 0.2 * drive) },
        domains: { Extraversion: s(0.5 * people + 0.4 * drive, 12), Openness: s(0.6 * ideas, 12), Agreeableness: s(0.5 * people - 0.2 * drive, 12), Conscientiousness: s(0.3 * drive, 12), Neuroticism: s(-0.2 * drive, 12) },
        values: { Achievement: s(0.5 * drive), Independence: s(0.4 * ideas), Recognition: s(0.6 * drive), Relationships: s(0.6 * people), Support: s(0.2 * people), "Working Conditions": s(-0.3 * drive) },
        reasoning: s(0.4 * ideas, 18),
        risk: s(0.4 * drive),
        patience: s(0.2 * ideas),
      }),
    );
  }
  return out;
}
