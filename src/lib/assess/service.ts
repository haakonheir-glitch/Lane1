/**
 * Assessment session service: the only code that reads keys, writes responses and scores.
 * Called from the /api/assess route handlers.
 *
 * Steps: a session plan (battery_manifest.json) is flattened into ordered steps. Each Likert /
 * choice / text item is one step; a q-sort, an idea task, the environment check, the effort
 * question and each cognitive task are one step each. Progress = the first unanswered step.
 */
import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { ACQUIESCENCE_PAIRS, LV_SCALE_OF, WIL_MULTIPLIERS, WIL_VALUE_OF, itemIndex, sessionPlan, environmentQuestions, COGNITIVE_TASKS } from "../bank/bank";
import type { Block, CognitiveTaskId, ResponseFormat, SessionId } from "../bank/types";
import type { DeviceInfo, PublicBlock, PublicStep, TaskResponse, TaskTurn } from "../bank/public";
import { nextTrial, respond, discountIndifference, PRACTICE_COUNT, type StoredTrial } from "./tasks";
import { scoreSession, type SessionData, type SessionScores } from "../scoring/profile";
import { effortAction } from "../scoring/validity";
import { validateSort } from "../scoring/values";
import { PSYCHOMETRICS } from "../scoring/psychometrics";
import type { AccuracyTrial } from "../scoring/cognitive/accuracy";

type Step = { position: number; block: Block; blockIndex: number; itemIndex: number };

export function stepsFor(sessionId: SessionId): Step[] {
  const plan = sessionPlan(sessionId);
  const steps: Step[] = [];
  plan.blocks.forEach((block, blockIndex) => {
    if (block.kind === "env_check") steps.push({ position: steps.length, block, blockIndex, itemIndex: 0 });
    else block.items.forEach((_, itemIndex) => steps.push({ position: steps.length, block, blockIndex, itemIndex }));
  });
  return steps;
}

function publicBlock(block: Block, index: number, count: number): PublicBlock {
  return {
    id: block.id,
    title: block.title,
    stem: block.stem,
    prefix: block.prefix,
    status: block.status,
    index: index + 1,
    count,
    onet: block.module === "03_interests_onet_ip_short_form" || block.module === "05_values_onet_work_importance",
  };
}

/* ------------------------------------------------------------------ session rows */

export async function currentSessionRow(userId: string, sessionId: SessionId) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(schema.assessmentSessions)
    .where(and(eq(schema.assessmentSessions.userId, userId), eq(schema.assessmentSessions.sessionId, sessionId)))
    .orderBy(desc(schema.assessmentSessions.attempt))
    .limit(1);
  return row;
}

/** The in-progress row for a session, creating one (attempt + 1) if the latest is finished or missing. */
export async function openSession(userId: string, sessionId: SessionId, device?: DeviceInfo, retake = false) {
  const db = await getDb();
  const latest = await currentSessionRow(userId, sessionId);
  if (latest && latest.status === "in_progress") return latest;
  if (latest && latest.status === "completed" && !retake) return latest;
  const [row] = await db
    .insert(schema.assessmentSessions)
    .values({ userId, sessionId, attempt: (latest?.attempt ?? 0) + 1, deviceClass: device?.deviceClass, inputType: device?.inputType, viewport: device?.viewport })
    .returning();
  return row!;
}

async function answeredPositions(sessionRowId: string) {
  const db = await getDb();
  const rows = await db.select().from(schema.itemResponses).where(eq(schema.itemResponses.sessionRowId, sessionRowId));
  return new Map(rows.map((r) => [r.position, r]));
}

async function trialsFor(sessionRowId: string, taskId: string) {
  const db = await getDb();
  return db
    .select()
    .from(schema.taskTrials)
    .where(and(eq(schema.taskTrials.sessionRowId, sessionRowId), eq(schema.taskTrials.taskId, taskId)))
    .orderBy(asc(schema.taskTrials.trialIndex));
}

/** A task step is complete when its latest attempt has an end marker. */
function taskDone(trials: { attempt: number; trialIndex: number }[]) {
  return trials.some((t) => t.trialIndex === -1);
}

function taskIdOf(step: Step): CognitiveTaskId | null {
  const f = step.block.items[step.itemIndex]?.format;
  return f?.type === "task" ? f.taskId : null;
}

/* ------------------------------------------------------------------ state */

