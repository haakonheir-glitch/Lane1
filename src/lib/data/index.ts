/**
 * Data access — the seam between pages and storage.
 *
 * Real (database):  user, onboarding, assessment progress, the person's own profile and Lane Map
 *   (scored relative to themselves until population norms exist, PLAN D48), export.
 * Sample (/lib/mock): the profile shown before S1/S2 are done (PLAN D18).
 */
import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { requireUser } from "../auth";
import * as mock from "../mock";
import { hubStatus, rescoreIfStale, stepsFor } from "../assess/service";
import { allSessions, sessionPlan } from "../bank/bank";
import { buildProfile, SCORING_VERSION, type ProfileScores, type SessionScores } from "../scoring/profile";
import { addSelfScores } from "../scoring/self";
import type { SessionId } from "../bank/types";
import type { YearsBand } from "../matching";
import type { OnboardingAnswers, User } from "../types";
import { buildCareerPicks, buildLaneDetail, buildLaneMap, laneName, reportLanes } from "./lanes";
import { buildReportFacts, type ReportFacts } from "../report/facts";
import { factsHash, latestReport } from "../report/service";
import { BRAND } from "../brand";
import { LANES } from "../taxonomy";
import type { CareerPick } from "../lanes/types";
import type { Effort } from "./effort";
export { effortLine, type Effort } from "./effort";

const TIME_ZONE = process.env.APP_TIMEZONE ?? "Europe/Oslo";
const isoDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Today's date (YYYY-MM-DD) in the app's time zone. */
export function getToday(): string {
  return isoDate(new Date());
}

/* ---------------------------------------------------------------- real ---- */

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

/** What the person told us about their work, for lane entry points and the Lane Map. */
export type ExperienceAnswers = {
  current: { roleId: string | null; laneId: string; title: string; years: YearsBand | null } | null;
  considering: { laneId: string; roleId: string | null; title: string }[];
};

export const getExperience = cache(async (): Promise<ExperienceAnswers> => {
  const u = await requireUser();
  const db = await getDb();
  const [p] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, u.id)).limit(1);
  return {
    current: p?.currentLaneId
      ? { roleId: p.currentRoleId, laneId: p.currentLaneId, title: p.currentTitle ?? "", years: (p.currentYears as YearsBand | null) ?? null }
      : null,
    considering: p?.considering ?? [],
  };
});

export type HubSession = Awaited<ReturnType<typeof getAssessmentHub>>[number];

/** Sessions S1–S5 with the user's progress, for the /assess hub. */
export async function getAssessmentHub() {
  const u = await requireUser();
  const status = await hubStatus(u.id);
  return allSessions().map((s) => ({
    id: s.id,
    title: s.title,
    minutes: s.minutes,
    unlocks: s.unlocks,
    blocks: s.blocks.filter((b) => b.kind !== "env_check" && b.kind !== "effort").map((b) => ({ title: b.title, experimental: b.status === "experimental" })),
    precheck: s.blocks.some((b) => b.kind === "env_check"),
    ...status[s.id],
  }));
}

export async function getSessionMeta(id: string) {
  return allSessions().find((s) => s.id === id);
}

/* -------------------------------------------------------------- sample ---- */

export const getSampleUser = async (): Promise<User> => mock.user;

/**
 * The signed-in person's own profile, built from their latest completed attempt of each
 * session (discarded attempts are skipped), with scores relative to themselves added.
 * Null until S1 or S2 is complete.
 */
/**
 * What a person's profile is built from: their completed session rows. Results are cached under
 * this fingerprint (with the scoring version), so a new or retaken session is a new key and is
 * never served stale. One small query per request instead of rebuilding everything.
 */
const profileFingerprint = cache(async (userId: string) => {
  const db = await getDb();
  const rows = await db
    .select({ id: schema.assessmentSessions.id, at: schema.assessmentSessions.completedAt })
    .from(schema.assessmentSessions)
    .where(and(eq(schema.assessmentSessions.userId, userId), eq(schema.assessmentSessions.status, "completed")));
  return rows.map((r) => `${r.id}@${r.at?.getTime() ?? 0}`).sort().join(",");
});

