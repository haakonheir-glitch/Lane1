import "server-only";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { SessionId } from "@/lib/bank/types";

export const sessionIdSchema = z.enum(["S1", "S2", "S3", "S4", "S5"]);

export const deviceSchema = z
  .object({
    deviceClass: z.enum(["phone", "tablet", "desktop"]),
    inputType: z.enum(["keyboard", "mouse", "touch"]),
    viewport: z.string().max(20),
  })
  .optional();

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Resolves the signed-in user and a valid session id, or returns an error response. */
export async function guard(params: Promise<{ session: string }>): Promise<{ userId: string; sessionId: SessionId } | Response> {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Not signed in" }, 401);
  const parsed = sessionIdSchema.safeParse((await params).session);
  if (!parsed.success) return json({ error: "Unknown session" }, 404);
  return { userId: user.id, sessionId: parsed.data };
}

export function failure(e: unknown) {
  const message = e instanceof Error ? e.message : "Something went wrong";
  return json({ error: message }, 400);
}
