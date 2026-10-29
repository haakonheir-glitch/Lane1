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
 * - IPIP-NEO-120 facets and domains: transcribed from Kajonius & Johnson (2019), Appendix Table A1
 *   (NEO_TABLE_A1 below). The raw data for exact 18–35 norms (doi:10.23668/psycharchives.2448)
 *   is served from pada.psycharchives.org, which this build environment cannot reach.
 * - Mini-IPIP6 Honesty-Humility: null. Its open-access norms (Sibley et al., New Zealand Journal of
 *   Psychology, on psychology.org.nz) can't be reached from here either.
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
export const ONET_IP: Record<(typeof RIASEC)[number], { itemMean: number; itemSd: number; alpha: number }> = {
  R: { itemMean: 2.79, itemSd: 0.85, alpha: 0.88 },
  I: { itemMean: 3.29, itemSd: 0.88, alpha: 0.9 },
  A: { itemMean: 3.39, itemSd: 0.94, alpha: 0.9 },
  S: { itemMean: 2.96, itemSd: 0.9, alpha: 0.89 },
  E: { itemMean: 2.76, itemSd: 0.82, alpha: 0.85 },
  C: { itemMean: 2.93, itemSd: 0.89, alpha: 0.9 },
};
const ITEMS_PER_IP_SCALE = 10;

/**
 * IPIP-NEO-120. Source: Kajonius, P. J., & Johnson, J. A. (2019). Assessing the structure of the
 * Five Factor Model of Personality (IPIP-NEO-120) in the public domain. Europe's Journal of
 * Psychology, 15(2), 260–275, doi:10.5964/ejop.v15i2.1671. Appendix Table A1, "Sample Descriptive
 * Statistics of 5 Trait Domains and 30 Facets": N, E on p. 274; O, A, C on p. 275 (checked against
 * the PMC copy, PMC7871748, and the journal's PDF). N = 320,128 (127,695 men, 192,433 women;
 * combined), M age 28.13, SD 10.14: the whole sample, not 18–35 (the raw data couldn't be reached).
 *
 * Values below are the table's, verbatim, on its own metric: a facet is the sum of its 4 items
 * (4–20), and a domain is the mean of its 6 facet sums (checked: Neuroticism 11.10 against the mean
 * of N1–N6, 11.105). Our facet and domain scores are item means (1–5), so mean and SD are divided by
 * 4 (a facet sum is 4 × the item mean; a domain's mean of facet sums is 4 × its mean of 24 items).
 * Reliability is the table's alpha.
 *
 * Openness: we don't administer O6 (Liberalism), so our domain is the mean of O1–O5. Its mean is the
 * mean of the five facet means, which is exact. Its SD is derived: the domain SD in the table (2.06,
 * over six facets) gives the average inter-facet correlation, assumed equal for all pairs:
 * r̄ = (36 · 2.06² − Σ sᵢ²) / (2 Σᵢ<ⱼ sᵢsⱼ) = .236. The SD of the mean of O1–O5 is then
 * √(Σ sᵢ² + 2 r̄ Σᵢ<ⱼ sᵢsⱼ) / 5 = 2.099 (facet-sum metric) → 0.525. O6 correlates least with the
 * other facets, so the true r̄ among O1–O5 is likely a little higher, and this SD a little low.
 * There is no published alpha for O1–O5, so it keeps the planning value (.75; scoring/self.ts).
 */
