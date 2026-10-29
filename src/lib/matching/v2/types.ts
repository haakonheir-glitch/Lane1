/**
 * Matching v2 shapes. The person side comes from the Work Design inputs (0–100 with standard
 * errors, src/lib/workdesign/person.ts); the career side from O*NET (taxonomy/derived/
 * lane_profiles_v2.json, built by taxonomy/build/build_v2_lane_profiles.mts).
 */
import type { PersonConstructId } from "../../workdesign/model";
import type { Estimate } from "../../workdesign/person";

export const RIASEC = ["R", "I", "A", "S", "E", "C"] as const;
/** O*NET Work Values, in the order the career profiles store them; the person-side ids use the same names. */
export const WORK_VALUES = ["Achievement", "Working Conditions", "Recognition", "Relationships", "Support", "Independence"] as const;
export type AbilityArea = "reasoning" | "quantitative" | "spatial" | "memory" | "speed";

/** One career path's O*NET profile for matching. Values on O*NET's own scales unless noted. */
export type LaneProfileV2 = {
  name: string;
  provenance: "onet" | "estimated" | "unlinked";
  coverage: number | null;
  /** O*NET interest profile (OI, 1–7), in RIASEC order. */
  interests: number[];
  /** O*NET Work Values extents (EX, 1–7), in WORK_VALUES order; null when the linked occupations have none. */
  values: number[] | null;
  /** The nine value modes and the environment dimensions, 0–100 (percentiles across O*NET occupations). */
  modes: Record<string, number | null>;
  environment: Record<string, number | null>;
  /** Per reasoning area: importance-weighted Level percentile of its O*NET abilities, and mean Importance (1–5). */
  abilities: { area: AbilityArea; demand: number | null; importance: number | null }[];
};

export type LaneProfilesFile = { workDesign: string; release: Record<string, string>; lanes: Record<string, LaneProfileV2> };

/** The person: every Work Design input with its value and standard error (0–100). */
export type PersonProfile = { inputs: Partial<Record<PersonConstructId, Estimate>> };

/**
 * A fit as a distribution over Monte Carlo draws of the person's scores. Fulfilment fit is on a
 * T-like scale relative to the person's own career paths (50 = their average career path, ±10 ≈
 * one SD of a component); ability fit is 0–100 (100 = no shortfall).
 */
export type Distribution = { mean: number; sd: number; p10: number; p50: number; p90: number };

/** Something that makes a career path fit (or rub), relative to the average career path, in fulfilment points. */
export type Driver = {
  id: string;
  label: string;
  component: "interests" | "values" | "valueModes" | "environment" | "challenge" | "strengths";
  contribution: number;
  /** The person's score ids this rests on (Work Design input sources). */
  sources: string[];
};

export type EnvironmentComponent = { id: string; person: number; career: number; fit: number; weight: number; penalty: "deficit" | "excess" | "two_sided" };

export type Components = {
  /** 0–1 each; null when either side is missing. */
  interests: number | null;
  values: number | null;
  valueModes: number | null;
  environment: EnvironmentComponent[];
  challenge: number | null;
  /** Reasoning strengths: how well the shape of the person's reasoning areas matches the abilities the career leans on. */
  strengths: number | null;
  /** Components the career path has no data for, filled with the person's average for that component (neutral). */
  imputed: string[];
};

export type FitV2 = {
  fulfilmentFit: Distribution;
  /** null when the person has no reasoning scores. */
  abilityFit: Distribution | null;
  components: Components;
  drivers: Driver[];
  frictions: Driver[];
};

export type BandV2 = "strong" | "possible" | "unlikely" | "insufficient";

export type LaneMatchV2 = FitV2 & {
  laneId: string;
  name: string;
  provenance: LaneProfileV2["provenance"];
  band: BandV2;
  /** Share of draws in which this career path is in the person's top 10% / bottom 40%. */
  pTop: number;
  pBottom: number;
  /** With the weight ensemble: the same shares under need-weighted and under flat environment weighting (bands need both). */
  pBy?: { need: { top: number; bottom: number }; flat: { top: number; bottom: number } };
  /** The career path's own leading value mode (its "direction"). */
  direction: string | null;
};

export type ArchetypeBlend = {
  /** Softmax weights over the nine modes, highest first. */
  blend: { id: string; archetype: string; name: string; share: number }[];
  top2: { id: string; archetype: string; share: number }[];
  tentative: boolean;
  /** Why the blend is tentative, when it is. */
  reason: string | null;
  /** A caveat that holds even when the blend isn't tentative (e.g. the top two share most inputs). */
  caveat: string | null;
};

/** The facet guard's action for one person: facets shrunk towards their domain score, and why. */
export type FacetGuard = { facet: string; shrink: number; maxShareBefore: number; maxShareAfter: number };

/** The environment guard for one person: every guarded dimension's largest share of any fit, before and after, and the multiplier on its need weight. */
export type EnvGuard = { dimension: string; scale: number; maxShareBefore: number; maxShareAfter: number };

export type MatchResultV2 = {
  version: string;
  draws: number;
  lanes: LaneMatchV2[];
  bandCounts: Record<BandV2, number>;
  archetype: ArchetypeBlend | null;
  guard: FacetGuard[];
  /** Empty when the config has no environment cap. */
  envGuard: EnvGuard[];
  /** Plain-language notes about the result as a whole (e.g. a flat profile). */
  notes: { code: "flat_profile" | "few_strong" | "missing_interests" | "no_reasoning" | "facet_guard"; text: string }[];
};
