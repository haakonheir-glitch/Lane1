/**
 * File 12 data-quality checks. Each check that trips adds one flag; two or more flags mark the
 * session "low confidence" (file 12 decision_rule). The user sees why and is offered a retake.
 * Data is never discarded silently.
 *
 * Flags counted (PLAN.md decision, the file lists the indices but not how to count them):
 *  - each failed infrequency item          (fail if response ≥ fail_if_response_gte)
 *  - each failed instructed item           (fail if response ≠ pass_if_response_eq)
 *  - page_time   (once per session)        block median Likert RT < 1.0 s
 *  - longstring  (once per session)        same option > 12 times in a row in a Likert block
 *  - even_odd    (once per session)        r(even halves, odd halves) across scales < .30
 *  - antonyms    (once per session)        within-person r across the 27 opposite pairs > −.10
 * Skipped items are ignored by every index.
 */
import { keyed, mean, median, pearson } from "./core";
import type { BankItem } from "../bank/types";

export type LoggedResponse = {
  itemId: string;
  blockId: string;
  value: number | null;
  rtMs: number;
};

export type ValidityResult = {
  flags: { id: string; label: string }[];
  confidence: "ok" | "low";
  indices: {
    infrequencyFails: string[];
    instructedFails: string[];
    blockMedianRtMs: Record<string, number>;
    longestString: number;
    evenOddR: number | null;
    antonymR: number | null;
  };
};

const PAGE_TIME_MS = 1000;
const LONGSTRING_MAX = 12;
const EVEN_ODD_MIN = 0.3;
const ANTONYM_MAX = -0.1;

export function checkValidity(
  responses: LoggedResponse[],
  items: Map<string, BankItem>,
  antonymPairs: [string, string][],
): ValidityResult {
  const flags: ValidityResult["flags"] = [];
  const answered = responses.filter((r) => r.value !== null);
  const likert = answered.filter((r) => {
    const f = items.get(r.itemId)?.format.type;
    return f === "likert5" || f === "likert7";
  });

  // Infrequency and instructed items.
  const infrequencyFails: string[] = [];
  const instructedFails: string[] = [];
  for (const r of answered) {
    const v = items.get(r.itemId)?.validity;
    if (v?.kind === "infrequency" && r.value! >= v.failIfGte) infrequencyFails.push(r.itemId);
    if (v?.kind === "instructed" && r.value !== v.passIfEq) instructedFails.push(r.itemId);
  }
  for (const id of infrequencyFails) flags.push({ id: `infrequency:${id}`, label: "An unlikely statement was marked as accurate" });
  for (const id of instructedFails) flags.push({ id: `instructed:${id}`, label: "An instruction to pick a specific answer was missed" });

  // Page time: median RT per Likert block.
  const blockMedianRtMs: Record<string, number> = {};
  for (const block of new Set(likert.map((r) => r.blockId))) {
    blockMedianRtMs[block] = median(likert.filter((r) => r.blockId === block).map((r) => r.rtMs));
  }
  if (Object.values(blockMedianRtMs).some((m) => m < PAGE_TIME_MS)) flags.push({ id: "page_time", label: "Answers came faster than the statements can be read" });

  // Longstring: longest run of identical answers within a Likert block (in administration order).
  let longestString = 0;
  for (const block of new Set(likert.map((r) => r.blockId))) {
    let run = 0;
    let prev: number | null = null;
    for (const r of likert.filter((x) => x.blockId === block)) {
      run = r.value === prev ? run + 1 : 1;
      prev = r.value;
      longestString = Math.max(longestString, run);
    }
  }
  if (longestString > LONGSTRING_MAX) flags.push({ id: "longstring", label: `The same answer was given ${longestString} times in a row` });

  // Even-odd consistency across multi-item scales (keyed values).
  const evenOddR = evenOdd(likert, items);
  if (evenOddR !== null && evenOddR < EVEN_ODD_MIN) flags.push({ id: "even_odd", label: "Answers to similar statements didn't line up" });

  // Psychometric antonyms: raw responses to opposite-content pairs should correlate negatively.
  const value = new Map(answered.map((r) => [r.itemId, r.value!]));
  const pairs = antonymPairs.filter(([a, b]) => value.has(a) && value.has(b));
  const antonymR = pairs.length >= 10 ? pearson(pairs.map(([a]) => value.get(a)!), pairs.map(([, b]) => value.get(b)!)) : null;
  const antonymValid = antonymR !== null && !Number.isNaN(antonymR) ? antonymR : null;
  if (antonymValid !== null && antonymValid > ANTONYM_MAX) flags.push({ id: "antonyms", label: "Opposite statements were both rated as accurate" });

  return {
    flags,
    confidence: flags.length >= 2 ? "low" : "ok",
    indices: { infrequencyFails, instructedFails, blockMedianRtMs, longestString, evenOddR, antonymR: antonymValid },
  };
}

/** Correlate even-item and odd-item half-scale means across all scales with ≥ 4 answered items. */
function evenOdd(likert: LoggedResponse[], items: Map<string, BankItem>): number | null {
  const byScale = new Map<string, number[]>();
  for (const r of likert) {
    const it = items.get(r.itemId);
    if (!it || it.validity) continue;
    const scale = it.facet ?? it.scale;
    if (!scale) continue;
    byScale.set(`${it.module}:${scale}`, [...(byScale.get(`${it.module}:${scale}`) ?? []), keyed(r.value!, it.key ?? 1)]);
  }
  const evens: number[] = [];
  const odds: number[] = [];
  for (const vals of byScale.values()) {
    if (vals.length < 4) continue;
    evens.push(mean(vals.filter((_, i) => i % 2 === 0)));
    odds.push(mean(vals.filter((_, i) => i % 2 === 1)));
  }
  if (evens.length < 6) return null;
  const r = pearson(evens, odds);
  return Number.isNaN(r) ? null : r;
}

/** File 12 self_report_effort: option index 0 = careful, 1 = partly rushed, 2 = not paying attention. */
export type EffortAction = "keep" | "offer_redo" | "discard";
export function effortAction(optionIndex: number | null): EffortAction {
  return optionIndex === 2 ? "discard" : optionIndex === 1 ? "offer_redo" : "keep";
}
