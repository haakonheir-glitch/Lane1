/**
 * Data access — the seam between pages and the database.
 * Every function is scoped to the signed-in user (requireUser) and returns plain typed data.
 * Pages call these; components only receive the results as props.
 */
import "server-only";
import { cache } from "react";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "../db";
import { requireUser } from "../auth";
import { GAME_DEFS, gameItems, likertModules, publicItems, type GameId, type LikertModuleId } from "../assessment/items";
import { NORM_MIN_N, medianOf, percentileOf, scoreProfile, type GameResponse, type ProfileScores, type ScoredScale } from "../assessment/scoring";
import { canRankLanes, computeLanes, laneMeta, type SimilarStats } from "../assessment/lanes";
import { LIMITATIONS, interpret, riasecLabel, summarise, traitLabel } from "../assessment/report";
import { VALUE_DEFS } from "../assessment/items";
import { buildSprint, conviction, confidenceFromCi, derive, sprintEvidence, type SprintRecord } from "../sprints/compute";
import { templateById, templateForLane } from "../sprints/templates";
import { rankLanes } from "../scoring";
import { addDays } from "../format";
import type {
  AssessmentModule,
  CheckIn,
  ConvictionSeries,
  Evidence,
  EvidenceEvent,
  Lane,
  LikertQuestion,
  LogEntry,
  OnboardingAnswers,
  Profile,
  RiasecKey,
  Sprint,
  TraitKey,
  User,
} from "../types";

const TIME_ZONE = process.env.APP_TIMEZONE ?? "Europe/Oslo";

/** Today's date (YYYY-MM-DD) in the app's time zone. */
export function getToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const isoDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/* ---------------------------------------------------------------- user ---- */

export const getUser = cache(async (): Promise<User> => {
  const u = await requireUser();
  const db = await getDb();
  const [p] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, u.id)).limit(1);
  const initials = u.name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).slice(0, 2).join("") || "?";
  return {
    id: u.id,
    name: u.name,
    initials,
    email: u.email,
    ageRange: p?.ageRange ?? "",
    city: p?.city ?? "",
    situation: p?.situation ?? "",
    clarityGoal: p?.clarityGoal ?? "",
    reportId: `LN-${isoDate(u.createdAt).replaceAll("-", "").slice(0, 8)}-${initials}${u.id.slice(0, 2).toUpperCase()}`,
    memberSince: isoDate(u.createdAt),
  };
});

export async function getOnboarding(): Promise<OnboardingAnswers & { done: boolean }> {
  const u = await requireUser();
  const db = await getDb();
  const [p] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, u.id)).limit(1);
  return { ageRange: p?.ageRange ?? null, situation: p?.situation ?? null, clarityGoal: p?.clarityGoal ?? null, done: !!p?.onboardedAt };
}

/* ---------------------------------------------------------- assessment ---- */

const loadAnswers = cache(async (userId: string) => {
  const db = await getDb();
  const rows = await db.select().from(schema.responses).where(eq(schema.responses.userId, userId));
  return Object.fromEntries(rows.map((r) => [r.itemId, r.value])) as Record<string, number>;
});

const loadGames = cache(async (userId: string): Promise<GameResponse[]> => {
  const db = await getDb();
  return db
    .select({ itemId: schema.cognitiveResponses.itemId, choice: schema.cognitiveResponses.choice, correct: schema.cognitiveResponses.correct, ms: schema.cognitiveResponses.ms })
    .from(schema.cognitiveResponses)
    .where(eq(schema.cognitiveResponses.userId, userId));
});

const loadCompletions = cache(async (userId: string) => {
  const db = await getDb();
  return db.select().from(schema.moduleCompletions).where(eq(schema.moduleCompletions.userId, userId));
});

export const getScores = cache(async (): Promise<ProfileScores> => {
  const u = await requireUser();
  const [answers, games] = await Promise.all([loadAnswers(u.id), loadGames(u.id)]);
  return scoreProfile(answers, games);
});

