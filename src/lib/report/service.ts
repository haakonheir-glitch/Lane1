/**
 * Stored written reports: reuse the latest one while the scores are unchanged, otherwise write
 * a new one (PLAN D49). Server only.
 */
import "server-only";
import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { ReportFacts } from "./facts";
import type { WrittenReport } from "./schema";
import { writeReport } from "./generate";

/** Bump when the report's instructions or shape change, so stored reports are written again. */
export const REPORT_FORMAT = 3;

export const factsHash = (facts: ReportFacts) => createHash("sha256").update(`${REPORT_FORMAT}:${JSON.stringify(facts)}`).digest("hex");

export type StoredReport = { report: WrittenReport; model: string; createdAt: Date; factsHash: string };

export async function latestReport(userId: string): Promise<StoredReport | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.profileReports).where(eq(schema.profileReports.userId, userId)).orderBy(desc(schema.profileReports.createdAt)).limit(1);
  return row ? { report: row.report as WrittenReport, model: row.model, createdAt: row.createdAt, factsHash: row.factsHash } : null;
}

/** Returns the stored report for these exact facts, or writes and stores a new one. */
export async function reportFor(userId: string, facts: ReportFacts, write: typeof writeReport = writeReport): Promise<StoredReport & { reused: boolean }> {
  const hash = factsHash(facts);
  const existing = await latestReport(userId);
  if (existing?.factsHash === hash) return { ...existing, reused: true };
  const { report, model } = await write(facts);
  const db = await getDb();
  const [row] = await db
    .insert(schema.profileReports)
    .values({ userId, factsHash: hash, facts, report, model, consentedAt: new Date() })
    .returning({ createdAt: schema.profileReports.createdAt });
  return { report, model, createdAt: row!.createdAt, factsHash: hash, reused: false };
}
