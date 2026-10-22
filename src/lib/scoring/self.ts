/**
 * Scores relative to yourself: each scale compared with the person's own other scales on the
 * same instrument (interests with interests, facets with facets, domains with domains).
 *
 * This needs no population norms, which is why it can be shown before they are transcribed
 * (PLAN D48). BLUEPRINT §7 asks for exactly this comparison on *scores*, not raw answers.
 * It can say "Enterprising is your strongest interest"; it can never say "you are more
 * Enterprising than most people". Pure.
 */
import { lookup } from "./psychometrics";
import { Z90 } from "./core";
import type { ProfileScores } from "./profile";
import type { ScaleScore, SelfScore } from "./types";

/**
 * Reliabilities used until the published ones are transcribed: BLUEPRINT §7's own planning
 * values (".70 for a 4-item facet", ".75" for a scale). Marked `assumedReliability` on every
 * score that uses them.
 */
export const ASSUMED_RELIABILITY = { facet: 0.7, scale: 0.75 } as const;

/** Fewer scales than this and a within-person comparison means nothing. */
const MIN_SCALES = 3;

function standardise(scales: ScaleScore[], keyOf: (s: ScaleScore) => string, kind: keyof typeof ASSUMED_RELIABILITY): ScaleScore[] {
  const raws = scales.flatMap((s) => (s.raw === null ? [] : [s.raw]));
  if (raws.length < MIN_SCALES) return scales.map((s) => ({ ...s, self: null }));
  const mean = raws.reduce((a, b) => a + b, 0) / raws.length;
  const sd = Math.sqrt(raws.reduce((a, b) => a + (b - mean) ** 2, 0) / raws.length);
  if (sd === 0) return scales.map((s) => ({ ...s, self: null }));
  return scales.map((s) => {
    if (s.raw === null) return { ...s, self: null };
    const published = lookup(keyOf(s))?.reliability;
    const reliability = published ?? ASSUMED_RELIABILITY[kind];
    const z = (s.raw - mean) / sd;
    // SEM in the person's own SD units: an approximation, since the person's spread stands in
    // for the population SD the formula assumes.
    const half = Z90 * Math.sqrt(1 - reliability);
    const self: SelfScore = { z, ci: [z - half, z + half], reliability, assumedReliability: published === undefined };
    return { ...s, self };
  });
}

/** Adds `self` scores to interests, personality facets and personality domains. */
export function addSelfScores(p: ProfileScores): ProfileScores {
  return {
    ...p,
    interests: p.interests
      ? { ...p.interests, scales: standardise(p.interests.scales, (s) => `onet.${s.id}`, "scale") as typeof p.interests.scales }
      : null,
    personality: p.personality
      ? {
          ...p.personality,
          facets: standardise(p.personality.facets, (s) => `neo.${s.id}`, "facet"),
          domains: standardise(p.personality.domains, (s) => `neo.${s.id}`, "scale"),
        }
      : null,
  };
}
