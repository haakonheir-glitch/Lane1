"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { templateById } from "@/lib/sprints/templates";
import { currentDay } from "@/lib/sprints/compute";
import { getToday } from "@/lib/data";

/** Loads a sprint the current user owns, or throws. */
async function ownSprint(sprintId: string) {
  const user = await requireUser();
  const id = z.string().uuid().parse(sprintId);
  const db = await getDb();
  const [s] = await db.select().from(schema.sprints).where(and(eq(schema.sprints.id, id), eq(schema.sprints.userId, user.id))).limit(1);
  if (!s) throw new Error("Sprint not found");
  return { db, user, sprint: s };
}

export async function startSprint(templateId: string) {
  const user = await requireUser();
  const tpl = templateById(z.string().parse(templateId));
  if (!tpl) throw new Error("Unknown sprint");
  const db = await getDb();
  const active = await db
    .select({ id: schema.sprints.id })
    .from(schema.sprints)
    .where(and(eq(schema.sprints.userId, user.id), eq(schema.sprints.status, "active")))
    .limit(1);
  if (active[0]) redirect(`/sprints/${active[0].id}?notice=one-at-a-time`);
  const [created] = await db
    .insert(schema.sprints)
    .values({ userId: user.id, laneId: tpl.laneId, templateId: tpl.id, status: "active", startedOn: getToday(), days: tpl.tasks.length })
    .returning({ id: schema.sprints.id });
  revalidatePath("/", "layout");
  redirect(`/sprints/${created!.id}`);
}

export async function setTaskDone(sprintId: string, day: number, done: boolean) {
  const { db, sprint } = await ownSprint(sprintId);
  const d = z.number().int().min(1).max(sprint.days).parse(day);
  if (sprint.status !== "active") throw new Error("Sprint is not active");
  await db
    .insert(schema.sprintTasks)
    .values({ sprintId: sprint.id, day: d, done })
    .onConflictDoUpdate({ target: [schema.sprintTasks.sprintId, schema.sprintTasks.day], set: { done } });
  revalidatePath("/", "layout");
}

const rating = z.number().int().min(1).max(7);

export async function saveCheckIn(sprintId: string, input: { energy: number; flow: number; continue: number }) {
  const { db, sprint } = await ownSprint(sprintId);
  if (sprint.status !== "active") throw new Error("Sprint is not active");
  const v = z.object({ energy: rating, flow: rating, continue: rating }).parse(input);
  const day = currentDay(sprint.startedOn, sprint.days, getToday());
  await db
    .insert(schema.checkIns)
    .values({ sprintId: sprint.id, day, ...v })
    .onConflictDoUpdate({ target: [schema.checkIns.sprintId, schema.checkIns.day], set: v });
  revalidatePath("/", "layout");
}

export async function saveLogEntry(sprintId: string, input: { values: Record<string, number>; note?: string }) {
  const { db, sprint } = await ownSprint(sprintId);
  if (sprint.status !== "active") throw new Error("Sprint is not active");
  const tpl = templateById(sprint.templateId)!;
  const shape = Object.fromEntries(tpl.metrics.map((m) => [m.key, z.number().min(0).max(1_000_000)]));
  const values = z.object(shape).strict().parse(input.values) as Record<string, number>;
  const note = z.string().max(280).optional().parse(input.note || undefined);
  const day = currentDay(sprint.startedOn, sprint.days, getToday());
  await db
    .insert(schema.logEntries)
    .values({ sprintId: sprint.id, day, values, note: note ?? null })
    .onConflictDoUpdate({ target: [schema.logEntries.sprintId, schema.logEntries.day], set: { values, note: note ?? null } });
  revalidatePath("/", "layout");
}

export async function completeSprint(sprintId: string, input: { wantsToContinue: boolean; note?: string }) {
  const { db, sprint } = await ownSprint(sprintId);
  if (sprint.status !== "active") throw new Error("Sprint is not active");
  const v = z.object({ wantsToContinue: z.boolean(), note: z.string().max(1000).optional() }).parse(input);
  await db
    .update(schema.sprints)
    .set({ status: "completed", completedAt: new Date(), wantsToContinue: v.wantsToContinue, closingNote: v.note ?? null })
    .where(eq(schema.sprints.id, sprint.id));
  revalidatePath("/", "layout");
}

export async function abandonSprint(sprintId: string) {
  const { db, sprint } = await ownSprint(sprintId);
  if (sprint.status !== "active") throw new Error("Sprint is not active");
  await db.update(schema.sprints).set({ status: "abandoned", completedAt: new Date() }).where(eq(schema.sprints.id, sprint.id));
  revalidatePath("/", "layout");
  redirect("/sprints");
}