export async function sessionState(userId: string, sessionId: SessionId, position?: number, device?: DeviceInfo): Promise<{ step: PublicStep; sessionRowId: string }> {
  const row = await openSession(userId, sessionId, device);
  const steps = stepsFor(sessionId);
  if (row.status !== "in_progress") return { step: await doneStep(row.id), sessionRowId: row.id };
  const answered = await answeredPositions(row.id);
  let first = -1;
  for (const s of steps) {
    const task = taskIdOf(s);
    const done = task ? taskDone(await trialsFor(row.id, task)) : answered.has(s.position);
    if (!done) {
      first = s.position;
      break;
    }
  }
  if (first === -1) return { step: await finalize(row.id, userId, sessionId), sessionRowId: row.id };
  // Revisiting an earlier questionnaire item (Back) is allowed; tasks cannot be revisited.
  const pos = position !== undefined && position >= 0 && position < first && !taskIdOf(steps[position]!) ? position : first;
  return { step: toPublicStep(sessionId, steps[pos]!, steps.length, answered.get(pos)?.value), sessionRowId: row.id };
}

function toPublicStep(sessionId: SessionId, step: Step, total: number, value: unknown): PublicStep {
  const block = publicBlock(step.block, step.blockIndex, sessionPlan(sessionId).blocks.length);
  if (step.block.kind === "env_check") return { kind: "env_check", position: step.position, total, block, questions: environmentQuestions };
  const item = step.block.items[step.itemIndex]!;
  if (item.format.type === "task") {
    const spec = COGNITIVE_TASKS.find((t) => t.id === (item.format as { taskId: string }).taskId)!;
    return {
      kind: "task",
      position: step.position,
      total,
      block,
      task: { id: spec.id as CognitiveTaskId, title: spec.construct, instructions: spec.format ?? "", practice: PRACTICE_COUNT[spec.id as CognitiveTaskId], minutes: spec.est_minutes },
    };
  }
  // Statement items read "I worry about things." (file item_stem_prefix). Instructed validity items
  // are full sentences, so they get no prefix; the client never learns which items those are.
  const text = step.block.prefix && item.validity?.kind !== "instructed" ? `${step.block.prefix} ${item.text.charAt(0).toLowerCase()}${item.text.slice(1)}` : item.text;
  return { kind: "item", position: step.position, total, block, item: { token: `p${step.position}`, text, format: item.format }, value: value ?? undefined };
}

/* ------------------------------------------------------------------ answers */

function validValue(format: ResponseFormat, value: unknown): boolean {
  switch (format.type) {
    case "likert5":
    case "likert7":
      return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= format.options.length;
    case "single":
    case "sjt":
      return Number.isInteger(value) && (value as number) >= 0 && (value as number) < format.options.length;
    case "multi":
      return Array.isArray(value) && value.every((v) => Number.isInteger(v) && v >= 0 && v < format.options.length) && (format.max === undefined || value.length <= format.max);
    case "text":
      return typeof value === "string" && value.length <= 2000;
    case "number":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1e6;
    case "slider_0_100":
      return typeof value === "number" && value >= 0 && value <= 100;
    case "forced_q_sort":
      return (
        typeof value === "object" &&
        value !== null &&
        validateSort(value as Record<string, number>, format.cards.map((c) => c.id), format.capacities, format.columns.map((c) => c.value)) === null
      );
    case "ideas":
      return Array.isArray(value) && value.length <= 200 && value.every((v) => typeof v === "string" && v.length <= 200);
    case "task":
      return false;
  }
}

export async function saveAnswer(
  userId: string,
  sessionId: SessionId,
  position: number,
  value: unknown,
  skipped: boolean,
  rtMs: number,
  device?: DeviceInfo,
): Promise<PublicStep> {
  const row = await openSession(userId, sessionId, device);
  if (row.status !== "in_progress") throw new Error("Session is not in progress");
  const steps = stepsFor(sessionId);
  const step = steps[position];
  if (!step) throw new Error("Unknown position");
  const db = await getDb();
  const record = (itemId: string, module: string, v: unknown, skip: boolean) => ({
    sessionRowId: row.id,
    position,
    itemId,
    module,
    blockId: step.block.id,
    value: skip ? null : (v as object),
    skipped: skip,
    rtMs: Math.max(0, Math.min(3_600_000, Math.round(rtMs))),
    deviceClass: device?.deviceClass,
    inputType: device?.inputType,
  });

  let rec;
  if (step.block.kind === "env_check") {
    if (!Array.isArray(value) || value.length !== environmentQuestions.length || !value.every((v) => v === 0 || v === 1)) throw new Error("Invalid check");
    rec = record("ENV", step.block.module, value, false);
  } else {
    const item = step.block.items[step.itemIndex]!;
    if (item.format.type === "task") throw new Error("Tasks use the task endpoint");
    // Only Likert items may be skipped (scoring rules expect occasional missing answers).
    const canSkip = item.format.type === "likert5" || item.format.type === "likert7" || item.format.type === "text" || item.format.type === "number";
    if (skipped && !canSkip) throw new Error("This item can't be skipped");
    if (!skipped && !validValue(item.format, value)) throw new Error("Invalid answer");
    rec = record(item.id, item.module, value, skipped);
  }
  await db
    .insert(schema.itemResponses)
    .values(rec)
    .onConflictDoUpdate({ target: [schema.itemResponses.sessionRowId, schema.itemResponses.position], set: { value: rec.value, skipped: rec.skipped, rtMs: rec.rtMs, answeredAt: new Date() } });
  return (await sessionState(userId, sessionId)).step;
}

