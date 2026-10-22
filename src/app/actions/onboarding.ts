"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLane, getRole } from "@/lib/taxonomy";

const picked = z.object({ laneId: z.string().max(80), roleId: z.string().max(160).nullable(), title: z.string().min(1).max(120) });

const onboardingSchema = z.object({
  ageRange: z.string().max(40),
  situation: z.string().max(80),
  clarityGoal: z.string().max(120),
  current: picked.extend({ years: z.enum(["0", "lt2", "2to5", "5plus"]).nullable() }).nullable(),
  considering: z.array(picked).max(3),
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
  const row = {
    ageRange: data.ageRange,
    situation: data.situation,
    clarityGoal: data.clarityGoal,
    currentLaneId: data.current?.laneId ?? null,
    currentRoleId: data.current?.roleId ?? null,
    currentTitle: data.current?.title ?? null,
    currentYears: data.current?.years ?? null,
    considering: data.considering,
    onboardedAt: new Date(),
  };
  const db = await getDb();
  await db.insert(schema.profiles).values({ userId: user.id, ...row }).onConflictDoUpdate({ target: schema.profiles.userId, set: row });
  revalidatePath("/", "layout");
  redirect("/assess");
}
