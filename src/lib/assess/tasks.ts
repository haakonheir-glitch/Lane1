/**
 * Server-side runtime for the cognitive and behavioural tasks (file 14). Items are regenerated
 * from seedFor(user, task, attempt, index) on every request, so nothing but responses is stored,
 * and the browser only ever receives render payloads (see bank/public.ts).
 *
 * Practice: 2 untimed items with feedback for tasks that have right answers (file 14 general
 * rules: "2–3 practice items"); symbol match uses SPEED_PROTOCOL.practiceTrials. Learning,
 * balloon and discounting have no right answer to practise, so they start with instructions only.
 */
import "server-only";
import * as g from "@assessment/generators/generators";
import { COGNITIVE_TASKS } from "../bank/bank";
import { seedFor } from "../bank/seed";
import type { CognitiveTaskId } from "../bank/types";
import type { PublicPolygon, PublicTrial, TaskResponse, TaskTurn } from "../bank/public";
import { markRotation } from "../scoring/cognitive/accuracy";
import { markSpan, nextSpanLength, type SpanTrialResult } from "../scoring/cognitive/span";

export type StoredTrial = { trialIndex: number; practice: boolean; payload: Record<string, unknown> };
export type TaskCtx = { userId: string; taskId: CognitiveTaskId; attempt: number; history: StoredTrial[] };

const ladder = (taskId: string) => COGNITIVE_TASKS.find((t) => t.id === taskId)?.phase1_ladder ?? [];
/** Difficulty level of scored trial `index` of an accuracy task (fixed ladder, file 14). */
export const levelAt = (taskId: string, index: number): number | undefined => ladder(taskId)[index];
const PRACTICE_ACCURACY = 2;
const PRACTICE_SPAN = 2;
const PRACTICE_RT = 5;
const LEARN_BLOCKS = 6;
const LEARN_TRIALS = 24;
const BALLOONS = 30;
const DISCOUNT_DELAYS = [7, 30, 90, 365];
const DISCOUNT_LATER = 1000;
const DISCOUNT_STEPS = 5;

export const PRACTICE_COUNT: Record<CognitiveTaskId, number> = {
  matrix: PRACTICE_ACCURACY,
  number_series: PRACTICE_ACCURACY,
  letter_series: PRACTICE_ACCURACY,
  quant: PRACTICE_ACCURACY,
  rotation2d: PRACTICE_ACCURACY,
  backward_digits: PRACTICE_SPAN,
  corsi: PRACTICE_SPAN,
  symbol_match: g.SPEED_PROTOCOL.practiceTrials,
  choice_rt: PRACTICE_RT,
  learning_rate: 0,
  balloon: 0,
  delay_discount: 0,
};

/** Practice items use a separate seed stream (index offset) so they never repeat scored items. */
const seed = (ctx: TaskCtx, index: number, practice: boolean) => seedFor(ctx.userId, ctx.taskId, ctx.attempt, practice ? 100_000 + index : index);

/* ------------------------------------------------------------------ accuracy items */

type AccuracyItem =
  | { kind: "matrix"; item: g.MatrixItem }
  | { kind: "series"; item: g.SeriesItem }
  | { kind: "quant"; item: g.QuantItem }
  | { kind: "rotation"; item: g.RotationItem };

const ACCURACY: CognitiveTaskId[] = ["matrix", "number_series", "letter_series", "quant", "rotation2d"];

function accuracyItem(ctx: TaskCtx, index: number, practice: boolean): AccuracyItem {
  const lv = practice ? ladder(ctx.taskId)[0]! : ladder(ctx.taskId)[index]!;
  const s = seed(ctx, index, practice);
  switch (ctx.taskId) {
    case "matrix":
      return { kind: "matrix", item: g.generateMatrix(s, lv as 1 | 2 | 3 | 4) };
    case "number_series":
      return { kind: "series", item: g.generateNumberSeries(s, lv as 1 | 2 | 3 | 4) };
    case "letter_series":
      return { kind: "series", item: g.generateLetterSeries(s, lv as 1 | 2 | 3) };
    case "quant":
      return { kind: "quant", item: g.generateQuant(s, lv as 1 | 2 | 3 | 4) };
    case "rotation2d":
      return { kind: "rotation", item: g.generateRotation2D(s, lv as 5 | 6 | 7 | 8) };
    default:
      throw new Error(`Not an accuracy task: ${ctx.taskId}`);
  }
}

