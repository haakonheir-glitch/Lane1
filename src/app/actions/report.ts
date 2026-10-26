"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getReportFacts } from "@/lib/data";
import { ReportError } from "@/lib/report/generate";
import { latestReport, reportFor } from "@/lib/report/service";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

/** Writes the person's report with Claude (or reuses it if their scores haven't changed). */
export async function writeMyReport(consent: boolean): Promise<{ ok: true; reused: boolean } | { ok: false; error: string }> {
  const user = await requireUser();
  if (consent !== true) return { ok: false, error: "Tick the box to agree to sending your scores to Anthropic first." };
  const facts = await getReportFacts();
  if (!facts) return { ok: false, error: "Complete session S1 or S2 first: the report is written from your scores." };
  try {
    const r = await reportFor(user.id, facts);
    revalidatePath("/profile");
    return { ok: true, reused: r.reused };
  } catch (e) {
    if (e instanceof ReportError) return { ok: false, error: e.message };
    console.error("writeMyReport failed", e);
    return { ok: false, error: "Something went wrong while writing the report. Try again." };
  }
}

/**
 * Rewrites the report when the scores have changed, without a new click. Only for people who
 * already consented by writing a report: that stored report is the consent on record. Withdrawn
 * with stopReportUpdates.
 */
export async function refreshMyReport(): Promise<{ ok: true; reused: boolean } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!(await latestReport(user.id))) return { ok: false, error: "No consent on record: write your report first." };
  const facts = await getReportFacts();
  if (!facts) return { ok: false, error: "No scores to write from yet." };
  try {
    const r = await reportFor(user.id, facts);
    revalidatePath("/profile");
    return { ok: true, reused: r.reused };
  } catch (e) {
    if (e instanceof ReportError) return { ok: false, error: e.message };
    console.error("refreshMyReport failed", e);
    return { ok: false, error: "The written report couldn't be updated just now." };
  }
}

/** Withdraws consent: deletes the person's written reports, so nothing is sent again until they ask. */
export async function stopReportUpdates(): Promise<{ ok: true }> {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(schema.profileReports).where(eq(schema.profileReports.userId, user.id));
  revalidatePath("/profile");
  revalidatePath("/settings");
  return { ok: true };
}
