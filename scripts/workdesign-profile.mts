/**
 * Read-only: prints the person-side Work Design profile (value modes and environment dimensions,
 * with standard errors) for one account, found by its report ID (or email). Writes nothing.
 *
 *   npx tsx --conditions=react-server scripts/workdesign-profile.mts LN-20261023-H2C          local
 *   DATABASE_URL=… npx tsx --conditions=react-server scripts/workdesign-profile.mts LN-… --force   hosted
 */
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db";
import { buildProfile, type SessionScores } from "../src/lib/scoring/profile";
import { addSelfScores } from "../src/lib/scoring/self";
import type { SessionId } from "../src/lib/bank/types";
import { personWorkDesign } from "../src/lib/workdesign/person";

const reportId = process.argv[2];
if (!reportId) throw new Error("Usage: workdesign-profile.mts <report ID>");
if (process.env.DATABASE_URL && !process.argv.includes("--force")) {
  console.error("DATABASE_URL is set. Re-run with --force to read a hosted database (read-only).");
  process.exit(1);
}
const db = await getDb();
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
const wd = personWorkDesign(addSelfScores(buildProfile(scored, "pending")));
const f = (v: number | null, se: number | null) => (v === null ? "not measured" : `${v.toFixed(0).padStart(3)} ± ${se!.toFixed(1)} (90%: ${Math.max(0, v - 1.645 * se!).toFixed(0)}–${Math.min(100, v + 1.645 * se!).toFixed(0)})`);
console.log(`Work Design profile ${wd.version} for ${reportId} · sessions ${Object.keys(scored).sort().join(", ")}`);
console.log("\nValue modes (0–100, SE, 90% range; relative = BLUEPRINT reliability rule)");
for (const m of wd.valueModes) console.log(`  ${`${m.name} (${m.archetype})`.padEnd(24)} ${f(m.value, m.se)}  ${m.relative}  coverage ${(m.coverage * 100).toFixed(0)}%`);
console.log("\nEnvironment dimensions");
for (const e of wd.environment) console.log(`  ${e.name.padEnd(36)} ${f(e.value, e.se)}  coverage ${(e.coverage * 100).toFixed(0)}%`);
console.log(`\nInseparable by design (shared inputs): ${wd.inseparable.map((p) => p.join(" + ")).join(", ")}`);
process.exit(0);