const MODULE_META: Record<string, { title: string; instrument: string; description: string; minutes: number }> = {
  interests: { title: "Interests", instrument: "RIASEC", description: "How much you would enjoy 36 work activities. There are no right answers.", minutes: 7 },
  personality: { title: "Personality", instrument: "Big Five", description: "How well 40 short statements describe you as you generally are, not as you wish to be.", minutes: 8 },
  cognitive: { title: "Cognitive games", instrument: "3 timed tasks", description: "Short timed tasks. They sample how you reason under mild time pressure, not what you know.", minutes: 12 },
  values: { title: "Work values", instrument: "8 values", description: "What you want work to give you. Rate 16 statements by how important they are to you.", minutes: 3 },
};

export async function getModules(): Promise<AssessmentModule[]> {
  const u = await requireUser();
  const [answers, games] = await Promise.all([loadAnswers(u.id), loadGames(u.id)]);
  const status = (answered: number, total: number) => (answered >= total ? "complete" : answered > 0 ? "in-progress" : "not-started");
  const likert = (id: LikertModuleId): AssessmentModule => {
    const items = likertModules[id];
    const answered = items.filter((i) => answers[i.id] !== undefined).length;
    return { id, ...MODULE_META[id]!, items: items.length, answered, status: status(answered, items.length) };
  };
  const gameDone = (g: GameId) => gameItems[g].every((i) => games.some((r) => r.itemId === i.id));
  const gameStarted = (g: GameId) => gameItems[g].some((i) => games.some((r) => r.itemId === i.id));
  const parts = GAME_DEFS.map((g) => ({ title: g.title, status: gameDone(g.id) ? ("complete" as const) : gameStarted(g.id) ? ("in-progress" as const) : ("not-started" as const) }));
  const doneGames = parts.filter((p) => p.status === "complete").length;
  return [
    likert("interests"),
    likert("personality"),
    {
      id: "cognitive",
      ...MODULE_META.cognitive!,
      items: 3,
      answered: doneGames,
      status: doneGames === 3 ? "complete" : parts.some((p) => p.status !== "not-started") ? "in-progress" : "not-started",
      parts,
    },
    likert("values"),
  ];
}

export async function getModuleTitle(id: string) {
  return MODULE_META[id]?.title;
}

export async function getQuestions(id: LikertModuleId): Promise<{ questions: LikertQuestion[]; answers: Record<string, number> }> {
  const u = await requireUser();
  const answers = await loadAnswers(u.id);
  const items = likertModules[id];
  return {
    questions: items.map((i) => ({ id: i.id, prompt: i.prompt, scale: i.scale })),
    answers: Object.fromEntries(items.filter((i) => answers[i.id] !== undefined).map((i) => [i.id, answers[i.id]!])),
  };
}

export async function getCognitive() {
  const u = await requireUser();
  const games = await loadGames(u.id);
  const answered = new Set(games.map((g) => g.itemId));
  return GAME_DEFS.map((g) => ({
    ...g,
    items: publicItems(g.id).filter((i) => !answered.has(i.id)),
    total: gameItems[g.id].length,
  }));
}

/* ------------------------------------------------------------ norms ------- */

type Norms = { n: number; traits: Partial<Record<TraitKey, number[]>>; aptitudes: Record<string, number[]> };

/** Population scores for percentiles. Only computed once enough people have profiles. */
const getNorms = cache(async (): Promise<Norms> => {
  const db = await getDb();
  const [{ n } = { n: 0 }] = await db
    .select({ n: count() })
    .from(schema.moduleCompletions)
    .where(eq(schema.moduleCompletions.moduleId, "personality"));
  if (n < NORM_MIN_N) return { n, traits: {}, aptitudes: {} };
  const [resp, games] = await Promise.all([db.select().from(schema.responses), db.select().from(schema.cognitiveResponses)]);
  const byUser = new Map<string, { a: Record<string, number>; g: GameResponse[] }>();
  for (const r of resp) {
    const e = byUser.get(r.userId) ?? { a: {}, g: [] };
    e.a[r.itemId] = r.value;
    byUser.set(r.userId, e);
  }
  for (const g of games) {
    const e = byUser.get(g.userId) ?? { a: {}, g: [] };
    e.g.push(g);
    byUser.set(g.userId, e);
  }
  const norms: Norms = { n, traits: {}, aptitudes: {} };
  for (const { a, g } of byUser.values()) {
    const s = scoreProfile(a, g);
    for (const [k, v] of Object.entries(s.traits)) (norms.traits[k as TraitKey] ??= []).push(v.value);
    for (const [k, v] of Object.entries(s.aptitudes)) (norms.aptitudes[k] ??= []).push(v.value);
  }
  return norms;
});

