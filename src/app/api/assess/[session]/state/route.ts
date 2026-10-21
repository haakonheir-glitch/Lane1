import { z } from "zod";
import { sessionState } from "@/lib/assess/service";
import { deviceSchema, failure, guard, json } from "../../_shared";

const body = z.object({ position: z.number().int().min(0).optional(), device: deviceSchema });

/** Returns the step to show: the first unanswered one, or an earlier questionnaire item when revisiting. */
export async function POST(req: Request, ctx: RouteContext<"/api/assess/[session]/state">) {
  const g = await guard(ctx.params);
  if (g instanceof Response) return g;
  try {
    const { position, device } = body.parse(await req.json().catch(() => ({})));
    const { step } = await sessionState(g.userId, g.sessionId, position, device);
    return json({ step });
  } catch (e) {
    return failure(e);
  }
}