const NEO_SOURCE = (page: number) => `Kajonius & Johnson (2019), Eur. J. Psychol. 15(2), Appendix Table A1 (p. ${page}), N = 320,128; facet-sum metric ÷ 4 to our item mean`;
export const NEO_TABLE_A1: Record<string, { m: number; sd: number; alpha: number; page: number }> = {
  Neuroticism: { m: 11.1, sd: 2.66, alpha: 0.9, page: 274 },
  N1: { m: 12.07, sd: 3.77, alpha: 0.79, page: 274 },
  N2: { m: 11.51, sd: 4.11, alpha: 0.87, page: 274 },
  N3: { m: 9.35, sd: 3.87, alpha: 0.85, page: 274 },
  N4: { m: 11.69, sd: 3.64, alpha: 0.72, page: 274 },
  N5: { m: 11.94, sd: 3.44, alpha: 0.72, page: 274 },
  N6: { m: 10.07, sd: 3.63, alpha: 0.78, page: 274 },
  Extraversion: { m: 13.69, sd: 2.36, alpha: 0.89, page: 274 },
  E1: { m: 14.48, sd: 3.6, alpha: 0.81, page: 274 },
  E2: { m: 12.36, sd: 4.02, alpha: 0.8, page: 274 },
  E3: { m: 14.56, sd: 3.43, alpha: 0.86, page: 274 },
  E4: { m: 12.84, sd: 3.15, alpha: 0.71, page: 274 },
  E5: { m: 12.52, sd: 3.32, alpha: 0.74, page: 274 },
  E6: { m: 15.35, sd: 3.2, alpha: 0.8, page: 274 },
  // Openness (6 facets, with O6) is the table's 13.71 / 2.06 / .82; ours (O1–O5) is derived below.
  O1: { m: 14.6, sd: 3.41, alpha: 0.75, page: 275 },
  O2: { m: 14.67, sd: 3.58, alpha: 0.75, page: 275 },
  O3: { m: 15.2, sd: 3.01, alpha: 0.66, page: 275 },
  O4: { m: 12.28, sd: 3.26, alpha: 0.71, page: 275 },
  O5: { m: 14.5, sd: 3.55, alpha: 0.74, page: 275 },
  Agreeableness: { m: 14.87, sd: 2.01, alpha: 0.85, page: 275 },
  A1: { m: 13.43, sd: 3.54, alpha: 0.86, page: 275 },
  A2: { m: 16.63, sd: 2.88, alpha: 0.74, page: 275 },
  A3: { m: 16.72, sd: 2.56, alpha: 0.73, page: 275 },
  A4: { m: 15.1, sd: 3.49, alpha: 0.69, page: 275 },
  A5: { m: 12.34, sd: 3.35, alpha: 0.72, page: 275 },
  A6: { m: 15.03, sd: 3.1, alpha: 0.73, page: 275 },
  Conscientiousness: { m: 14.95, sd: 2.34, alpha: 0.9, page: 275 },
  C1: { m: 16.32, sd: 2.4, alpha: 0.77, page: 275 },
  C2: { m: 13.23, sd: 4.31, alpha: 0.85, page: 275 },
  C3: { m: 16.32, sd: 2.57, alpha: 0.67, page: 275 },
  C4: { m: 16.06, sd: 3.09, alpha: 0.78, page: 275 },
  C5: { m: 14.07, sd: 3.16, alpha: 0.72, page: 275 },
  C6: { m: 13.68, sd: 4.09, alpha: 0.88, page: 275 },
};
/** Openness in the table, with O6 (Liberalism): used only to derive our O1–O5 domain. */
export const OPENNESS_WITH_O6 = { m: 13.71, sd: 2.06, alpha: 0.82, o6: { m: 11.03, sd: 3.67 } } as const;
/** Planning reliability for a scale with no published value (BLUEPRINT §7; the same .75 as scoring/self.ts). */
const PLANNING_SCALE_RELIABILITY = 0.75;
const ITEMS_PER_NEO_FACET = 4;

/** Our Openness (O1–O5), derived from Table A1 as documented above. */
export function opennessWithoutO6(): { m: number; sd: number; rbar: number } {
  const f = ["O1", "O2", "O3", "O4", "O5"].map((k) => NEO_TABLE_A1[k]!);
  const s6 = [...f.map((x) => x.sd), OPENNESS_WITH_O6.o6.sd];
  const pairs = (xs: number[]) => xs.reduce((a, x, i) => a + xs.slice(i + 1).reduce((b, y) => b + x * y, 0), 0);
  const sq = (xs: number[]) => xs.reduce((a, x) => a + x * x, 0);
  const rbar = (36 * OPENNESS_WITH_O6.sd ** 2 - sq(s6)) / (2 * pairs(s6));
  const s5 = f.map((x) => x.sd);
  return { m: f.reduce((a, x) => a + x.m, 0) / 5, sd: Math.sqrt(sq(s5) + 2 * rbar * pairs(s5)) / 5, rbar };
}

const neoEntry = (key: string): SourcedPsychometric => {
  if (key === "Openness") {
    const o = opennessWithoutO6();
    return {
      mean: round(o.m / ITEMS_PER_NEO_FACET),
      sd: round(o.sd / ITEMS_PER_NEO_FACET),
      reliability: PLANNING_SCALE_RELIABILITY,
      source: `${NEO_SOURCE(275)}; O1–O5 only (no O6): mean of the five facet means, SD derived assuming equal inter-facet correlations (r̄ = ${round(o.rbar)}); planning reliability .75`,
    };
  }
  const t = NEO_TABLE_A1[key]!;
  return { mean: round(t.m / ITEMS_PER_NEO_FACET), sd: round(t.sd / ITEMS_PER_NEO_FACET), reliability: t.alpha, source: NEO_SOURCE(t.page) };
};

export const PSYCHOMETRICS: Record<string, SourcedPsychometric | null> = {
  ...Object.fromEntries(REQUIRED_KEYS.map((k) => [k, null])),
  ...Object.fromEntries(
    RIASEC.map((r) => [
      `onet.${r}`,
      { mean: round(ONET_IP[r].itemMean * ITEMS_PER_IP_SCALE), sd: round(ONET_IP[r].itemSd * ITEMS_PER_IP_SCALE), reliability: ONET_IP[r].alpha, source: ONET_IP_SOURCE },
    ]),
  ),
  ...Object.fromEntries([...NEO_FACETS, ...NEO_DOMAINS].map((k) => [`neo.${k}`, neoEntry(k)])),
};

/** Three decimals, halves up (the epsilon keeps 2.01 / 4 = 0.5025 from landing on 0.502 in floating point). */
function round(x: number) {
  return Math.round((x + Number.EPSILON) * 1000) / 1000;
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