function withNorm(score: ScoredScale, population: number[] | undefined) {
  if (!population || population.length < NORM_MIN_N) return { value: score.value, ci: score.ci };
  return { value: score.value, ci: score.ci, median: medianOf(population), percentile: percentileOf(score.value, population) };
}

/* ------------------------------------------------------------ profile ----- */

const APTITUDE_META = [
  { id: "verbal", label: "Verbal reasoning", note: "Analogies between pairs of words." },
  { id: "numerical", label: "Numerical reasoning", note: "Continuing number series." },
  { id: "pattern", label: "Pattern reasoning", note: "Completing 3×3 shape matrices." },
  { id: "speed", label: "Processing speed", note: "Share of the time limit left on correct answers." },
] as const;

export async function getProfile(): Promise<Profile> {
  const [user, scores, norms, modules] = await Promise.all([getUser(), getScores(), getNorms(), getModules()]);
  const u = await requireUser();
  const completions = await loadCompletions(u.id);
  const issued = completions.map((c) => c.completedAt).sort((a, b) => b.getTime() - a.getTime())[0];

  const riasec =
    Object.keys(scores.riasec).length === 6
      ? (["R", "I", "A", "S", "E", "C"] as RiasecKey[]).map((k) => ({ key: k, label: riasecLabel[k], score: { value: scores.riasec[k]!.value, ci: scores.riasec[k]!.ci } }))
      : [];
  const traits =
    Object.keys(scores.traits).length === 5
      ? (["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as TraitKey[]).map((k) => ({
          key: k,
          label: traitLabel[k],
          score: withNorm(scores.traits[k]!, norms.traits[k]),
          interpretation: interpret(k, scores.traits[k]!.value),
        }))
      : [];
  const aptitudes = APTITUDE_META.filter((a) => scores.aptitudes[a.id]).map((a) => ({
    id: a.id,
    label: a.label,
    note: a.note,
    complete: true,
    score: withNorm(scores.aptitudes[a.id]!, norms.aptitudes[a.id]),
  }));
  const values = (scores.values ?? []).map((v) => {
    const def = VALUE_DEFS.find((d) => d.id === v.id)!;
    return { id: v.id, label: def.label, description: def.description, rank: v.rank, weight: v.weight };
  });
  const pending: string[] = [];
  for (const m of modules) {
    if (m.status === "complete") continue;
    if (m.parts) for (const p of m.parts) if (p.status !== "complete") pending.push(`${p.title} (cognitive game)`);
    if (!m.parts) pending.push(`${m.title} (${m.answered}/${m.items} answered)`);
  }
  return {
    userId: user.id,
    reportId: user.reportId,
    issuedOn: issued ? isoDate(issued) : getToday(),
    version: "Profile v1 · items v1",
    summary: summarise(scores),
    riasec,
    traits,
    aptitudes,
    values,
    limitations: LIMITATIONS,
    pending,
    normN: norms.n,
  };
}

/* -------------------------------------------------------------- lanes ----- */

