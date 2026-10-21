/**
 * Sprint and evidence maths. Pure functions over plain records.
 *
 * Conviction for a lane starts at its relative fit (the profile prior) and moves toward
 * the evidence each sprint produces. Evidence blends desire to continue, energy, flow and
 * improvement. Each completed sprint carries weight 1.5 against the prior's 1; an active
 * sprint carries weight in proportion to how far through it you are.
 */
import type { CheckIn, Confidence, LogEntry, Score, Sprint } from "../types";
import type { SprintTemplate } from "./templates";
import { daysBetween } from "../format";

export type SprintRecord = {
  id: string;
  laneId: string;
  templateId: string;
  status: "active" | "completed" | "abandoned";
  startedOn: string;
  days: number;
  completedAt: Date | null;
  wantsToContinue: boolean | null;
  closingNote: string | null;
};

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const r1 = (n: number) => Math.round(n * 10) / 10;

export function currentDay(startedOn: string, days: number, today: string) {
  return clamp(daysBetween(startedOn, today) + 1, 1, days);
}

/** The improvement-chart value for one log entry. */
export function derive(chart: Sprint["chart"], entry: LogEntry): number | null {
  const num = entry.values[chart.numerator];
  if (num === undefined) return null;
  if (!chart.denominator) return num;
  const den = entry.values[chart.denominator];
  if (!den) return null;
  return r1((num / den) * (chart.scale ?? 1));
}

/** % change from the mean of the first third of logged points to the mean of the last third. */
export function improvementRate(chart: Sprint["chart"], log: LogEntry[]): number | null {
  const pts = [...log].sort((a, b) => a.day - b.day).map((e) => derive(chart, e)).filter((v): v is number => v !== null);
  if (pts.length < 3) return null;
  const third = Math.max(1, Math.floor(pts.length / 3));
  const first = avg(pts.slice(0, third));
  const last = avg(pts.slice(-third));
  if (first <= 0) return last > 0 ? 100 : 0;
  return Math.round(((last - first) / first) * 100);
}

function outcomeSummary(rate: number | null, energy: number, wants: boolean | null): string {
  const parts: string[] = [];
  if (rate !== null) parts.push(rate >= 20 ? `Clear improvement (${rate > 0 ? "+" : ""}${rate}%)` : rate >= 5 ? `Some improvement (+${rate}%)` : `Little measurable improvement (${rate}%)`);
  else parts.push("Not enough logged days to measure improvement");
  parts.push(Number.isNaN(energy) ? "no check-ins" : `energy averaged ${energy.toFixed(1)}/7`);
  parts.push(wants === true ? "and you wanted to continue." : wants === false ? "and you did not want to continue." : "and no decision on continuing yet.");
  return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
}

export function buildSprint(
  rec: SprintRecord,
  tpl: SprintTemplate,
  doneDays: Set<number>,
  checkIns: CheckIn[],
  log: LogEntry[],
  today: string,
  peerPerformance: number[],
): Sprint {
  const day = rec.status === "active" ? currentDay(rec.startedOn, rec.days, today) : undefined;
  const sprint: Sprint = {
    id: rec.id,
    templateId: rec.templateId,
    laneId: rec.laneId,
    title: tpl.title,
    brief: tpl.brief,
    days: rec.days,
    startedOn: rec.startedOn,
    currentDay: day,
    status: rec.status === "active" ? "active" : "completed",
    tasks: tpl.tasks.map(([title, detail], i) => ({ day: i + 1, title, detail, done: doneDays.has(i + 1) })),
    checkIns: [...checkIns].sort((a, b) => a.day - b.day),
    metrics: tpl.metrics,
    chart: tpl.chart,
    log: [...log].sort((a, b) => a.day - b.day),
  };
  if (rec.status === "completed") {
    const rate = improvementRate(tpl.chart, log);
    const energy = avg(checkIns.map((c) => c.energy));
    const last = [...log].sort((a, b) => b.day - a.day).map((e) => derive(tpl.chart, e)).find((v) => v !== null);
    let performance: Score | null = null;
    if (last !== undefined && last !== null && peerPerformance.length >= 10) {
      const below = peerPerformance.filter((p) => p < last).length;
      const pct = Math.round((below / peerPerformance.length) * 100);
      const half = Math.round(128 / Math.sqrt(peerPerformance.length));
      performance = { value: pct, ci: [clamp(pct - half), clamp(pct + half)] };
    }
    sprint.outcome = {
      performance,
      improvementRate: rate,
      energyAvg: Number.isNaN(energy) ? 0 : r1(energy),
      wantsToContinue: rec.wantsToContinue ?? false,
      summary: outcomeSummary(rate, energy, rec.wantsToContinue),
    };
  }
  return sprint;
}

/** Evidence a sprint produces for its lane, 0–100, and how much weight it carries. */
export function sprintEvidence(s: Sprint, wantsToContinue: boolean | null): { value: number; weight: number } | null {
  if (s.checkIns.length === 0 && s.status !== "completed") return null;
  const to100 = (x: number) => ((x - 1) / 6) * 100;
  const cont = avg(s.checkIns.map((c) => c.continue));
  const energy = avg(s.checkIns.map((c) => c.energy));
  const flow = avg(s.checkIns.map((c) => c.flow));
  let continueScore = Number.isNaN(cont) ? 50 : to100(cont);
  if (s.status === "completed" && wantsToContinue !== null) continueScore = 0.5 * continueScore + 0.5 * (wantsToContinue ? 90 : 10);
  const rate = improvementRate(s.chart, s.log);
  const improve = rate === null ? 50 : clamp(50 + rate / 2);
  const value =
    0.35 * continueScore + 0.25 * (Number.isNaN(energy) ? 50 : to100(energy)) + 0.2 * (Number.isNaN(flow) ? 50 : to100(flow)) + 0.2 * improve;
  const weight = s.status === "completed" ? 1.5 : 1.5 * ((s.currentDay ?? 1) / s.days);
  return { value: r1(value), weight };
}

export function conviction(prior: number, evidence: { value: number; weight: number }[]): Score {
  const w = 1 + evidence.reduce((a, e) => a + e.weight, 0);
  const value = (prior + evidence.reduce((a, e) => a + e.value * e.weight, 0)) / w;
  const half = 16 / Math.sqrt(w);
  return { value: r1(value), ci: [r1(clamp(value - half)), r1(clamp(value + half))] };
}

export function confidenceFromCi(score: Score): Confidence {
  const half = (score.ci[1] - score.ci[0]) / 2;
  return half <= 9 ? "high" : half <= 13 ? "med" : "low";
}
