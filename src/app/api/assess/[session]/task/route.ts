import { z } from "zod";
import { taskTurn } from "@/lib/assess/service";
import { failure, guard, json } from "../../_shared";

const response = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), choice: z.number().int().min(0).max(7).nullable() }),
  z.object({ kind: z.literal("multi"), selected: z.array(z.number().int().min(0).max(3)).max(4) }),
  z.object({ kind: z.literal("sequence"), sequence: z.array(z.number().int().min(0).max(9)).max(12) }),
  z.object({
    kind: z.literal("batch"),
    answers: z.array(z.object({ index: z.number().int().min(0), answer: z.number().int().min(0).max(3).nullable(), rtMs: z.number().min(0) })).max(200),
  }),
  z.object({ kind: z.literal("key"), key: z.number().int().min(1).max(3) }),
  z.object({ kind: z.literal("pump"), pumps: z.number().int().min(1).max(64) }),
  z.object({ kind: z.literal("collect"), pumps: z.number().int().min(0).max(64) }),
  z.object({ kind: z.literal("pick"), option: z.enum(["sooner", "later"]) }),
]);

const body = z.object({
  taskId: z.enum(["matrix", "number_series", "letter_series", "quant", "rotation2d", "backward_digits", "corsi", "symbol_match", "choice_rt", "learning_rate", "balloon", "delay_discount"]),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("start") }),
    z.object({ kind: z.literal("respond"), index: z.number().int().min(0), practice: z.boolean(), response, rtMs: z.number().min(0) }),
  ]),
});

/** Starts a task attempt or marks one response; returns the next trial (no answer keys). */
export async function POST(req: Request, ctx: RouteContext<"/api/assess/[session]/task">) {
  const g = await guard(ctx.params);
  if (g instanceof Response) return g;
  try {
    const b = body.parse(await req.json());
    return json(await taskTurn(g.userId, g.sessionId, b.taskId, b.action));
  } catch (e) {
    return failure(e);
  }
}
