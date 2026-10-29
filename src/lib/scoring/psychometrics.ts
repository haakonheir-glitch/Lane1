/**
 * Population means, SDs and reliabilities used to norm scores (BLUEPRINT §7). Combined-gender
 * norms only: careers are never steered by gender.
 *
 * Every entry is on OUR raw metric (the one the scoring module produces), with its source, table
 * and page. An entry stays `null` until a published value is transcribed: numbers are never
 * invented. While an entry is null, scoring still produces raw scores, but no z/T score,
 * percentile, interval or relative-strength claim for that scale.
 *
 * Status (2026-10-29):
 * - O*NET Interest Profiler Short Form: transcribed (ONET_IP below).
 * - IPIP-NEO-120 facets and domains (Kajonius & Johnson 2019, Appendix Table A1) and the Mini-IPIP6
 *   Honesty-Humility scale: not yet transcribed. The source hosts (pmc.ncbi.nlm.nih.gov,
 *   psycharchives.org) are blocked by this build environment's network policy.
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

/**
 * O*NET Interest Profiler Short Form (60 items, 10 per scale). Source: Rounds, J., Ming, C. W. J.,
 * Cao, M., Song, C., & Lewis, P. (2016). Development of an O*NET Mini Interest Profiler (Mini-IP)
 * for mobile devices: psychometric characteristics. National Center for O*NET Development.
 * https://www.onetcenter.org/dl_files/Mini-IP.pdf. Validation sample, N = 575 US adults aged
 * 18–65 (MTurk, 95.8% employed).
 *
 * - Mean and SD: Table 8 (p. 36), "60-Item Interest Profiler Short Form" rows, Total column.
 * - Reliability: Table 9 (p. 37), 60-item Short-IP Cronbach's alpha.
 *
 * Response coding, verified. Table 8 is on the item-mean metric with responses coded 1–5:
 * - p. 11, Procedure: the five-point responses were recorded as "1-(Strongly Dislike) to
 *   3-(Unsure)" and "4-(Like) and 5-(Strongly Like)".
 * - The Mini-IPIP means in the same table (Agreeableness 3.78, Intellect 3.87) are on a 1–5 scale.
 * - Item means of 2.7–3.4 can't be 10-item sums.
 * - p. 13 describes a 0–4 coding for the online tool's own scoring, but that is not the metric of
 *   Table 8.
 *
 * Our coding is 1–5 (file 03), and our raw score is the sum of 10 responses (10–50), so the
 * table's item mean and SD are multiplied by 10.
 */
const ONET_IP_SOURCE = "Rounds et al. (2016), Mini-IP report, Table 8 (p. 36) Short-IP total, N = 575; alpha Table 9 (p. 37); item mean ×10 to our 10–50 sum";
const ONET_IP: Record<(typeof RIASEC)[number], { itemMean: number; itemSd: number; alpha: number }> = {
  R: { itemMean: 2.79, itemSd: 0.85, alpha: 0.88 },
  I: { itemMean: 3.29, itemSd: 0.88, alpha: 0.9 },
  A: { itemMean: 3.39, itemSd: 0.94, alpha: 0.9 },
  S: { itemMean: 2.96, itemSd: 0.9, alpha: 0.89 },
  E: { itemMean: 2.76, itemSd: 0.82, alpha: 0.85 },
  C: { itemMean: 2.93, itemSd: 0.89, alpha: 0.9 },
};
const ITEMS_PER_IP_SCALE = 10;

export const PSYCHOMETRICS: Record<string, SourcedPsychometric | null> = {
  ...Object.fromEntries(REQUIRED_KEYS.map((k) => [k, null])),
  ...Object.fromEntries(
    RIASEC.map((r) => [
      `onet.${r}`,
      { mean: round(ONET_IP[r].itemMean * ITEMS_PER_IP_SCALE), sd: round(ONET_IP[r].itemSd * ITEMS_PER_IP_SCALE), reliability: ONET_IP[r].alpha, source: ONET_IP_SOURCE },
    ]),
  ),
};

function round(x: number) {
  return Math.round(x * 1000) / 1000;
}

/** A short fingerprint of which norms are loaded, for cache keys: a new transcription is a new key. */
export const NORMS_STAMP = (() => {
  const text = REQUIRED_KEYS.map((k) => (PSYCHOMETRICS[k] ? `${k}=${PSYCHOMETRICS[k]!.mean}/${PSYCHOMETRICS[k]!.sd}/${PSYCHOMETRICS[k]!.reliability}` : `${k}=-`)).join(",");
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${REQUIRED_KEYS.filter((k) => PSYCHOMETRICS[k]).length}:${h.toString(36)}`;
})();

/** Cognitive tasks need Lane's own calibration sample (file 14: "items need calibration"). */
export const COGNITIVE_NORMS_STATUS = "pending-calibration" as const;

export function lookup(key: string, table: Record<string, SourcedPsychometric | Psychometric | null> = PSYCHOMETRICS): Psychometric | null {
  return table[key] ?? null;
}
