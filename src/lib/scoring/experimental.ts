/**
 * Experimental Lane scales (files 04, 07, 08, 09). Collected and scored for the pilot,
 * never shown as user-facing scores (visibility "hidden").
 */
import { keyed, meanIfEnough } from "./core";
import type { BankItem } from "../bank/types";
import type { Responses, ScaleScore } from "./types";

/** File 04: mean of 6 items per scale (1–5). The file sets no minimum; we require ≥ 5 of 6 like file 07. */
export function scoreInterestExtension(items: BankItem[], r: Responses): ScaleScore[] {
  return scalesOf(items, r, 5);
}

/** File 07: reverse key −1, mean of 6 items; require ≥ 5 answered. */
export function scoreDispositions(items: BankItem[], r: Responses): ScaleScore[] {
  return scalesOf(items.filter((i) => !i.validity), r, 5);
}

function scalesOf(items: BankItem[], r: Responses, min: number): ScaleScore[] {
  const codes = [...new Set(items.map((i) => i.scale!))];
  return codes.map((code) => {
    const its = items.filter((i) => i.scale === code);
    const vals = its.map((i) => {
      const v = r[i.id];
      return v === null || v === undefined ? null : keyed(v, i.key ?? 1);
    });
    return {
      id: code,
      label: code,
      raw: meanIfEnough(vals, min),
      rawRange: [1, 5] as [number, number],
      answered: vals.filter((v) => v !== null).length,
      items: its.length,
      normed: null,
      visibility: "hidden" as const,
    };
  });
}

/** File 08: understanding = 1 point per keyed answer (0–12); management = provisional keyed (0–6). */
export function scoreSjt(items: BankItem[], r: Responses) {
  const part = (scale: string) => {
    const its = items.filter((i) => i.scale === scale);
    const answered = its.filter((i) => r[i.id] !== null && r[i.id] !== undefined);
    return { correct: answered.filter((i) => r[i.id] === i.keyIndex).length, answered: answered.length, items: its.length };
  };
  return { understanding: part("understanding"), management: { ...part("management"), provisionalKey: true }, visibility: "hidden" as const };
}

/**
 * File 09: fluency = number of distinct non-empty ideas (trimmed, case-insensitive).
 * Originality and flexibility need the semantic-distance / LLM engine (pending, PLAN.md D14).
 */
export function scoreIdeas(ideas: string[]) {
  const distinct = new Set(ideas.map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0));
  return { fluency: distinct.size, originality: null, flexibility: null, engine: "pending" as const, visibility: "hidden" as const };
}