/* ------------------------------------------------------------------ tasks */

export async function taskTurn(
  userId: string,
  sessionId: SessionId,
  taskId: CognitiveTaskId,
  action: { kind: "start" } | { kind: "respond"; index: number; practice: boolean; response: TaskResponse; rtMs: number },
): Promise<TaskTurn & { next?: PublicStep }> {
  const row = await openSession(userId, sessionId);
  if (row.status !== "in_progress") throw new Error("Session is not in progress");
  const steps = stepsFor(sessionId);
  if (!steps.some((s) => taskIdOf(s) === taskId)) throw new Error("Task not in this session");
  const db = await getDb();
  const all = await trialsFor(row.id, taskId);
  if (taskDone(all)) return { trial: null, next: (await sessionState(userId, sessionId)).step };

  // A task interrupted mid-way restarts with fresh items (attempt + 1): resuming a timed task biases it.
  let attempt = Math.max(1, ...all.map((t) => t.attempt));
  if (action.kind === "start" && all.some((t) => t.attempt === attempt)) attempt += 1;
  const history: StoredTrial[] = all.filter((t) => t.attempt === attempt).map((t) => ({ trialIndex: t.trialIndex, practice: t.practice, payload: t.payload }));
  const ctx = { userId, taskId, attempt, history, sessionRowId: row.id };

  let feedback: TaskTurn["feedback"];
  let balloon: TaskTurn["balloon"];
  if (action.kind === "respond") {
    const res = respond(ctx, action.index, action.practice, action.response, action.rtMs);
    feedback = res.feedback;
    balloon = res.balloon;
    if (res.store) {
      await db.insert(schema.taskTrials).values({ sessionRowId: row.id, taskId, attempt, trialIndex: res.store.trialIndex, practice: res.store.practice, payload: res.store.payload });
      history.push(res.store);
    }
  }
  const trial = nextTrial({ ...ctx, history });
  if (trial) return { trial, feedback, balloon };
  await db.insert(schema.taskTrials).values({ sessionRowId: row.id, taskId, attempt, trialIndex: -1, practice: false, payload: { kind: "end" } }).onConflictDoNothing();
  return { trial: null, feedback, balloon, next: (await sessionState(userId, sessionId)).step };
}

/* ------------------------------------------------------------------ finishing */

async function collect(sessionRowId: string): Promise<SessionData> {
  const db = await getDb();
  const answers = await db.select().from(schema.itemResponses).where(eq(schema.itemResponses.sessionRowId, sessionRowId)).orderBy(asc(schema.itemResponses.position));
  const trials = await db.select().from(schema.taskTrials).where(eq(schema.taskTrials.sessionRowId, sessionRowId));
  const data: SessionData = { responses: [], qsorts: {}, ideas: {}, accuracy: {}, span: {} };
  for (const a of answers) {
    const item = itemIndex.get(a.itemId);
    if (!item) continue;
    if (item.format.type === "forced_q_sort") data.qsorts[a.itemId as "WIL_SORT" | "LV_SORT"] = a.value as Record<string, number>;
    else if (item.format.type === "ideas") data.ideas[a.itemId] = (a.value as string[]) ?? [];
    else data.responses.push({ itemId: a.itemId, blockId: a.blockId, value: typeof a.value === "number" ? a.value : a.skipped ? null : (a.value as never), rtMs: a.rtMs });
  }
  // Use the completed attempt of each task.
  const tasks = [...new Set(trials.map((t) => t.taskId))];
  for (const taskId of tasks) {
    const ended = trials.filter((t) => t.taskId === taskId && t.trialIndex === -1).map((t) => t.attempt);
    const attempt = Math.max(...ended, -Infinity);
    if (!Number.isFinite(attempt)) continue;
    const rows = trials.filter((t) => t.taskId === taskId && t.attempt === attempt && !t.practice && t.trialIndex >= 0).sort((a, b) => a.trialIndex - b.trialIndex);
    const p = rows.map((r) => r.payload as Record<string, unknown>);
    switch (taskId) {
      case "matrix":
      case "number_series":
      case "letter_series":
      case "quant":
      case "rotation2d":
        data.accuracy[taskId] = p.map((x) => ({ correct: !!x.correct, timedOut: !!x.timedOut, rtMs: Number(x.rtMs), timeLimitSec: Number(x.timeLimitSec) }) as AccuracyTrial);
        break;
      case "backward_digits":
      case "corsi":
        data.span[taskId] = p.map((x) => ({ length: Number(x.length), correct: !!x.correct }));
        break;
      case "symbol_match":
        data.symbol = ((p[0]?.answers as { correct: boolean; rtMs: number }[]) ?? []).map((a) => ({ correct: a.correct, rtMs: a.rtMs }));
        break;
      case "choice_rt":
        data.choiceRt = ((p[0]?.answers as { correct: boolean; rtMs: number }[]) ?? []).map((a) => ({ correct: a.correct, rtMs: a.rtMs }));
        break;
      case "learning_rate":
        data.learning = p.map((x) => ({ block: Number(x.block), correct: !!x.correct, rtMs: Number(x.rtMs) }));
        break;
      case "balloon":
        data.balloon = p.map((x) => ({ pumps: Number(x.pumps), burst: !!x.burst }));
        break;
      case "delay_discount":
        data.discount = discountIndifference(rows.map((r) => ({ trialIndex: r.trialIndex, practice: r.practice, payload: r.payload })));
        break;
    }
  }
  return data;
}