/** Other people's completed sprints per lane (never including the current user). */
const getSimilar = cache(async (userId: string): Promise<SimilarStats> => {
  const db = await getDb();
  const rows = await db
    .select({ laneId: schema.sprints.laneId, userId: schema.sprints.userId, wants: schema.sprints.wantsToContinue })
    .from(schema.sprints)
    .where(and(eq(schema.sprints.status, "completed"), ne(schema.sprints.userId, userId)));
  const out: SimilarStats = {};
  const by = new Map<string, { users: Set<string>; yes: number; total: number }>();
  for (const r of rows) {
    const e = by.get(r.laneId) ?? { users: new Set(), yes: 0, total: 0 };
    e.users.add(r.userId);
    e.total++;
    if (r.wants) e.yes++;
    by.set(r.laneId, e);
  }
  for (const [laneId, e] of by) out[laneId] = { n: e.users.size, continuedPct: e.users.size >= 10 ? Math.round((e.yes / e.total) * 100) : null };
  return out;
});

/** The user's Lane Map, or null until interests and personality are complete. */
export const getLanes = cache(async (): Promise<Lane[] | null> => {
  const u = await requireUser();
  const scores = await getScores();
  if (!canRankLanes(scores)) return null;
  return computeLanes(scores, await getSimilar(u.id));
});

/* ------------------------------------------------------------ sprints ----- */

const loadSprints = cache(async (userId: string): Promise<Sprint[]> => {
  const db = await getDb();
  const recs = await db.select().from(schema.sprints).where(and(eq(schema.sprints.userId, userId), ne(schema.sprints.status, "abandoned")));
  if (recs.length === 0) return [];
  const ids = recs.map((r) => r.id);
  const [tasks, cis, logs] = await Promise.all([
    db.select().from(schema.sprintTasks).where(inArray(schema.sprintTasks.sprintId, ids)),
    db.select().from(schema.checkIns).where(inArray(schema.checkIns.sprintId, ids)),
    db.select().from(schema.logEntries).where(inArray(schema.logEntries.sprintId, ids)),
  ]);
  const today = getToday();
  const out: Sprint[] = [];
  for (const rec of recs) {
    const tpl = templateById(rec.templateId);
    if (!tpl) continue;
    const peers = rec.status === "completed" ? await peerPerformance(rec.templateId, userId) : [];
    out.push(
      buildSprint(
        rec as SprintRecord,
        tpl,
        new Set(tasks.filter((t) => t.sprintId === rec.id && t.done).map((t) => t.day)),
        cis.filter((c) => c.sprintId === rec.id).map((c): CheckIn => ({ day: c.day, energy: c.energy, flow: c.flow, continue: c.continue })),
        logs.filter((l) => l.sprintId === rec.id).map((l): LogEntry => ({ day: l.day, values: l.values, note: l.note ?? undefined })),
        today,
        peers,
      ),
    );
  }
  return out.sort((a, b) => (b.startedOn ?? "").localeCompare(a.startedOn ?? ""));
});

/** Final chart values from other people's completed runs of the same template. */
async function peerPerformance(templateId: string, userId: string): Promise<number[]> {
  const db = await getDb();
  const others = await db
    .select({ id: schema.sprints.id })
    .from(schema.sprints)
    .where(and(eq(schema.sprints.templateId, templateId), eq(schema.sprints.status, "completed"), ne(schema.sprints.userId, userId)));
  if (others.length < 10) return [];
  const tpl = templateById(templateId)!;
  const logs = await db.select().from(schema.logEntries).where(inArray(schema.logEntries.sprintId, others.map((o) => o.id)));
  return others
    .map((o) => {
      const last = logs.filter((l) => l.sprintId === o.id).sort((a, b) => b.day - a.day).map((l) => derive(tpl.chart, { day: l.day, values: l.values })).find((v) => v !== null);
      return last ?? null;
    })
    .filter((v): v is number => v !== null);
}

function suggestedFrom(lanes: Lane[] | null, tried: Set<string>): Sprint[] {
  if (!lanes) return [];
  return rankLanes(lanes, "fit")
    .filter((l) => !tried.has(l.id))
    .slice(0, 3)
    .map((l) => {
      const tpl = templateForLane(l.id);
      return {
        id: `template-${tpl.id}`,
        templateId: tpl.id,
        laneId: l.id,
        title: tpl.title,
        brief: tpl.brief,
        days: tpl.tasks.length,
        status: "suggested" as const,
        tasks: tpl.tasks.map(([title, detail], i) => ({ day: i + 1, title, detail, done: false })),
        checkIns: [],
        metrics: tpl.metrics,
        chart: tpl.chart,
        log: [],
      };
    });
}