/** Squares of a polyomino, rotated about the shape's centre, as corner polygons (rounded). */
function rotatedSquares(cells: g.Poly, angleDeg: number): PublicPolygon {
  const cx = cells.reduce((s, c) => s + c[0] + 0.5, 0) / cells.length;
  const cy = cells.reduce((s, c) => s + c[1] + 0.5, 0) / cells.length;
  const a = (angleDeg * Math.PI) / 180;
  const rot = (x: number, y: number): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    return [Math.round((dx * Math.cos(a) - dy * Math.sin(a)) * 100) / 100, Math.round((dx * Math.sin(a) + dy * Math.cos(a)) * 100) / 100];
  };
  return cells.map(([x, y]) => [rot(x, y), rot(x + 1, y), rot(x + 1, y + 1), rot(x, y + 1)]);
}

function publicAccuracy(a: AccuracyItem): PublicTrial {
  switch (a.kind) {
    case "matrix":
      return { task: "matrix", grid: a.item.grid, options: a.item.options, timeLimitSec: a.item.timeLimitSec };
    case "series":
      return { task: a.item.task, shown: a.item.shown, options: a.item.options, timeLimitSec: a.item.timeLimitSec };
    case "quant":
      return { task: "quant", text: a.item.text, options: a.item.options, timeLimitSec: a.item.timeLimitSec };
    case "rotation":
      return {
        task: "rotation2d",
        target: rotatedSquares(a.item.target, 0),
        options: a.item.options.map((o) => rotatedSquares(o.cells, o.angleDeg)),
        timeLimitSec: a.item.timeLimitSec,
      };
  }
}

function markAccuracy(a: AccuracyItem, r: TaskResponse): boolean {
  if (a.kind === "rotation") return r.kind === "multi" && markRotation(r.selected, a.item.answerIndices);
  if (r.kind !== "choice" || r.choice === null) return false;
  if (a.kind === "matrix") return r.choice === a.item.answerIndex;
  return a.item.options[r.choice] === a.item.answer;
}

/* ------------------------------------------------------------------ helpers */

const scored = (ctx: TaskCtx) => ctx.history.filter((h) => !h.practice).sort((a, b) => a.trialIndex - b.trialIndex);
const practiced = (ctx: TaskCtx) => ctx.history.filter((h) => h.practice);

function turn(trial: PublicTrial, index: number, practice: boolean, scoredTotal: number | null): NonNullable<TaskTurn["trial"]> {
  return { ...trial, index, practice, scoredTotal };
}

/* ------------------------------------------------------------------ public API */

