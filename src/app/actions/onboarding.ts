"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const onboardingSchema = z.object({
  ageRange: z.string().max(40),
  situation: z.string().max(80),
  clarityGoal: z.string().max(120),
});

export async function saveOnboarding(input: { ageRange: string; situation: string; clarityGoal: string }) {
  const user = await requireUser();
  const data = onboardingSchema.parse(input);
  const db = await getDb();
  await db
    .insert(schema.profiles)
    .values({ userId: user.id, ...data, onboardedAt: new Date() })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: { ...data, onboardedAt: new Date() } });
  revalidatePath("/", "layout");
  redirect("/assess");
}