export async function getSprints(): Promise<Sprint[]> {
  const u = await requireUser();
  const [mine, lanes] = await Promise.all([loadSprints(u.id), getLanes()]);
  return [...mine, ...suggestedFrom(lanes, new Set(mine.map((s) => s.laneId)))];
}

export async function getSprint(id: string): Promise<Sprint | undefined> {
  const u = await requireUser();
  if (id.startsWith("template-")) {
    const tpl = templateById(id.slice("template-".length));
    if (!tpl) return undefined;
    return {
      id,
      templateId: tpl.id,
      laneId: tpl.laneId,
      title: tpl.title,
      brief: tpl.brief,
      days: tpl.tasks.length,
      status: "suggested",
      tasks: tpl.tasks.map(([title, detail], i) => ({ day: i + 1, title, detail, done: false })),
      checkIns: [],
      metrics: tpl.metrics,
      chart: tpl.chart,
      log: [],
    };
  }
  return (await loadSprints(u.id)).find((s) => s.id === id);
}

export async function getActiveSprint(): Promise<Sprint | undefined> {
  const u = await requireUser();
  return (await loadSprints(u.id)).find((s) => s.status === "active");
}

export function getLaneName(laneId: string) {
  return laneMeta[laneId]?.name ?? laneId;
}

/* ----------------------------------------------------------- evidence ----- */