/** The next trial to show, or null when the attempt is complete. */
export function nextTrial(ctx: TaskCtx): TaskTurn["trial"] {
  const p = practiced(ctx).length;
  const s = scored(ctx);
  const t = ctx.taskId;
  const practiceLeft = p < PRACTICE_COUNT[t];

  if (ACCURACY.includes(t)) {
    const total = ladder(t).length;
    if (practiceLeft) return turn({ ...publicAccuracy(accuracyItem(ctx, p, true)), timeLimitSec: 0 } as PublicTrial, p, true, total); // practice is untimed
    if (s.length >= total) return null;
    return turn(publicAccuracy(accuracyItem(ctx, s.length, false)), s.length, false, total);
  }

  if (t === "backward_digits" || t === "corsi") {
    const gen = t === "corsi" ? g.generateCorsi : g.generateBackwardDigits;
    const base = { presentationMs: g.SPAN_PROTOCOL.presentationMs, isiMs: g.SPAN_PROTOCOL.isiMs, layout: t === "corsi" ? g.CORSI_LAYOUT : undefined };
    if (practiceLeft) return turn({ task: t, sequence: gen(seed(ctx, p, true), 2).sequence, ...base }, p, true, null);
    const len = nextSpanLength(s.map((h) => h.payload as SpanTrialResult), g.SPAN_PROTOCOL);
    if (len === null) return null;
    return turn({ task: t, sequence: gen(seed(ctx, s.length, false), len).sequence, ...base }, s.length, false, null);
  }

  if (t === "symbol_match") {
    if (practiceLeft) {
      const tr = g.generateSymbolMatchBlock(seed(ctx, 0, true), PRACTICE_COUNT.symbol_match)[p]!;
      return turn({ task: t, pairs: [{ left: tr.left, right: tr.right }], durationSec: 0 }, p, true, 1);
    }
    if (s.length >= 1) return null;
    const block = g.generateSymbolMatchBlock(seed(ctx, 0, false));
    return turn({ task: t, pairs: block.map((x) => ({ left: x.left, right: x.right })), durationSec: g.SPEED_PROTOCOL.durationSec }, 0, false, 1);
  }

  if (t === "choice_rt") {
    if (practiceLeft) {
      const tr = g.generateChoiceRT(seed(ctx, 0, true), PRACTICE_RT)[p]!;
      return turn({ task: t, trials: [{ stimulus: tr.stimulus, foreperiodMs: tr.foreperiodMs }] }, p, true, 1);
    }
    if (s.length >= 1) return null;
    return turn({ task: t, trials: g.generateChoiceRT(seed(ctx, 0, false)).map((x) => ({ stimulus: x.stimulus, foreperiodMs: x.foreperiodMs })) }, 0, false, 1);
  }

  if (t === "learning_rate") {
    const total = LEARN_BLOCKS * LEARN_TRIALS;
    if (s.length >= total) return null;
    const blocks = g.generateLearningTask(seed(ctx, 0, false), LEARN_BLOCKS, LEARN_TRIALS);
    const b = Math.floor(s.length / LEARN_TRIALS);
    const i = s.length % LEARN_TRIALS;
    return turn(
      { task: t, block: b + 1, blocks: LEARN_BLOCKS, trialInBlock: i + 1, trialsPerBlock: LEARN_TRIALS, symbol: blocks[b]!.trials[i]!.symbol, keys: 3 },
      s.length,
      false,
      total,
    );
  }

  if (t === "balloon") {
    if (s.length >= BALLOONS) return null;
    const total = s.reduce((sum, h) => sum + (h.payload.burst ? 0 : Number(h.payload.pumps)), 0);
    return turn({ task: t, balloon: s.length + 1, balloons: BALLOONS, pointsPerPump: 1, maxPumps: 64, total }, s.length, false, BALLOONS);
  }

  if (t === "delay_discount") {
    const total = DISCOUNT_DELAYS.length * DISCOUNT_STEPS;
    if (s.length >= total) return null;
    const d = Math.floor(s.length / DISCOUNT_STEPS);
    const delay = DISCOUNT_DELAYS[d]!;
    const hist = s.slice(d * DISCOUNT_STEPS).map((h) => h.payload.choice as "sooner" | "later");
    const q = g.discountNext(DISCOUNT_LATER, delay, hist);
    if ("indifference" in q) throw new Error("discount step mismatch");
    return turn({ task: t, sooner: q.sooner, later: q.later, delayDays: q.delayDays, choice: s.length + 1, choices: total }, s.length, false, total);
  }

  throw new Error(`Unknown task ${t}`);
}

/**
 * Marks a response for the trial the server would show now. Returns the row to store
 * (null when nothing is stored yet, e.g. a non-bursting pump) and any feedback.
 */