async function buildMyProfile(userId: string): Promise<ProfileScores | null> {
  const db = await getDb();
  const rows = await db
    .select({ s: schema.assessmentSessions, scores: schema.sessionScores.scores })
    .from(schema.assessmentSessions)
    .innerJoin(schema.sessionScores, eq(schema.sessionScores.sessionRowId, schema.assessmentSessions.id))
    .where(and(eq(schema.assessmentSessions.userId, userId), eq(schema.assessmentSessions.status, "completed")));
  const scored: Parameters<typeof buildProfile>[0] = {};
  for (const { s, scores } of rows.sort((a, b) => a.s.attempt - b.s.attempt)) {
    const current = await rescoreIfStale(s.id, s.sessionId as SessionId, scores as SessionScores);
    scored[s.sessionId as SessionId] = { scores: current, completedAt: (s.completedAt ?? s.startedAt).toISOString() };
  }
  if (!scored.S1 && !scored.S2) return null;
  return addSelfScores(buildProfile(scored, "pending"));
}

/**
 * The signed-in person's own profile, built from their latest completed attempt of each
 * session (discarded attempts are skipped), with scores relative to themselves added.
 * Null until S1 or S2 is complete. Cached per completed-session fingerprint.
 */
export const getMyProfile = cache(async (): Promise<ProfileScores | null> => {
  const u = await requireUser();
  const fp = await profileFingerprint(u.id);
  if (!fp) return null;
  return unstable_cache(() => buildMyProfile(u.id), ["profile", u.id, fp, SCORING_VERSION], { tags: [`profile:${u.id}`], revalidate: 60 * 60 * 24 })();
});

/** The profile pages show: the person's own once they have one, otherwise the labelled sample. */
export const getProfileView = cache(async (): Promise<{ profile: ProfileScores; source: "own" | "sample" }> => {
  const own = await getMyProfile();
  return own ? { profile: own, source: "own" } : { profile: mock.sampleProfile, source: "sample" };
});
export const getProfile = async (): Promise<ProfileScores> => (await getProfileView()).profile;
export const getLaneName = laneName;

/** Lane Map rows and the open lane's detail, matched against the profile (sample until norms exist). */
/**
 * Matching results for the person: the map's rows and the picks. Cached under the profile
 * fingerprint and the job answers, since they are pure functions of those.
 */
const getMatching = cache(async () => {
  const [{ profile, source }, exp] = await Promise.all([getProfileView(), getExperience()]);
  const compute = () => Promise.resolve({ ...buildLaneMap(profile, exp), picks: buildCareerPicks(profile, exp) });
  if (source === "sample") return { source, profile, exp, ...(await compute()) };
  const u = await requireUser();
  const fp = await profileFingerprint(u.id);
  const data = await unstable_cache(compute, ["matching", u.id, fp, SCORING_VERSION, JSON.stringify(exp)], { tags: [`profile:${u.id}`], revalidate: 60 * 60 * 24 })();
  return { source, profile, exp, ...data };
});

export async function getLaneMap(selected?: string | null) {
  const { source, profile, exp, rows, vocab, picks } = await getMatching();
  return { source, rows, vocab, picks, detail: selected ? buildLaneDetail(selected, profile, exp) : null };
}

/** The best-fitting career paths overall (the Career map's top five), for the report. */
export const getTopCareerPaths = cache(async (): Promise<CareerPick[]> => (await getMatching()).picks.overall);

/* -------------------------------------------------------------- effort ---- */


const ANSWERED = new Set(["questionnaire", "qsort", "sjt", "ideas", "mixed", "effort"]);
const CAREER_PATHS = LANES.length;

