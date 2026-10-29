"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLane } from "@/lib/taxonomy";
import { V2_CONFIG } from "@/lib/matching/v2";
import { ownTopFiveRank } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string };

const answer = z.object({
  laneId: z.string().max(80),
  /** What the card showed; checked against the server's own ranking, which is what is stored. */
  rank: z.number().int().min(1).max(5),
  response: z.enum(["yes", "not_really", "no"]),
});

/**
 * "Does this resonate?" on one of the five top career path cards. Stored with the matching version
 * that is running (set here, never by the client), the latest answer per career path and version.
 * Ground truth for validating matching; never used in matching.
 */
export async function saveResonance(input: z.input<typeof answer>): Promise<Result> {
  const user = await requireUser();
  const parsed = answer.safeParse(input);
  if (!parsed.success || !getLane(parsed.data.laneId)) return { ok: false, error: "Couldn't save that answer." };
  const a = parsed.data;
  // Only a career path in the person's own top five, at the place the matching put it.
  const rank = await ownTopFiveRank(a.laneId);
  if (rank === null) return { ok: false, error: "That career path isn't in your top five any more. Reload the page." };
  const row = { userId: user.id, laneId: a.laneId, matchingVersion: V2_CONFIG.version, rank, response: a.response, answeredAt: new Date() };
  const db = await getDb();
  await db
    .insert(schema.careerResonance)
    .values(row)
    .onConflictDoUpdate({ target: [schema.careerResonance.userId, schema.careerResonance.laneId, schema.careerResonance.matchingVersion], set: { rank: row.rank, response: row.response, answeredAt: row.answeredAt } });
  revalidatePath("/lanes");
  return { ok: true };
}
