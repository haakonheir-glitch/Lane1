/**
 * Scoring for Lane's item bank. Pure functions: answers in, scores out.
 *
 * Questionnaires: keyed mean of 1–5 answers, rescaled to 0–100.
 *   Interval: 80% (±1.28 SE), SE from the spread of the person's own item answers,
 *   with a floor so a perfectly consistent person still gets a non-zero interval.
 * Games: proportion correct (0–100) with an 80% Wilson interval.
 * Speed: how much of each item's time limit was left on correct answers.
 */
import { GAME_DEFS, VALUE_DEFS, gameItems, likertModules, type GameId, type LikertItem, type ValueId } from "./items";
import type { RiasecKey, Score, TraitKey } from "../types";

const Z80 = 1.2816;
/** Minimum interval half-width, in points, for questionnaire scores. */
const MIN_HALF = 5;

export type Answers = Record<string, number>;
export type GameResponse = { itemId: string; choice: number | null; correct: boolean; ms: number };

export type ScoredScale = Score & { answered: number; items: number };

export type AptitudeKey = "verbal" | "numerical" | "pattern" | "speed";

export type ProfileScores = {
  riasec: Partial<Record<RiasecKey, ScoredScale>>;
  traits: Partial<Record<TraitKey, ScoredScale>>;
  aptitudes: Partial<Record<AptitudeKey, ScoredScale>>;
  values: { id: ValueId; mean: number; weight: number; rank: number }[] | null;
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sd(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Score one dimension. Returns null when fewer than half its items are answered. */
export function scoreScale(items: LikertItem[], answers: Answers): ScoredScale | null {
  const keyed = items
    .map((it) => {
      const v = answers[it.id];
      return v === undefined ? undefined : it.reverse ? 6 - v : v;
    })
    .filter((v): v is number => v !== undefined);
  if (keyed.length < Math.ceil(items.length / 2)) return null;
  const m = mean(keyed);
  const value = ((m - 1) / 4) * 100;
  // SE on the 1–5 scale; 25 points per scale step on 0–100. Floor the item SD at 0.6.
  const se = Math.max(sd(keyed), 0.6) / Math.sqrt(keyed.length);
  // Missing items widen the interval proportionally.
  const missingPenalty = 1 + (items.length - keyed.length) / items.length;
  const half = Math.max(MIN_HALF, Z80 * se * 25 * missingPenalty);
  return {
    value: round1(value),
    ci: [round1(clamp(value - half)), round1(clamp(value + half))],
    answered: keyed.length,
    items: items.length,
  };
}

function byDimension(items: readonly LikertItem[]) {
  const map = new Map<string, LikertItem[]>();
  for (const it of items) map.set(it.dimension, [...(map.get(it.dimension) ?? []), it]);
  return map;
}

/** 80% Wilson interval for a proportion, in percentage points. */
function wilson(k: number, n: number): [number, number] {
  const p = k / n;
  const z2 = Z80 * Z80;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (Z80 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [round1(clamp((centre - half) * 100)), round1(clamp((centre + half) * 100))];
}

export function scoreGame(game: GameId, responses: GameResponse[]): ScoredScale | null {
  const items = gameItems[game];
  const mine = responses.filter((r) => items.some((i) => i.id === r.itemId));
  if (mine.length < items.length) return null; // games are scored only when finished
  const k = mine.filter((r) => r.correct).length;
  return { value: round1((k / mine.length) * 100), ci: wilson(k, mine.length), answered: mine.length, items: items.length };
}

export function scoreSpeed(responses: GameResponse[]): ScoredScale | null {
  const limits = new Map<string, number>();
  for (const g of Object.values(gameItems)) for (const i of g) limits.set(i.id, i.seconds * 1000);
  const correct = responses.filter((r) => r.correct && limits.has(r.itemId));
  if (correct.length < 6) return null;
  const left = correct.map((r) => 1 - Math.min(1, r.ms / limits.get(r.itemId)!)).sort((a, b) => a - b);
  const median = left[Math.floor(left.length / 2)]!;
  const value = round1(clamp(median * 100));
  const half = Math.max(8, (Z80 * sd(left) * 100) / Math.sqrt(correct.length));
  return { value, ci: [round1(clamp(value - half)), round1(clamp(value + half))], answered: correct.length, items: correct.length };
}

export function scoreValues(answers: Answers): ProfileScores["values"] {
  const rows = VALUE_DEFS.map((v) => {
    const vals = v.items.map((_, i) => answers[`val-${v.id}${i + 1}`]).filter((x): x is number => x !== undefined);
    return { id: v.id as ValueId, mean: vals.length ? mean(vals) : NaN, n: vals.length };
  });
  if (rows.some((r) => r.n === 0)) return null;
  // Weight = share of total importance above the scale floor (1).
  const total = rows.reduce((a, r) => a + (r.mean - 1), 0) || 1;
  const sorted = [...rows].sort((a, b) => b.mean - a.mean);
  return sorted.map((r, i) => ({ id: r.id, mean: round1(r.mean), weight: (r.mean - 1) / total, rank: i + 1 }));
}

export function scoreProfile(answers: Answers, games: GameResponse[]): ProfileScores {
  const riasec: ProfileScores["riasec"] = {};
  for (const [dim, items] of byDimension(likertModules.interests)) {
    const s = scoreScale(items, answers);
    if (s) riasec[dim as RiasecKey] = s;
  }
  const traits: ProfileScores["traits"] = {};
  for (const [dim, items] of byDimension(likertModules.personality)) {
    const s = scoreScale(items, answers);
    if (s) traits[dim as TraitKey] = s;
  }
  const aptitudes: ProfileScores["aptitudes"] = {};
  for (const g of GAME_DEFS) {
    const s = scoreGame(g.id, games);
    if (s) aptitudes[g.id] = s;
  }
  const speed = scoreSpeed(games);
  if (speed) aptitudes.speed = speed;
  return { riasec, traits, aptitudes, values: scoreValues(answers) };
}

/* ----------------------------------------------------------------------------
   Norms: percentiles and medians, only once enough people have completed a scale.
   ---------------------------------------------------------------------------- */

export const NORM_MIN_N = 30;

export function percentileOf(value: number, population: number[]): number {
  const below = population.filter((p) => p < value).length;
  const equal = population.filter((p) => p === value).length;
  return Math.round(((below + equal / 2) / population.length) * 100);
}

export function medianOf(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
