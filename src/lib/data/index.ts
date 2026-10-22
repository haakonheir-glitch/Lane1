/**
 * Data access — the seam between pages and storage.
 *
 * Real (database):  user, onboarding, assessment progress, export.
 * Sample (/lib/mock): profile results, lanes, sprints, evidence. These stay on sample data until
 *   norms are in place (PLAN.md D1/D2/D18). The sample profile has the exact ProfileScores shape,
 *   so switching getProfile() to real scores is a one-line change.
 */
import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import { requireUser } from "../auth";
import * as mock from "../mock";
import { hubStatus } from "../assess/service";
import { allSessions } from "../bank/bank";
import type { ProfileScores } from "../scoring/profile";
import type { YearsBand } from "../matching";
import type { Evidence, OnboardingAnswers, Sprint, User } from "../types";
import { buildLaneDetail, buildLaneMap, buildLanePlan, laneName, withKind } from "./lanes";

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

export const getProfile = async (): Promise<ProfileScores> => mock.sampleProfile;
export const getSampleUser = async (): Promise<User> => mock.user;
export const getSprints = async (): Promise<Sprint[]> => mock.sprints.map((s) => withKind(structuredClone(s)));
export const getSprint = async (id: string): Promise<Sprint | undefined> => (await getSprints()).find((s) => s.id === id);
export const getEvidence = async (): Promise<Evidence> => structuredClone(mock.evidence);
export const getLaneName = laneName;

/** Lane Map rows and the open lane's detail, matched against the profile (sample until norms exist). */
export async function getLaneMap(selected?: string | null) {
  const [profile, exp, sprints] = await Promise.all([getProfile(), getExperience(), getSprints()]);
  return {
    ...buildLaneMap(profile, exp),
    detail: selected ? buildLaneDetail(selected, profile, exp, sprints) : null,
  };
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
  };
}
