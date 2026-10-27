/**
 * Matching v2 settings. Every number here is provisional: a reasoned starting point, to be fitted
 * to outcome data later (docs/MATCHING_V2.md).
 */
export type V2Config = {
  version: string;
  weights: { interests: number; values: number; valueModes: number; environment: number; challenge: number };
  environmentWeightFloor: number;
  draws: number;
  bands: { topShare: number; bottomShare: number; strong: number; unlikely: number };
  facetCap: number;
  archetypeTemperature: number;
  archetypeConfidence: number;
  flat: { minStrong: number; interestsSd: number; modesSd: number };
  minPairs: number;
  correlationFloor: number;
  componentSdFloor: number;
};

export const V2_CONFIG: V2Config = {
  version: "v2-0.2",
  /**
   * Fulfilment fit (needs–supplies) as a weighted combination of its components. Each component is
   * first standardised across the person's 205 career paths, so each weight is its real share of
   * the ranking (raw components differ a lot in spread). Renormalised over the components the person has.
   */
  weights: { interests: 0.35, values: 0.15, valueModes: 0.2, environment: 0.2, challenge: 0.1 },
  /**
   * Environment dimensions are weighted by how strong the person's need is: two-sided |p − 50| / 50;
   * deficit (only "too little" hurts) max(0, p − 50) / 50; excess (only "too much" hurts)
   * max(0, 50 − p) / 50. A low need on a deficit dimension can never be let down, so it gets only
   * the floor. The floor keeps a perfectly neutral profile defined.
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
   * score) over the summed effects of all inputs; above the cap the facet is shrunk towards its
   * domain score until it fits (enforced per person in matchAllV2).
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
  /** Floor on a component's SD across career paths (0–1 scale) when standardising, so a near-constant component isn't blown up into noise. */
  componentSdFloor: 0.03,
};
