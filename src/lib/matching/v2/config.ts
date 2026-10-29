import type { InputOptions } from "../../workdesign/person";

/**
 * Matching v2 settings. Every number here is provisional: a reasoned starting point, to be fitted
 * to outcome data later (docs/MATCHING_V2.md).
 */
export type V2Config = {
  version: string;
  weights: { interests: number; values: number; valueModes: number; environment: number; challenge: number; strengths: number };
  environmentWeightFloor: number;
  draws: number;
  bands: { topShare: number; bottomShare: number; strong: number; unlikely: number };
  facetCap: number;
  archetypeTemperature: number;
  archetypeConfidence: number;
  flat: { minStrong: number; interestsSd: number; modesSd: number };
  minPairs: number;
  correlationFloor: number;
  componentRefSd: { interests: number; values: number; valueModes: number; environment: number; challenge: number; strengths: number };
  /** Reasoning strengths needs at least this many reasoning areas measured on both sides. */
  minAreas: number;
  /**
   * Reasoning strengths regularisation. Person side: the profile counts as partly flat below a spread
   * of max(correlationFloor, strengthsSeFactor × the areas' RMS standard error) per area, so areas
   * measured with wide error (real reasoning bands have SEs of 14–22 points) count for little.
   * Career side: below `strengthsCareerFloor` percentile points per area, the career's demands count as
   * partly flat, so near-flat demands don't become a full-strength "this work leans on X".
   */
  strengthsSeFactor: number;
  strengthsCareerFloor: number;
  guardMinTotal: number;
  /** How the person's inputs are built (norms on or off, how work values are mapped). */
  inputs: InputOptions;
  /**
   * No single environment dimension may carry more than this share of any fit (null: no cap).
   * Measured like the facet cap: a dimension's effect on the fit (the fit with it against the fit
   * with it left out of the environment component) over the summed effects of all inputs, floored at
   * guardMinTotal. Above the cap the dimension's need weight is shrunk until it isn't.
   */
  envCap: number | null;
  /** "need": each environment dimension weighted by the person's need strength; "flat": all equal. */
  envWeighting: "need" | "flat";
  /**
   * How well established each component's evidence is, and the multiplier that applies to its
   * weight (effective weight = weight × multiplier, renormalised). A lever for when evidence changes;
   * the weights above already reflect today's evidence, so the multipliers are all 1 for now.
   */
  validationStatus: Record<keyof V2Config["weights"], ValidationStatus>;
  validationMultiplier: Record<ValidationStatus, number>;
  /**
   * Weight ensemble (null: off). Each Monte Carlo draw also draws the component weights from a
   * Dirichlet centred on the effective weights (α = concentration × weight), and with probability
   * flatEnvShare uses flat environment weighting. Bands then need to hold under both weightings.
   */
  ensemble: { concentration: number; flatEnvShare: number } | null;
  /** Rank starting roles from their own O*NET profile where they have one (false: by tags, as before). */
  rolesFromData: boolean;
};

export type ValidationStatus = "validated" | "derived" | "provisional";

