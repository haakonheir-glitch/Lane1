/**
 * File 01 (IPIP-NEO-120, 116 administered) and file 02 (Mini-IPIP6 Honesty-Humility).
 * - Reverse: key −1 → 6 − response.
 * - Facet: mean of 4 keyed responses; ≥ 3 of 4 answered, else null.
 * - Domain: mean of all keyed responses in the domain (Openness: O1–O5 only, O6 not administered).
 *   The file sets no minimum for domains; we require ≥ 75% answered (PLAN.md decision).
 * - HH: mean of 4 items (all negatively keyed). The file sets no minimum; we require ≥ 3 of 4.
 * - Scored raw. Never ipsatized (Johnson 2014); relative-to-self happens on z-scores only.
 */
import { keyed, meanIfEnough, normed } from "./core";
import { lookup } from "./psychometrics";
import type { Psychometric } from "./core";
import type { BankItem } from "../bank/types";
import type { Responses, ScaleScore } from "./types";

const FACET_LABELS: Record<string, string> = {
  N1: "Anxiety", N2: "Anger", N3: "Depression", N4: "Self-consciousness", N5: "Immoderation", N6: "Vulnerability",
  E1: "Friendliness", E2: "Gregariousness", E3: "Assertiveness", E4: "Activity level", E5: "Excitement-seeking", E6: "Cheerfulness",
  O1: "Imagination", O2: "Artistic interests", O3: "Emotionality", O4: "Adventurousness", O5: "Intellect",
  A1: "Trust", A2: "Morality", A3: "Altruism", A4: "Cooperation", A5: "Modesty", A6: "Sympathy",
  C1: "Self-efficacy", C2: "Orderliness", C3: "Dutifulness", C4: "Achievement-striving", C5: "Self-discipline", C6: "Cautiousness",
};

export const DOMAINS = ["Neuroticism", "Extraversion", "Openness", "Agreeableness", "Conscientiousness"] as const;

type Table = Record<string, Psychometric | null>;

function score(values: (number | null)[], min: number) {
  return { raw: meanIfEnough(values, min), answered: values.filter((v) => v !== null).length };
}

function keyedValues(items: BankItem[], r: Responses) {
  return items.map((i) => {
    const v = r[i.id];
    return v === null || v === undefined ? null : keyed(v, i.key ?? 1);
  });
}

export type PersonalityScores = { facets: ScaleScore[]; domains: ScaleScore[]; honestyHumility: ScaleScore | null };

export function scorePersonality(neoItems: BankItem[], hhItems: BankItem[], r: Responses, table?: Table): PersonalityScores {
  const scored = neoItems.filter((i) => i.facet && !i.validity);
  const facetCodes = [...new Set(scored.map((i) => i.facet!))];
  const facets: ScaleScore[] = facetCodes.map((code) => {
    const its = scored.filter((i) => i.facet === code);
    const s = score(keyedValues(its, r), 3);
    const p = lookup(`neo.${code}`, table);
    return {
      id: code,
      label: FACET_LABELS[code] ?? code,
      raw: s.raw,
      rawRange: [1, 5],
      answered: s.answered,
      items: its.length,
      normed: s.raw !== null && p ? normed(s.raw, p) : null,
      visibility: "user",
    };
  });
  const domains: ScaleScore[] = DOMAINS.map((d) => {
    const its = scored.filter((i) => i.domain === d);
    const s = score(keyedValues(its, r), Math.ceil(its.length * 0.75));
    const p = lookup(`neo.${d}`, table);
    return {
      id: d,
      label: d,
      raw: s.raw,
      rawRange: [1, 5],
      answered: s.answered,
      items: its.length,
      normed: s.raw !== null && p ? normed(s.raw, p) : null,
      visibility: "user",
    };
  });
  let honestyHumility: ScaleScore | null = null;
  if (hhItems.length) {
    const s = score(keyedValues(hhItems, r), 3);
    const p = lookup("hh.HH", table);
    honestyHumility = {
      id: "HH",
      label: "Honesty-Humility",
      raw: s.raw,
      rawRange: [1, 5],
      answered: s.answered,
      items: hhItems.length,
      normed: s.raw !== null && p ? normed(s.raw, p) : null,
      visibility: "user",
    };
  }
  return { facets, domains, honestyHumility };
}
