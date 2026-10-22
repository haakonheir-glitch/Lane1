/**
 * Reasoning norms from the provisional calibration (PLAN D50): item difficulties for the
 * accuracy tasks, population means and SDs for span and speed. Read from the fixed table the
 * offline script writes; regenerate it with `npm run calibrate`, never at runtime.
 */
import table from "@assessment/calibration/output/difficulty_table.json";
import type { Normed } from "../core";
import { estimateTheta, normedFromZ, type LevelCount, type LevelParams } from "./irt";

export type AccuracyTaskId = "matrix" | "number_series" | "letter_series" | "quant" | "rotation2d";
type NormTaskId = "backward_digits" | "corsi" | "symbol_match";

export const CALIBRATION = { model: table.model, date: table.date, provisional: table.provisional, mock: table.mock } as const;

const PARAMS = new Map<string, LevelParams>(table.items.map((r) => [`${r.task}:${r.level}`, { a: r.a, b: r.b, c: r.c, sdBWithin: r.sd_b_within }]));

export const levelParams = (task: AccuracyTaskId, level: number): LevelParams | null => PARAMS.get(`${task}:${level}`) ?? null;

export const NORMS: Record<NormTaskId, { mean: number; sd: number; confidence: string } | null> = {
  backward_digits: table.norms.find((n) => n.task === "backward_digits") ?? null,
  corsi: table.norms.find((n) => n.task === "corsi") ?? null,
  symbol_match: table.norms.find((n) => n.task === "symbol_match") ?? null,
};

/**
 * Span and speed reliabilities are not in the table; BLUEPRINT §7's planning value is used.
 * Two span tasks are combined assuming they correlate .5 (composite SD √3, Mosier reliability .80).
 */
export const ASSUMED_TASK_RELIABILITY = 0.7;
const SPAN_CORRELATION = 0.5;

/** Ability on one or more accuracy tasks, from per-level right/wrong counts. */
export function abilityFrom(tasks: Partial<Record<AccuracyTaskId, LevelCount[] | undefined>>): Normed | null {
  const counts = (Object.entries(tasks) as [AccuracyTaskId, LevelCount[] | undefined][]).flatMap(([task, levels]) =>
    (levels ?? []).flatMap((l) => {
      const params = levelParams(task, l.level);
      return params ? [{ params, correct: l.correct, scored: l.scored }] : [];
    }),
  );
  const est = estimateTheta(counts);
  return est ? normedFromZ(est.theta, est.psd) : null;
}

const zOf = (task: NormTaskId, raw: number | null | undefined) => {
  const n = NORMS[task];
  return n && raw !== null && raw !== undefined ? (raw - n.mean) / n.sd : null;
};

export function memoryFrom(digitSpan: number | null | undefined, corsiSpan: number | null | undefined): Normed | null {
  const zs = [zOf("backward_digits", digitSpan), zOf("corsi", corsiSpan)].filter((z): z is number => z !== null);
  if (!zs.length) return null;
  if (zs.length === 1) return normedFromZ(zs[0]!, Math.sqrt(1 - ASSUMED_TASK_RELIABILITY));
  const r = SPAN_CORRELATION;
  const composite = (zs[0]! + zs[1]!) / Math.sqrt(2 + 2 * r);
  const reliability = (2 * ASSUMED_TASK_RELIABILITY + 2 * r) / (2 + 2 * r);
  return normedFromZ(composite, Math.sqrt(1 - reliability));
}

export function speedFrom(symbolScore: number | null | undefined): Normed | null {
  const z = zOf("symbol_match", symbolScore);
  return z === null ? null : normedFromZ(z, Math.sqrt(1 - ASSUMED_TASK_RELIABILITY));
}
