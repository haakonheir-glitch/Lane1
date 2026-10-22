/**
 * Data access — the seam between pages and storage.
 *
 * Real (database):  user, onboarding, assessment progress, the person's own profile and Lane Map
 *   (scored relative to themselves until population norms exist, PLAN D48), export.
 * Sample (/lib/mock): the profile shown before S1/S2 are done, sprints, evidence (PLAN D18).
 */
import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { requireUser } from "../auth";
import * as mock from "../mock";
import { hubStatus } from "../assess/service";
import { allSessions } from "../bank/bank";
import { buildProfile, type ProfileScores, type SessionScores } from "../scoring/profile";
import { addSelfScores } from "../scoring/self";
import type { SessionId } from "../bank/types";
import type { YearsBand } from "../matching";
import type { Evidence, OnboardingAnswers, Sprint, User } from "../types";
import { buildLaneDetail, buildLaneMap, buildLanePlan, laneName, reportLanes, withKind } from "./lanes";
import { buildReportFacts, type ReportFacts } from "../report/facts";
import { factsHash, latestReport } from "../report/service";

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
export const getMyProfile = cache(async (): Promise<ProfileScores | null> => {
  const u = await requireUser();
  const db = await getDb();
  const rows = await db
    .select({ s: schema.assessmentSessions, scores: schema.sessionScores.scores })
    .from(schema.assessmentSessions)
    .innerJoin(schema.sessionScores, eq(schema.sessionScores.sessionRowId, schema.assessmentSessions.id))
    .where(and(eq(schema.assessmentSessions.userId, u.id), eq(schema.assessmentSessions.status, "completed")));
  const scored: Parameters<typeof buildProfile>[0] = {};
  for (const { s, scores } of rows.sort((a, b) => a.s.attempt - b.s.attempt)) {
    scored[s.sessionId as SessionId] = { scores: scores as SessionScores, completedAt: (s.completedAt ?? s.startedAt).toISOString() };
  }
  if (!scored.S1 && !scored.S2) return null;
  return addSelfScores(buildProfile(scored, "pending"));
});

/** The profile pages show: the person's own once they have one, otherwise the labelled sample. */
export const getProfileView = cache(async (): Promise<{ profile: ProfileScores; source: "own" | "sample" }> => {
  const own = await getMyProfile();
  return own ? { profile: own, source: "own" } : { profile: mock.sampleProfile, source: "sample" };
});
export const getProfile = async (): Promise<ProfileScores> => (await getProfileView()).profile;
export const getSprints = async (): Promise<Sprint[]> => mock.sprints.map((s) => withKind(structuredClone(s)));
export const getSprint = async (id: string): Promise<Sprint | undefined> => (await getSprints()).find((s) => s.id === id);
export const getEvidence = async (): Promise<Evidence> => structuredClone(mock.evidence);
export const getLaneName = laneName;

/** Lane Map rows and the open lane's detail, matched against the profile (sample until norms exist). */
export async function getLaneMap(selected?: string | null) {
  const [{ profile, source }, exp, sprints] = await Promise.all([getProfileView(), getExperience(), getSprints()]);
  return {
    source,
    ...buildLaneMap(profile, exp),
    detail: selected ? buildLaneDetail(selected, profile, exp, sprints) : null,
  };
}

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

export async function getLanePlan(id: string) {
  return buildLanePlan(id, await getExperience());
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
    assessmentPackage: "Lane Assessment Package v0.1",
    user: { name: user.name, email: user.email, memberSince: user.memberSince, reportId: user.reportId },
    onboarding: profile ?? null,
    sessions: out,
    writtenReports: await db.select().from(schema.profileReports).where(eq(schema.profileReports.userId, u.id)),
  };
}
