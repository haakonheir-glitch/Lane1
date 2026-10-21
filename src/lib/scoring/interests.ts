/**
 * File 03 (O*NET Interest Profiler Short Form, 60 items, 10 per RIASEC scale).
 * - Scale raw: sum of 10 responses (10–50). With skips, the sum is prorated from the mean
 *   when ≥ 8 of 10 are answered, else null (PLAN.md decision; the file assumes complete data).
 * - Like-count: number of 'Like' (4) or 'Strongly like' (5), 0–10 (maps to official checkbox scoring).
 * - Holland code: the 3 highest scales. Differentiation = highest − lowest; elevation = mean of six.
 *   Low differentiation means interests are not yet formed: flag it rather than forcing a code.
 */
import { meanIfEnough, normed } from "./core";
import { lookup } from "./psychometrics";
import type { Psychometric } from "./core";
import type { BankItem } from "../bank/types";
import type { Responses, ScaleScore } from "./types";

export const RIASEC = ["R", "I", "A", "S", "E", "C"] as const;
export type RiasecCode = (typeof RIASEC)[number];
export const RIASEC_LABEL: Record<RiasecCode, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

/**
 * Provisional threshold (not in the package): differentiation below 8 raw points on the
 * 10–50 metric is flagged as "not yet clearly differentiated". Revisit with pilot data.
 */
export const LOW_DIFFERENTIATION = 8;

export type InterestScale = ScaleScore & { code: RiasecCode; likeCount: number };

export type InterestScores = {
  scales: InterestScale[];
  hollandCode: string | null;
  differentiation: number | null;
  elevation: number | null;
  lowDifferentiation: boolean;
};

export function scoreInterests(items: BankItem[], r: Responses, table?: Record<string, Psychometric | null>): InterestScores {
  const scored = items.filter((i) => !i.validity);
  const scales: InterestScale[] = RIASEC.map((code) => {
    const its = scored.filter((i) => i.scale === code);
    const vals = its.map((i) => r[i.id] ?? null);
    const m = meanIfEnough(vals, 8);
    const raw = m === null ? null : m * its.length;
    const p = lookup(`onet.${code}`, table);
    return {
      id: code,
      code,
      label: RIASEC_LABEL[code],
      raw,
      rawRange: [its.length, its.length * 5],
      answered: vals.filter((v) => v !== null).length,
      items: its.length,
      likeCount: vals.filter((v) => v !== null && v >= 4).length,
      normed: raw !== null && p ? normed(raw, p) : null,
      visibility: "user",
    };
  });
  const complete = scales.every((s) => s.raw !== null);
  if (!complete) return { scales, hollandCode: null, differentiation: null, elevation: null, lowDifferentiation: false };
  const raws = scales.map((s) => s.raw!);
  const differentiation = Math.max(...raws) - Math.min(...raws);
  const lowDifferentiation = differentiation < LOW_DIFFERENTIATION;
  // Ties keep R-I-A-S-E-C order (stable sort).
  const top = [...scales].sort((a, b) => b.raw! - a.raw!).slice(0, 3).map((s) => s.code).join("");
  return {
    scales,
    hollandCode: lowDifferentiation ? null : top,
    differentiation,
    elevation: raws.reduce((a, b) => a + b, 0) / raws.length,
    lowDifferentiation,
  };
}
