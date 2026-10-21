/**
 * symbol_match: score = correct − incorrect within 90 s (SPEED_PROTOCOL).
 * choice_rt: median RT of correct trials. Anticipations (< 100 ms) are excluded (PLAN.md decision).
 * File 14: choice RT is for within-person / same-device comparison only and never a headline score.
 */
import { median } from "../core";

export type SymbolTrial = { correct: boolean; rtMs: number };
export function scoreSymbolMatch(trials: SymbolTrial[]) {
  const correct = trials.filter((t) => t.correct).length;
  return { score: correct - (trials.length - correct), correct, incorrect: trials.length - correct, attempted: trials.length };
}

export const ANTICIPATION_MS = 100;
export type RtTrialResult = { correct: boolean; rtMs: number };
export function scoreChoiceRt(trials: RtTrialResult[]) {
  const valid = trials.filter((t) => t.correct && t.rtMs >= ANTICIPATION_MS);
  return {
    medianRtMs: valid.length ? median(valid.map((t) => t.rtMs)) : null,
    accuracy: trials.length ? trials.filter((t) => t.correct).length / trials.length : null,
    anticipations: trials.filter((t) => t.rtMs < ANTICIPATION_MS).length,
    visibility: "hidden" as const,
  };
}
