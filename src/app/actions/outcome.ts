"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLane, getRole } from "@/lib/taxonomy";
import { dueWave, type Wave } from "@/lib/outcome";

type Result = { ok: true } | { ok: false; error: string };

const revalidate = () => {
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/check-in");
};

/** Opts in to the outcome check-in (two questions in 6 and 12 months). Only an explicit yes is stored. */
export async function setOutcomeConsent(consent: boolean): Promise<Result> {
  const user = await requireUser();
  if (consent !== true) return { ok: false, error: "Tick the box to opt in first." };
  const db = await getDb();
  await db.insert(schema.outcomeConsents).values({ userId: user.id, consentedAt: new Date() }).onConflictDoNothing();
  revalidate();
  return { ok: true };
}

/** Withdraws consent: deletes the consent and any check-in answers, so nothing more is asked. */
export async function withdrawOutcomeConsent(): Promise<Result> {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(schema.outcomeCheckIns).where(eq(schema.outcomeCheckIns.userId, user.id));
  await db.delete(schema.outcomeConsents).where(eq(schema.outcomeConsents.userId, user.id));
  revalidate();
  return { ok: true };
}

const answer = z.object({
  wave: z.enum(["6m", "12m"]),
  /** The job-title search's pick, as onboarding stores it; null = not working right now. */
  current: z.object({ laneId: z.string().max(80), roleId: z.string().max(160).nullable(), title: z.string().min(1).max(120) }).nullable(),
  fulfilment: z.number().int().min(1).max(7),
});

/** Saves one check-in answer, only for the wave that is due now and only with consent on record. */
export async function saveOutcomeCheckIn(input: z.input<typeof answer>): Promise<Result> {
  const user = await requireUser();
  const parsed = answer.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Answer both questions first." };
  const a = parsed.data;
  if (a.current && (!getLane(a.current.laneId) || (a.current.roleId && getRole(a.current.roleId)?.lane.id !== a.current.laneId))) return { ok: false, error: "Pick a job title from the list." };
  const db = await getDb();
  const [consent] = await db.select().from(schema.outcomeConsents).where(eq(schema.outcomeConsents.userId, user.id)).limit(1);
  if (!consent) return { ok: false, error: "You haven't opted in to check-ins." };
  const answered = (await db.select({ wave: schema.outcomeCheckIns.wave }).from(schema.outcomeCheckIns).where(eq(schema.outcomeCheckIns.userId, user.id))).map((r) => r.wave as Wave);
  if (dueWave(consent.consentedAt, answered) !== a.wave) return { ok: false, error: "This check-in isn't open right now." };
  await db
    .insert(schema.outcomeCheckIns)
    .values({ userId: user.id, wave: a.wave, laneId: a.current?.laneId ?? null, roleId: a.current?.roleId ?? null, title: a.current?.title ?? null, fulfilment: a.fulfilment })
    .onConflictDoNothing();
  // A double submit inserts nothing the second time; either way the stored answer is there.
  const [row] = await db.select().from(schema.outcomeCheckIns).where(and(eq(schema.outcomeCheckIns.userId, user.id), eq(schema.outcomeCheckIns.wave, a.wave))).limit(1);
  revalidate();
  return row ? { ok: true } : { ok: false, error: "The answer couldn't be saved. Try again." };
}
