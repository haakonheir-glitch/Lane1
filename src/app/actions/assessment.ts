"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { findGameItem, gameItems, likertModules, type LikertModuleId } from "@/lib/assessment/items";

const moduleIds = Object.keys(likertModules) as LikertModuleId[];

async function markComplete(userId: string, moduleId: string) {
  const db = await getDb();
  await db.insert(schema.moduleCompletions).values({ userId, moduleId }).onConflictDoNothing();
}

const answerSchema = z.object({
  moduleId: z.enum(moduleIds as [LikertModuleId, ...LikertModuleId[]]),
  itemId: z.string(),
  value: z.number().int().min(1).max(5),
});

/** Saves one Likert answer. Marks the module complete when every item has an answer. */
export async function saveAnswer(input: { moduleId: string; itemId: string; value: number }) {
  const user = await requireUser();
  const { moduleId, itemId, value } = answerSchema.parse(input);
  const items = likertModules[moduleId];
  if (!items.some((i) => i.id === itemId)) throw new Error("Unknown item");
  const db = await getDb();
  await db
    .insert(schema.responses)
    .values({ userId: user.id, moduleId, itemId, value })
    .onConflictDoUpdate({ target: [schema.responses.userId, schema.responses.itemId], set: { value, updatedAt: new Date() } });
  const answered = await db
    .select({ itemId: schema.responses.itemId })
    .from(schema.responses)
    .where(and(eq(schema.responses.userId, user.id), eq(schema.responses.moduleId, moduleId)));
  if (answered.length >= items.length) await markComplete(user.id, moduleId);
  revalidatePath("/", "layout");
  return { answered: answered.length, total: items.length };
}

/** Clears a questionnaire so it can be retaken. */
export async function resetModule(moduleId: string) {
  const user = await requireUser();
  const id = z.enum(moduleIds as [LikertModuleId, ...LikertModuleId[]]).parse(moduleId);
  const db = await getDb();
  await db.delete(schema.responses).where(and(eq(schema.responses.userId, user.id), eq(schema.responses.moduleId, id)));
  await db.delete(schema.moduleCompletions).where(and(eq(schema.moduleCompletions.userId, user.id), eq(schema.moduleCompletions.moduleId, id)));
  revalidatePath("/", "layout");
}

const gameSchema = z.object({
  itemId: z.string(),
  choice: z.number().int().min(0).max(3).nullable(),
  ms: z.number().int().min(0).max(120_000),
});

/**
 * Records one game answer and marks it on the server (the browser never sees answer keys).
 * First answer wins: re-submitting an item is ignored, so items can't be retried.
 */
export async function submitGameAnswer(input: { itemId: string; choice: number | null; ms: number }) {
  const user = await requireUser();
  const { itemId, choice, ms } = gameSchema.parse(input);
  const found = findGameItem(itemId);
  if (!found) throw new Error("Unknown item");
  const correct = choice !== null && choice === found.item.answerIndex;
  const db = await getDb();
  await db
    .insert(schema.cognitiveResponses)
    .values({ userId: user.id, gameId: found.game, itemId, choice, correct, ms: Math.min(ms, found.item.seconds * 1000) })
    .onConflictDoNothing();
  const all = Object.values(gameItems).flat().map((i) => i.id);
  const done = await db
    .select({ itemId: schema.cognitiveResponses.itemId })
    .from(schema.cognitiveResponses)
    .where(and(eq(schema.cognitiveResponses.userId, user.id), inArray(schema.cognitiveResponses.itemId, all)));
  if (done.length >= all.length) await markComplete(user.id, "cognitive");
  revalidatePath("/", "layout");
}

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
