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
  flat: { interestsSd: number; modesSd: number };
  minPairs: number;
};

export const V2_CONFIG: V2Config = {
  version: "v2-0.1",
  /** Fulfilment fit (needs–supplies) as a weighted combination of its components; renormalised over what's available. */
  weights: { interests: 0.35, values: 0.15, valueModes: 0.2, environment: 0.2, challenge: 0.1 },
  /**
   * Environment dimensions are weighted by how far the person sits from the middle (|p − 50| / 50):
   * strong needs matter more. The floor keeps a perfectly neutral profile defined.
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
  /** No single personality facet may carry more than this share of any fit (checked by facetShareBound). */
  facetCap: 0.15,
  /** Archetype blend: softmax over the nine mode scores (0–100) with this temperature, in score points. */
  archetypeTemperature: 8,
  /** The blend is "tentative" when the leading mode beats the second in fewer than this share of draws. */
  archetypeConfidence: 0.9,
  /** A profile is flat when the SD of its interests and of its value modes are both below these (0–100 points). */
  flat: { interestsSd: 8, modesSd: 6 },
  /** Minimum overlapping items for a profile correlation. */
  minPairs: 5,
};
