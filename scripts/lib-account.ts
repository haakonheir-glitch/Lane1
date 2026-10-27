/**
 * Loads one account's scored profile by report ID (or email), read-only, for the Work Design and
 * matching scripts. Refuses a hosted database (DATABASE_URL) unless --force is given.
 */
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db";
import { buildProfile, type SessionScores } from "../src/lib/scoring/profile";
import { addSelfScores } from "../src/lib/scoring/self";
import type { SessionId } from "../src/lib/bank/types";

export async function loadAccountProfile(reportId: string) {
  if (process.env.DATABASE_URL && !process.argv.includes("--force")) {
    console.error("DATABASE_URL is set. Re-run with --force to read a hosted database (read-only).");
    process.exit(1);
  }
  const db = await getDb();
  // Which database this is, without credentials: a missing DATABASE_URL means the local dev database.
  console.log(`Database: ${process.env.DATABASE_URL ? `hosted database at ${new URL(process.env.DATABASE_URL).host}` : "LOCAL dev database (.data/pglite), not production: DATABASE_URL is not set"}`);
  const iso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE ?? "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const users = await db.select().from(schema.users);
  const idOf = (u: (typeof users)[number]) => {
    const initials = u.name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).slice(0, 2).join("") || "?";
    return `LN-${iso(u.createdAt).replaceAll("-", "")}-${initials}${u.id.slice(0, 2).toUpperCase()}`;
  };
  const u = users.find((x) => idOf(x) === reportId || x.email === reportId);
  if (!u) {
    console.error(`No account with report ID ${reportId} in this database (${users.length} accounts).`);
    process.exit(2);
  }
  const rows = await db
    .select({ s: schema.assessmentSessions, scores: schema.sessionScores.scores })
    .from(schema.assessmentSessions)
    .innerJoin(schema.sessionScores, eq(schema.sessionScores.sessionRowId, schema.assessmentSessions.id))
    .where(and(eq(schema.assessmentSessions.userId, u.id), eq(schema.assessmentSessions.status, "completed")));
  const scored: Parameters<typeof buildProfile>[0] = {};
  for (const { s, scores } of rows.sort((a, b) => a.s.attempt - b.s.attempt)) scored[s.sessionId as SessionId] = { scores: scores as SessionScores, completedAt: (s.completedAt ?? s.startedAt).toISOString() };
  return { profile: addSelfScores(buildProfile(scored, "pending")), sessions: Object.keys(scored).sort() };
}