export async function getEvidence(): Promise<Evidence | null> {
  const u = await requireUser();
  const [lanes, completions, sprints] = await Promise.all([getLanes(), loadCompletions(u.id), loadSprints(u.id)]);
  const db = await getDb();
  const recs = await db.select().from(schema.sprints).where(eq(schema.sprints.userId, u.id));

  const events: EvidenceEvent[] = [];
  const titles: Record<string, string> = { interests: "Interests module completed", personality: "Personality module completed", cognitive: "Cognitive games completed", values: "Work values completed" };
  for (const c of completions) events.push({ id: `mc-${c.moduleId}`, date: isoDate(c.completedAt), kind: "assessment", title: titles[c.moduleId] ?? c.moduleId, detail: MODULE_META[c.moduleId]?.instrument ?? "" });

  const profileReady = ["interests", "personality"].every((m) => completions.some((c) => c.moduleId === m))
    ? completions.filter((c) => ["interests", "personality"].includes(c.moduleId)).map((c) => isoDate(c.completedAt)).sort().pop()!
    : null;
  if (profileReady) events.push({ id: "lane-map", date: profileReady, kind: "outcome", title: "First Lane Map ready", detail: "Ranked from interests and personality" });

  for (const s of sprints) {
    const name = getLaneName(s.laneId);
    events.push({ id: `ss-${s.id}`, date: s.startedOn!, kind: "sprint-start", title: `Sprint started: ${s.title}`, detail: `${name} · ${s.days} days`, laneId: s.laneId });
    const rec = recs.find((r) => r.id === s.id);
    if (s.status === "completed" && rec?.completedAt) {
      const rate = s.outcome?.improvementRate;
      events.push({
        id: `se-${s.id}`,
        date: isoDate(rec.completedAt),
        kind: "sprint-end",
        title: `Sprint completed: ${s.title}`,
        detail: `${rate !== null && rate !== undefined ? `Improvement ${rate > 0 ? "+" : ""}${rate}% · ` : ""}${rec.wantsToContinue ? "wants to continue" : "does not want to continue"}`,
        laneId: s.laneId,
      });
    }
    for (const c of s.checkIns) {
      if (c.continue >= 7 || c.energy <= 2) {
        events.push({
          id: `ci-${s.id}-${c.day}`,
          date: addDays(s.startedOn!, c.day - 1),
          kind: "check-in",
          title: c.continue >= 7 ? "Strong wish to continue" : "Low-energy check-in",
          detail: `Day ${c.day} · energy ${c.energy}/7 · continue ${c.continue}/7`,
          laneId: s.laneId,
        });
      }
    }
  }

  if (!lanes) return events.length ? { headline: "Finish the assessment to start building evidence.", confidence: "low", events, conviction: [] } : null;

  // Conviction series: one point per evidence date, carried forward where nothing changed.
  const tried = [...new Set(sprints.map((s) => s.laneId))];
  const start = profileReady ?? getToday();
  const dates = [...new Set([start, ...sprints.flatMap((s) => {
    const rec = recs.find((r) => r.id === s.id);
    const lastCheckIn = s.checkIns.length ? addDays(s.startedOn!, s.checkIns[s.checkIns.length - 1]!.day - 1) : null;
    return [s.startedOn!, rec?.completedAt ? isoDate(rec.completedAt) : lastCheckIn].filter((d): d is string => !!d);
  })])].filter((d) => d >= start).sort();

  const series: ConvictionSeries[] = tried.map((laneId) => {
    const prior = lanes.find((l) => l.id === laneId)?.relativeFit.value ?? 50;
    return {
      laneId,
      points: dates.map((date) => {
        const ev = sprints
          .filter((s) => s.laneId === laneId && (s.startedOn ?? "") <= date)
          .map((s) => {
            const rec = recs.find((r) => r.id === s.id);
            const doneBy = rec?.completedAt ? isoDate(rec.completedAt) <= date : false;
            // Only count check-ins up to this date.
            const cis = s.checkIns.filter((c) => addDays(s.startedOn!, c.day - 1) <= date);
            const view: Sprint = { ...s, status: doneBy ? "completed" : "active", checkIns: cis, currentDay: cis.length ? cis[cis.length - 1]!.day : 1 };
            return sprintEvidence(view, doneBy ? (rec?.wantsToContinue ?? null) : null);
          })
          .filter((e): e is NonNullable<typeof e> => e !== null);
        const c = conviction(prior, ev);
        return { date, value: c.value, ci: c.ci };
      }),
    };
  });

  const latest = series
    .map((s) => ({ laneId: s.laneId, score: s.points[s.points.length - 1]! }))
    .sort((a, b) => b.score.value - a.score.value);
  let headline: string;
  let confidence: Evidence["confidence"] = "low";
  if (latest.length === 0) {
    const top = rankLanes(lanes, "fit").slice(0, 2).map((l) => l.name);
    headline = `No sprint evidence yet. Your profile ranks ${top.join(" and ")} highest; a sprint is the next step.`;
  } else {
    const strong = latest.filter((l) => l.score.value >= 55).slice(0, 2).map((l) => getLaneName(l.laneId));
    headline = strong.length
      ? `Your strongest evidence points to ${strong.join(" and ")}.`
      : `None of the lanes you've tried has strong evidence yet. Highest so far: ${getLaneName(latest[0]!.laneId)}.`;
    confidence = confidenceFromCi({ value: latest[0]!.score.value, ci: latest[0]!.score.ci });
  }
  return { headline, confidence, events, conviction: series };
}

/* -------------------------------------------------------------- export ---- */

export async function getExport() {
  const u = await requireUser();
  const db = await getDb();
  const [user, profile, answers, games, sprints, completions] = await Promise.all([
    getUser(),
    db.select().from(schema.profiles).where(eq(schema.profiles.userId, u.id)),
    loadAnswers(u.id),
    loadGames(u.id),
    loadSprints(u.id),
    loadCompletions(u.id),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    itemBank: "lane-items-v1",
    user: { name: user.name, email: user.email, memberSince: user.memberSince, reportId: user.reportId },
    onboarding: profile[0] ?? null,
    answers,
    cognitive: games,
    moduleCompletions: completions,
    scores: await getScores(),
    sprints,
  };
}
