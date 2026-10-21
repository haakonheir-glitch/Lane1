/**
 * Population means, SDs and reliabilities used to norm scores (BLUEPRINT §7).
 *
 * STATUS: NOT YET TRANSCRIBED. The sources (Johnson 2014 for the IPIP-NEO-120; the O*NET
 * Interest Profiler Short Form technical reports) could not be fetched from this build
 * environment, and numbers must never be invented. Every entry is `null` until a value is
 * transcribed with its source and page/table reference.
 *
 * While an entry is null, scoring still produces raw scores, but no z/T score, percentile,
 * interval or relative-strength claim for that scale.
 *
 * Entry format when filled in:
 *   "neo.N1": { mean: 2.86, sd: 0.85, reliability: 0.83, source: "Johnson (2014), Table 3, p. 84" }
 */
import type { Psychometric } from "./core";

export type SourcedPsychometric = Psychometric & { source: string };

const NEO_FACETS = [
  "N1", "N2", "N3", "N4", "N5", "N6",
  "E1", "E2", "E3", "E4", "E5", "E6",
  "O1", "O2", "O3", "O4", "O5",
  "A1", "A2", "A3", "A4", "A5", "A6",
  "C1", "C2", "C3", "C4", "C5", "C6",
] as const;
const NEO_DOMAINS = ["Neuroticism", "Extraversion", "Openness", "Agreeableness", "Conscientiousness"] as const;
const RIASEC = ["R", "I", "A", "S", "E", "C"] as const;

/** Keys that need a published value before real scores can be normed. */
export const REQUIRED_KEYS: string[] = [
  ...NEO_FACETS.map((f) => `neo.${f}`),
  ...NEO_DOMAINS.map((d) => `neo.${d}`),
  "hh.HH",
  ...RIASEC.map((r) => `onet.${r}`),
];

export const PSYCHOMETRICS: Record<string, SourcedPsychometric | null> = Object.fromEntries(REQUIRED_KEYS.map((k) => [k, null]));

/** Cognitive tasks need Lane's own calibration sample (file 14: "items need calibration"). */
export const COGNITIVE_NORMS_STATUS = "pending-calibration" as const;

export function lookup(key: string, table: Record<string, SourcedPsychometric | Psychometric | null> = PSYCHOMETRICS): Psychometric | null {
  return table[key] ?? null;
}