export function respond(
  ctx: TaskCtx & { sessionRowId: string },
  index: number,
  practice: boolean,
  response: TaskResponse,
  rtMs: number,
): { store: StoredTrial | null; feedback?: TaskTurn["feedback"]; balloon?: TaskTurn["balloon"] } {
  const current = nextTrial(ctx);
  if (!current || current.index !== index || current.practice !== practice) throw new Error("Out-of-order response");
  const t = ctx.taskId;
  const row = (payload: Record<string, unknown>): StoredTrial => ({ trialIndex: index, practice, payload: { ...payload, rtMs } });

  if (ACCURACY.includes(t)) {
    const item = accuracyItem(ctx, index, practice);
    const correct = markAccuracy(item, response);
    const timedOut = response.kind === "choice" && response.choice === null;
    const limit = practice ? 0 : item.item.timeLimitSec;
    return {
      store: row({ response, correct, timedOut, timeLimitSec: limit, level: practice ? undefined : levelAt(t, index) }),
      feedback: practice ? { correct } : undefined,
    };
  }

  if (t === "backward_digits" || t === "corsi") {
    if (response.kind !== "sequence") throw new Error("Expected a sequence");
    const gen = t === "corsi" ? g.generateCorsi : g.generateBackwardDigits;
    const len = practice ? 2 : nextSpanLength(scored(ctx).map((h) => h.payload as SpanTrialResult), g.SPAN_PROTOCOL)!;
    const trial = gen(seed(ctx, index, practice), len);
    const correct = markSpan(response.sequence, trial.correctResponse);
    return { store: row({ length: len, correct, response: response.sequence }), feedback: practice ? { correct } : undefined };
  }

  if (t === "symbol_match" || t === "choice_rt") {
    if (response.kind !== "batch") throw new Error("Expected a batch");
    const truth =
      t === "symbol_match"
        ? (practice ? g.generateSymbolMatchBlock(seed(ctx, 0, true), PRACTICE_COUNT.symbol_match).slice(index, index + 1) : g.generateSymbolMatchBlock(seed(ctx, 0, false))).map((x) => (x.same ? 1 : 0))
        : (practice ? g.generateChoiceRT(seed(ctx, 0, true), PRACTICE_RT).slice(index, index + 1) : g.generateChoiceRT(seed(ctx, 0, false))).map((x) => x.stimulus);
    const answers = response.answers
      .filter((a) => a.index >= 0 && a.index < truth.length && a.answer !== null)
      .map((a) => ({ index: a.index, correct: a.answer === truth[a.index], rtMs: Math.max(0, Math.round(a.rtMs)) }));
    return {
      store: row({ answers }),
      feedback: practice ? { correct: answers.length > 0 && answers.every((a) => a.correct) } : undefined,
    };
  }

  if (t === "learning_rate") {
    if (response.kind !== "key") throw new Error("Expected a key");
    const blocks = g.generateLearningTask(seed(ctx, 0, false), LEARN_BLOCKS, LEARN_TRIALS);
    const b = Math.floor(index / LEARN_TRIALS);
    const correct = response.key === blocks[b]!.trials[index % LEARN_TRIALS]!.correctKey;
    return { store: row({ block: b + 1, correct }), feedback: { correct } };
  }

  if (t === "balloon") {
    // Stateless: the client reports its pump count; the server compares it with the hidden burst
    // point. Probing with a large count reveals no more than pumping that many times would.
    const explodeAt = g.generateBalloonSchedule(seed(ctx, 0, false)).explosionPoints[index]!;
    const bankedBefore = scored(ctx).reduce((s, h) => s + (h.payload.burst ? 0 : Number(h.payload.pumps)), 0);
    if (response.kind !== "pump" && response.kind !== "collect") throw new Error("Expected pump or collect");
    const pumps = Math.max(0, Math.min(64, Math.floor(response.pumps)));
    if (pumps >= explodeAt) return { store: row({ pumps, burst: true }), balloon: { burst: true, pumps, banked: bankedBefore } };
    if (response.kind === "pump") return { store: null, balloon: { burst: false, pumps, banked: bankedBefore } };
    return { store: row({ pumps, burst: false }), balloon: { burst: false, pumps, banked: bankedBefore + pumps } };
  }

  if (t === "delay_discount") {
    if (response.kind !== "pick") throw new Error("Expected a pick");
    const d = Math.floor(index / DISCOUNT_STEPS);
    return { store: row({ delayDays: DISCOUNT_DELAYS[d], choice: response.option }) };
  }

  throw new Error(`Unknown task ${t}`);
}

/** Indifference points per delay from stored discounting choices. */
export function discountIndifference(history: StoredTrial[]): { delayDays: number; indifference: number }[] {
  const s = history.filter((h) => !h.practice).sort((a, b) => a.trialIndex - b.trialIndex);
  return DISCOUNT_DELAYS.flatMap((delay, d) => {
    const choices = s.slice(d * DISCOUNT_STEPS, (d + 1) * DISCOUNT_STEPS).map((h) => h.payload.choice as "sooner" | "later");
    if (choices.length < DISCOUNT_STEPS) return [];
    const r = g.discountNext(DISCOUNT_LATER, delay, choices);
    return "indifference" in r ? [{ delayDays: delay, indifference: r.indifference }] : [];
  });
}

/** One public trial per task from fixed seeds, for the /system specimen page. Not used in sessions. */
export function specimenTrials(): Record<CognitiveTaskId, NonNullable<TaskTurn["trial"]>> {
  const ids = Object.keys(PRACTICE_COUNT) as CognitiveTaskId[];
  return Object.fromEntries(
    ids.map((taskId) => {
      const history: StoredTrial[] = Array.from({ length: PRACTICE_COUNT[taskId] }, (_, i) => ({ trialIndex: i, practice: true, payload: {} }));
      return [taskId, nextTrial({ userId: "specimen", taskId, attempt: 1, history })!];
    }),
  ) as Record<CognitiveTaskId, NonNullable<TaskTurn["trial"]>>;
}
