"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getAssessmentHub, getProfileView, getTopCareerPaths } from "@/lib/data";
import { keyFigures, type KeyFigure } from "@/lib/view/findings";
import { markInput, type MarkInput } from "@/lib/view/mark";
import { REVEALED_COOKIE } from "@/lib/reveal";


/**
 * Compiling the report, step by step, for the reveal screen: each call does the real work of its
 * step and returns when it is done. Nothing waits on a timer.
 */
export async function compileStep(step: "scores" | "matches"): Promise<{ ok: boolean }> {
  await requireUser();
  if (step === "scores") {
    const { source } = await getProfileView();
    return { ok: source === "own" };
  }
  const picks = await getTopCareerPaths();
  return { ok: picks.length > 0 };
}

/** Marks the reveal as played, so later visits open the report directly. */
export async function markRevealed(): Promise<void> {
  const u = await requireUser();
  (await cookies()).set(REVEALED_COOKIE, u.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
}

export type OutroPreview = { mark: MarkInput; figures: KeyFigure[]; next: { id: string; title: string; minutes: number } | null; complete: boolean };

/** What a just-finished session added: the partial mark and headline figures, and the next session. */
export async function outroPreview(): Promise<OutroPreview | null> {
  await requireUser();
  const [{ profile, source }, hub] = await Promise.all([getProfileView(), getAssessmentHub()]);
  const next = hub.find((s) => s.status !== "completed");
  return {
    mark: source === "own" ? markInput(profile) : { riasec: [null, null, null, null, null, null], domains: [null, null, null, null, null], reasoning: null, topValue: null },
    figures: source === "own" ? keyFigures(profile) : [],
    next: next ? { id: next.id, title: next.title, minutes: next.minutes } : null,
    complete: !next,
  };
}