/** What the full assessment asks of everyone, counted from the item bank. */
export function bankEffort(): Effort {
  const ids = allSessions().map((s) => s.id);
  return {
    sessions: ids.length,
    answers: ids.reduce((n, id) => n + stepsFor(id).filter((s) => ANSWERED.has(s.block.kind)).length, 0),
    tasks: ids.reduce((n, id) => n + sessionPlan(id).blocks.filter((b) => b.kind === "task").length, 0),
    trials: null,
    careerPaths: CAREER_PATHS,
  };
}

/** What this person actually did: their stored answers and trials in completed sessions. */
export const getEffort = cache(async (): Promise<Effort> => {
  const { source } = await getProfileView();
  if (source === "sample") return bankEffort();
  const u = await requireUser();
  const db = await getDb();
  const done = await db
    .select({ id: schema.assessmentSessions.id, sessionId: schema.assessmentSessions.sessionId })
    .from(schema.assessmentSessions)
    .where(and(eq(schema.assessmentSessions.userId, u.id), eq(schema.assessmentSessions.status, "completed")));
  const rows = done.map((d) => d.id);
  if (!rows.length) return { sessions: 0, answers: 0, tasks: 0, trials: 0, careerPaths: CAREER_PATHS };
  const [answers, trials] = await Promise.all([
    db.select({ k: schema.itemResponses.position }).from(schema.itemResponses).where(inArray(schema.itemResponses.sessionRowId, rows)),
    db
      .select({ k: schema.taskTrials.trialIndex })
      .from(schema.taskTrials)
      .where(and(inArray(schema.taskTrials.sessionRowId, rows), eq(schema.taskTrials.practice, false))),
  ]);
  const sessions = new Set(done.map((d) => d.sessionId));
  return {
    sessions: sessions.size,
    answers: answers.length,
    tasks: [...sessions].reduce((n, id) => n + sessionPlan(id as SessionId).blocks.filter((b) => b.kind === "task").length, 0),
    trials: trials.length,
    careerPaths: CAREER_PATHS,
  };
});


/** The facts a written report is built from: the person's own scores and lanes, no name or email. */
export async function getReportFacts(): Promise<ReportFacts | null> {
  const [profile, exp] = await Promise.all([getMyProfile(), getExperience()]);
  if (!profile) return null;
  return buildReportFacts(profile, reportLanes(profile, exp), {
    current: exp.current ? exp.current.title : null,
    considering: exp.considering.map((c) => c.title),
  });
}

/** The person's latest written report, and whether their scores have changed since. */
export async function getMyReport() {
  const u = await requireUser();
  const [stored, facts] = await Promise.all([latestReport(u.id), getReportFacts()]);
  if (!stored) return null;
  return { ...stored, stale: !!facts && factsHash(facts) !== stored.factsHash };
}


/* -------------------------------------------------------------- export ---- */

export async function getExport() {
  const u = await requireUser();
  const db = await getDb();
  const user = await getUser();
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, u.id));
  const sessions = await db.select().from(schema.assessmentSessions).where(eq(schema.assessmentSessions.userId, u.id));
  const out = [];
  for (const s of sessions) {
    const [responses, trials, scores] = await Promise.all([
      db.select().from(schema.itemResponses).where(eq(schema.itemResponses.sessionRowId, s.id)),
      db.select().from(schema.taskTrials).where(eq(schema.taskTrials.sessionRowId, s.id)),
      db.select().from(schema.sessionScores).where(eq(schema.sessionScores.sessionRowId, s.id)),
    ]);
    out.push({ ...s, responses, trials, scores: scores[0]?.scores ?? null });
  }
  return {
    exportedAt: new Date().toISOString(),
    assessmentPackage: `${BRAND.name} Assessment Package v0.1`,
    user: { name: user.name, email: user.email, memberSince: user.memberSince, reportId: user.reportId },
    onboarding: profile ?? null,
    sessions: out,
    writtenReports: await db.select().from(schema.profileReports).where(eq(schema.profileReports.userId, u.id)),
  };
}
