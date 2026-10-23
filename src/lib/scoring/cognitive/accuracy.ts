/**
 * Accuracy tasks: matrix, number_series, letter_series, quant, rotation2d.
 * - Rapid-guess rule (file 14): responses faster than 25% of the item's median time are
 *   missing, not wrong. There is no norm sample yet, so the median is provisional:
 *   20% of the item's time limit, a floor of 5% of the limit (PLAN.md D8). Replace with pilot
 *   medians when available.
 * - Timed-out items count as wrong (attempted, no answer).
 * - Score: proportion correct among non-missing items, with a 90% Wilson interval.
 *   This is a raw accuracy. `byLevel` feeds the 3PL ability estimate (cognitive/norms.ts).
 */
import { Z90 } from "../core";

/** `level`: the generator difficulty (activeRules, level or cellsN) the item was drawn at. */
export type AccuracyTrial = { correct: boolean; timedOut: boolean; rtMs: number; timeLimitSec: number; level?: number };

export const PROVISIONAL_MEDIAN_SHARE = 0.2;
export const RAPID_GUESS_SHARE = 0.25;

export function isRapidGuess(t: AccuracyTrial): boolean {
  if (t.timedOut) return false;
  const provisionalMedianMs = t.timeLimitSec * 1000 * PROVISIONAL_MEDIAN_SHARE;
  return t.rtMs < RAPID_GUESS_SHARE * provisionalMedianMs;
}

export type AccuracyScore = {
  correct: number;
  scored: number;
  rapidGuesses: number;
  proportion: number | null;
  /** 90% Wilson interval for the proportion. */
  ci: [number, number] | null;
  /** Right/wrong counts per level among scored (non-rapid-guess) trials. */
  byLevel: { level: number; correct: number; scored: number }[];
};

export function wilson(k: number, n: number, z = Z90): [number, number] {
  if (n === 0) return [0, 1];
  const p = k / n;
  const z2 = z * z;
  const d = 1 + z2 / n;
  const c = (p + z2 / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

export function scoreAccuracy(trials: AccuracyTrial[]): AccuracyScore {
  const rapid = trials.filter(isRapidGuess);
  const scored = trials.filter((t) => !isRapidGuess(t));
  const correct = scored.filter((t) => t.correct).length;
  return {
    correct,
    scored: scored.length,
    rapidGuesses: rapid.length,
    proportion: scored.length ? correct / scored.length : null,
    ci: scored.length ? wilson(correct, scored.length) : null,
    byLevel: [...new Set(scored.flatMap((t) => (t.level === undefined ? [] : [t.level])))]
      .sort((a, b) => a - b)
      .map((level) => {
        const at = scored.filter((t) => t.level === level);
        return { level, correct: at.filter((t) => t.correct).length, scored: at.length };
      }),
  };
}

/** rotation2d (file 14): correct only if both same-shape options and no mirror image are selected. */
export function markRotation(selected: number[], answerIndices: number[]): boolean {
  const s = [...new Set(selected)].sort();
  const a = [...answerIndices].sort();
  return s.length === a.length && s.every((v, i) => v === a[i]);
}
