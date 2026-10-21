import { retakeSession } from "@/lib/assess/service";
import { failure, guard, json } from "../../_shared";

/** Starts a fresh attempt of a session. Earlier attempts are kept, never silently discarded. */
export async function POST(_req: Request, ctx: RouteContext<"/api/assess/[session]/retake">) {
  const g = await guard(ctx.params);
  if (g instanceof Response) return g;
  try {
    const row = await retakeSession(g.userId, g.sessionId);
    return json({ attempt: row.attempt });
  } catch (e) {
    return failure(e);
  }
}
