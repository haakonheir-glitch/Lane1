"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLane, getRole } from "@/lib/taxonomy";

const picked = z.object({ laneId: z.string().max(80), roleId: z.string().max(160).nullable(), title: z.string().min(1).max(120) });

/** "How satisfied are you in this work?", 1 (not at all) – 7 (completely). Ground truth only; never used in matching. */
const satisfaction = z.number().int().min(1).max(7);

const onboardingSchema = z.object({
  ageRange: z.string().max(40),
  situation: z.string().max(80),
  clarityGoal: z.string().max(120),
  current: picked.extend({ years: z.enum(["0", "lt2", "2to5", "5plus"]).nullable(), satisfaction: satisfaction.nullable().optional() }).nullable(),
  considering: z.array(picked).max(3),
  /** Up to two previous jobs, each with the same satisfaction question. Optional. */
  previous: z.array(picked.extend({ satisfaction })).max(2).optional(),
  /** "Open to faith-based work" (optional): belief-gated career paths are suggested only when true. */
  openToFaith: z.boolean().optional(),
});

/** A picked title must point at a real lane, and its role (if any) must belong to that lane. */
function checkPick(p: z.infer<typeof picked>) {
  if (!getLane(p.laneId)) throw new Error(`Unknown lane ${p.laneId}`);
  if (p.roleId && getRole(p.roleId)?.lane.id !== p.laneId) throw new Error(`Role ${p.roleId} is not in lane ${p.laneId}`);
}

export async function saveOnboarding(input: z.input<typeof onboardingSchema>) {
  const user = await requireUser();
  const data = onboardingSchema.parse(input);
  if (data.current) checkPick(data.current);
  data.considering.forEach(checkPick);
  (data.previous ?? []).forEach(checkPick);
  const row = {
    ageRange: data.ageRange,
    situation: data.situation,
    clarityGoal: data.clarityGoal,
    currentLaneId: data.current?.laneId ?? null,
    currentRoleId: data.current?.roleId ?? null,
    currentTitle: data.current?.title ?? null,
    currentYears: data.current?.years ?? null,
    considering: data.considering,
    currentSatisfaction: data.current?.satisfaction ?? null,
    previousJobs: data.previous ?? [],
    openToFaith: data.openToFaith ?? false,
    onboardedAt: new Date(),
  };
  const db = await getDb();
  await db.insert(schema.profiles).values({ userId: user.id, ...row }).onConflictDoUpdate({ target: schema.profiles.userId, set: row });
  revalidatePath("/", "layout");
  redirect("/assess");
}
