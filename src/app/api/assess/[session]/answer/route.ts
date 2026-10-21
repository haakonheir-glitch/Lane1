import { z } from "zod";
import { saveAnswer } from "@/lib/assess/service";
import { deviceSchema, failure, guard, json } from "../../_shared";

const body = z.object({
  position: z.number().int().min(0),
  value: z.unknown(),
  skipped: z.boolean().default(false),
  rtMs: z.number().min(0),
  device: deviceSchema,
});

/** Saves one answer (with response time, device class and input type) and returns the next step. */
export async function POST(req: Request, ctx: RouteContext<"/api/assess/[session]/answer">) {
  const g = await guard(ctx.params);
  if (g instanceof Response) return g;
  try {
    const b = body.parse(await req.json());
    const step = await saveAnswer(g.userId, g.sessionId, b.position, b.value, b.skipped, b.rtMs, b.device);
    return json({ step });
  } catch (e) {
    return failure(e);
  }
}