const V2_0_4: V2Config = {
  version: "v2-0.4",
  /**
   * Fulfilment fit (needs–supplies) as a weighted combination of its components. Each component is
   * centred on the person's average career path and divided by a fixed reference spread
   * (componentRefSd), so the weights are comparable across components (as SD shares) while a
   * near-flat profile stays near-flat. Renormalised over the components the person has.
   *
   * strengths (v2-0.4, the owner's option 1): a small extra component that credits career paths
   * leaning on the reasoning areas that are the person's own strongest, and doesn't hold it against
   * them where they lean on the weaker ones less. Without reasoning results it drops out and the
   * other weights renormalise back to exactly what they were.
   */
  weights: { interests: 0.35, values: 0.15, valueModes: 0.2, environment: 0.2, challenge: 0.1, strengths: 0.08 },
  /**
   * Environment dimensions are weighted by how strong the person's need is: two-sided |p − 50| / 50;
   * deficit (only "too little" hurts) max(0, p − 50) / 50; excess (only "too much" hurts)
   * max(0, 50 − p) / 50. A low need on a deficit dimension can never be let down, so it gets only
   * the floor (it can then only be let down by unusually extreme careers). The floor keeps a
   * perfectly neutral profile defined.
   */
  environmentWeightFloor: 0.05,
  /** Monte Carlo draws of the person's scores from their standard errors. */
  draws: 500,
  /** The seed is derived from the profile, so the same profile always gets the same result. */
  bands: {
    /** "Top" and "bottom" as shares of all career paths. */
    topShare: 0.1,
    bottomShare: 0.4,
    /** Strong fit: P(in top 10%) at least this. Unlikely: P(in bottom 40%) at least this. Tuned in docs/MATCHING_V2.md. */
    strong: 0.5,
    unlikely: 0.7,
  },
  /**
   * No single personality facet may carry more than this share of any fit. A facet's share is its
   * effect on the fit (the fit with the facet against the fit with the facet set to its domain
   * score) over the summed effects of all inputs, with that sum floored at guardMinTotal fit points
   * so a tiny effect on a near-flat profile isn't "100%". Above the cap the facet is shrunk towards
   * its domain score, repeated until no facet is over (enforced per person in matchAllV2).
   */
  facetCap: 0.15,
  /** Archetype blend: softmax over the nine mode scores (0–100) with this temperature, in score points. */
  archetypeTemperature: 8,
  /** The blend is "tentative" when the leading mode beats the second in fewer than this share of draws (draws only). */
  archetypeConfidence: 0.9,
  /**
   * Fewer than `minStrong` strong fits gets an explanation; the reason names a flat profile when the
   * SD of the interests or of the value modes is below these (0–100 points).
   */
  flat: { minStrong: 8, interestsSd: 10, modesSd: 6 },
  /** Minimum overlapping items for a profile correlation. */
  minPairs: 5,
  /**
   * Profile correlations are regularised: r = Σ ĉᵢ(xᵢ − x̄) / max(‖x − x̄‖, floor·√n). Below a spread
   * of `correlationFloor` points per item, the person's profile counts as partly flat, so tiny score
   * differences can't flip a whole ranking.
   */
  correlationFloor: 10,
  /**
   * Each component's typical spread across career paths (0–1 scale): the median over 400 simulated
   * people (scripts/validate-matching-v2.mts population; componentSpreads in fit.ts). Fixed, so a
   * person whose component barely varies across careers gets a component that barely matters.
   */
  componentRefSd: { interests: 0.195, values: 0.19, valueModes: 0.14, environment: 0.065, challenge: 0.095, strengths: 0.17 },
  minAreas: 3,
  strengthsSeFactor: 2.5,
  strengthsCareerFloor: 8,
  /** The facet guard's floor on summed input effects, in fit points (one component SD ≈ 10). */
  guardMinTotal: 10,
  /** v2-0.4 and earlier: no norms (every interest and personality score anchored), min–max work values. */
  inputs: { norms: false, values: "minmax" },
  envCap: null,
  envWeighting: "need",
  validationStatus: { interests: "validated", values: "validated", valueModes: "derived", environment: "derived", challenge: "derived", strengths: "provisional" },
  validationMultiplier: { validated: 1, derived: 1, provisional: 1 },
  ensemble: null,
  rolesFromData: false,
};

/** v2-0.3: v2-0.4 without the reasoning-strengths component (weight 0). Kept for comparison. */
const V2_0_3: V2Config = { ...V2_0_4, version: "v2-0.3", weights: { ...V2_0_4.weights, strengths: 0 } };

/**
 * v2-0.5, the precision pass (docs/MATCHING_V2.md, "Precision pass"):
 * 1. norms: interests normed against the published O*NET Short-IP norms (personality stays
 *    anchored until its norms are transcribed);
 * 2. work values by expected normal order statistics × 0.7, not min–max;
 * 3. no single environment dimension above 15% of any fit;
 * 4. weights moved towards the validated instruments with the strongest evidence. Interests
 *    (the O*NET Interest Profiler; interest–occupation congruence is the best-replicated predictor
 *    of satisfaction and persistence among these) carry most, then work values (O*NET Work
 *    Importance Locator, matched to O*NET's own occupational reinforcer profiles). Value modes,
 *    working conditions and challenge are Lane's own derived constructs, so they carry less.
 *    Reasoning strengths keeps its small 0.08 (renormalised when present, as since v2-0.4);
 * 5. a weight ensemble: Dirichlet weights (concentration 40) and, half the time, flat environment
 *    weighting, so a band can't hang on one exact choice of weights;
 * 6. starting roles ranked from their own O*NET profile where they have one (matching/roles.ts).
 */
const V2_0_5: V2Config = {
  ...V2_0_4,
  version: "v2-0.5",
  weights: { interests: 0.45, values: 0.2, valueModes: 0.15, environment: 0.1, challenge: 0.1, strengths: 0.08 },
  inputs: { norms: true, values: "orderStats" },
  envCap: 0.15,
  ensemble: { concentration: 40, flatEnvShare: 0.5 },
  rolesFromData: true,
};

/** Every selectable config, by version. */
export const V2_CONFIGS: Record<string, V2Config> = { "v2-0.3": V2_0_3, "v2-0.4": V2_0_4, "v2-0.5": V2_0_5 };
export const DEFAULT_V2_VERSION = "v2-0.5";

/**
 * The config the app runs: MATCHING_CONFIG (a version above) if set, else the default. Read once at
 * start-up; an unknown version fails loudly rather than silently matching with another one.
 */
export function selectConfig(version: string | undefined = process.env.MATCHING_CONFIG): V2Config {
  const v = version?.trim() || DEFAULT_V2_VERSION;
  const c = V2_CONFIGS[v];
  if (!c) throw new Error(`MATCHING_CONFIG=${v} is not one of ${Object.keys(V2_CONFIGS).join(", ")}`);
  return c;
}

export const V2_CONFIG: V2Config = selectConfig();
