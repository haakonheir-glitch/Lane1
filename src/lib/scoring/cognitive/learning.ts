/**
 * learning_rate: fit accuracy(block) = a + b·log(block); learning rate = b. Same fit for the
 * median correct RT per block (negative slope = getting faster). Reported relative to the
 * person's own starting level (fast starters have less room to grow).
 */
import { median } from "../core";

export type LearningTrial = { block: number; correct: boolean; rtMs: number };

/** Ordinary least squares of y on log(x). */
export function fitLog(points: { x: number; y: number }[]): { a: number; b: number } | null {
  const pts = points.filter((p) => Number.isFinite(p.y));
  if (pts.length < 2) return null;
  const xs = pts.map((p) => Math.log(p.x));
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let sxy = 0;
  let sxx = 0;
  pts.forEach((p, i) => {
    sxy += (xs[i]! - mx) * (p.y - my);
    sxx += (xs[i]! - mx) ** 2;
  });
  if (sxx === 0) return null;
  const b = sxy / sxx;
  return { a: my - b * mx, b };
}

export function scoreLearning(trials: LearningTrial[]) {
  const blocks = [...new Set(trials.map((t) => t.block))].sort((a, b) => a - b);
  const perBlock = blocks.map((block) => {
    const ts = trials.filter((t) => t.block === block);
    const correct = ts.filter((t) => t.correct);
    return { block, accuracy: correct.length / ts.length, medianCorrectRtMs: correct.length ? median(correct.map((t) => t.rtMs)) : NaN };
  });
  const acc = fitLog(perBlock.map((b) => ({ x: b.block, y: b.accuracy })));
  const rt = fitLog(perBlock.map((b) => ({ x: b.block, y: b.medianCorrectRtMs })));
  const start = perBlock[0]?.accuracy ?? null;
  return {
    perBlock,
    accuracySlope: acc?.b ?? null,
    rtSlopeMs: rt?.b ?? null,
    startingAccuracy: start,
    /** Room to grow: slope relative to the headroom above the starting level. */
    relativeRate: acc && start !== null && start < 1 ? acc.b / (1 - start) : null,
  };
}