async function finalize(sessionRowId: string, userId: string, sessionId: SessionId): Promise<PublicStep> {
  const db = await getDb();
  const data = await collect(sessionRowId);
  const scores: SessionScores = scoreSession(sessionId, data, {
    items: itemIndex,
    antonymPairs: ACQUIESCENCE_PAIRS as [string, string][],
    wilValueOf: WIL_VALUE_OF,
    wilMultipliers: WIL_MULTIPLIERS,
    lvScaleOf: LV_SCALE_OF,
    psychometrics: PSYCHOMETRICS,
  });
  const effortAnswer = data.responses.find((r) => r.itemId === "EFFORT1")?.value ?? null;
  const action = effortAction(effortAnswer);
  await db.insert(schema.sessionScores).values({ sessionRowId, scores }).onConflictDoUpdate({ target: schema.sessionScores.sessionRowId, set: { scores, scoredAt: new Date() } });
  await db
    .update(schema.assessmentSessions)
    .set({
      status: action === "discard" ? "discarded" : "completed",
      completedAt: new Date(),
      effort: effortAnswer,
      confidence: scores.validity.confidence,
      flags: scores.validity.flags.map((f) => f.label),
    })
    .where(and(eq(schema.assessmentSessions.id, sessionRowId), eq(schema.assessmentSessions.userId, userId)));
  return doneStep(sessionRowId);
}

async function doneStep(sessionRowId: string): Promise<PublicStep> {
  const db = await getDb();
  const [row] = await db.select().from(schema.assessmentSessions).where(eq(schema.assessmentSessions.id, sessionRowId)).limit(1);
  const plan = sessionPlan(row!.sessionId);
  return {
    kind: "done",
    status: row!.status === "discarded" ? "discarded" : "completed",
    confidence: row!.confidence ?? null,
    flags: row!.flags ?? [],
    unlocks: plan.unlocks,
    effort: row!.effort === null ? null : effortAction(row!.effort),
    hasExperimental: plan.blocks.some((b) => b.status === "experimental"),
  };
}

/* ------------------------------------------------------------------ hub */

export async function hubStatus(userId: string) {
  const db = await getDb();
  const rows = await db.select().from(schema.assessmentSessions).where(eq(schema.assessmentSessions.userId, userId));
  const out: Record<SessionId, { status: "not_started" | "in_progress" | "completed" | "discarded"; answered: number; total: number; confidence: "ok" | "low" | null; completedAt: Date | null }> = {} as never;
  for (const id of ["S1", "S2", "S3", "S4", "S5"] as SessionId[]) {
    const latest = rows.filter((r) => r.sessionId === id).sort((a, b) => b.attempt - a.attempt)[0];
    const total = stepsFor(id).length;
    let answered = 0;
    if (latest) {
      const pos = await answeredPositions(latest.id);
      answered = pos.size;
      for (const s of stepsFor(id)) {
        const t = taskIdOf(s);
        if (t && taskDone(await trialsFor(latest.id, t))) answered++;
      }
    }
    out[id] = {
      status: latest ? latest.status : "not_started",
      answered: latest?.status === "completed" ? total : Math.min(answered, total),
      total,
      confidence: latest?.confidence ?? null,
      completedAt: latest?.completedAt ?? null,
    };
  }
  return out;
}

/** Starts a fresh attempt of a session (retake after "low confidence" or an effort answer). */
export async function retakeSession(userId: string, sessionId: SessionId) {
  return openSession(userId, sessionId, undefined, true);
}
