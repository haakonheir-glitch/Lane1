"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

/**
 * "Open to faith-based work": career paths that require a personal faith (matching v2 config
 * beliefGated) are suggested only when this is on. Matching and the fit don't change; what is
 * suggested does.
 */
export async function setOpenToFaith(open: boolean): Promise<Result> {
  const user = await requireUser();
  if (typeof open !== "boolean") return { ok: false, error: "Couldn't save that." };
  const db = await getDb();
  const updated = await db.update(schema.profiles).set({ openToFaith: open }).where(eq(schema.profiles.userId, user.id)).returning({ userId: schema.profiles.userId });
  if (!updated.length) await db.insert(schema.profiles).values({ userId: user.id, openToFaith: open });
  revalidatePath("/lanes");
  revalidatePath("/profile");
  revalidatePath("/settings");
  // The matching cache is keyed by the job answers including this one, so nothing stale is served.
  return { ok: true };
}
