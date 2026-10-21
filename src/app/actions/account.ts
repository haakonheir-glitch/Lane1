"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { destroySession, requireUser, verifyPassword } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  ageRange: z.string().max(40),
  city: z.string().trim().max(80),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await getDb();
  if (parsed.data.email !== user.email) {
    const taken = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, parsed.data.email)).limit(1);
    if (taken[0]) return { error: "That email is already used by another account." };
  }
  await db.update(schema.users).set({ name: parsed.data.name, email: parsed.data.email }).where(eq(schema.users.id, user.id));
  await db
    .insert(schema.profiles)
    .values({ userId: user.id, ageRange: parsed.data.ageRange, city: parsed.data.city })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: { ageRange: parsed.data.ageRange, city: parsed.data.city } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Permanently deletes the account and everything attached to it (cascading foreign keys). */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (formData.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  const db = await getDb();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(String(formData.get("password") ?? ""), row.passwordHash))) {
    return { error: "Password is incorrect." };
  }
  await destroySession();
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  redirect("/?deleted=1");
}
