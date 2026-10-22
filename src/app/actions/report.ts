"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getReportFacts } from "@/lib/data";
import { ReportError } from "@/lib/report/generate";
import { reportFor } from "@/lib/report/service";

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
