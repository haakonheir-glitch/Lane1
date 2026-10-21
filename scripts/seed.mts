/**
 * Creates (or recreates) a demo account and completes sessions S1 and S2 through the real
 * assessment service — the same code path the browser uses — so the hub shows progress and
 * the database holds realistic responses, timings and scores.
 *
 *   npm run seed            local database (stop `npm run dev` first; PGlite allows one process)
 *   DATABASE_URL=… npm run seed -- --force   a hosted database
 *
 * Login: demo@lane.local / lane-demo-2026
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db";
import { saveAnswer, sessionState, stepsFor } from "../src/lib/assess/service";
import { sessionPlan } from "../src/lib/bank/bank";
import type { SessionId } from "../src/lib/bank/types";

const EMAIL = "demo@lane.local";
const PASSWORD = "lane-demo-2026";

if (process.env.DATABASE_URL && !process.argv.includes("--force")) {
  console.error("DATABASE_URL is set. Re-run with --force to seed a hosted database.");
  process.exit(1);
}

const db = await getDb();
await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
const [user] = await db
  .insert(schema.users)
  .values({ email: EMAIL, name: "Demo Person", passwordHash: await bcrypt.hash(PASSWORD, 12) })
  .returning({ id: schema.users.id });
const userId = user!.id;
await db.insert(schema.profiles).values({ userId, ageRange: "25–34", situation: "Employed, considering a change", clarityGoal: "Whether to go independent", city: "Oslo", onboardedAt: new Date() });

const device = { deviceClass: "desktop" as const, inputType: "keyboard" as const, viewport: "1440x900" };
/** A careful respondent: varied but consistent answers, plausible response times. */
function answerFor(sessionId: SessionId, position: number): { value: unknown; rt: number } {
  const step = stepsFor(sessionId)[position]!;
  if (step.block.kind === "env_check") return { value: [1, 1, 1], rt: 5000 };
  const item = step.block.items[step.itemIndex]!;
  const f = item.format;
  if (item.validity?.kind === "infrequency") return { value: 1, rt: 2600 };
  if (item.validity?.kind === "instructed") return { value: item.validity.passIfEq, rt: 3800 };
  if (item.validity?.kind === "effort") return { value: 0, rt: 3000 };
  switch (f.type) {
    case "likert5":
    case "likert7": {
      const lean = (item.scale === "E" || item.scale === "S" || item.domain === "Extraversion" ? 1 : item.scale === "R" ? -1 : 0) * (item.key === -1 ? -1 : 1);
      const v = Math.min(f.options.length, Math.max(1, 3 + lean + ((position * 7) % 3) - 1));
      return { value: v, rt: 2200 + ((position * 37) % 1800) };
    }
    case "forced_q_sort": {
      const order = f.cards.map((c) => c.id);
      const sort: Record<string, number> = {};
      let k = 0;
      f.columns.forEach((col, i) => {
        for (let n = 0; n < f.capacities[i]!; n++) sort[order[k++]!] = col.value;
      });
      return { value: sort, rt: 90_000 };
    }
    default:
      return { value: null, rt: 1000 };
  }
}

for (const sessionId of ["S1", "S2"] as SessionId[]) {
  await sessionState(userId, sessionId, undefined, device);
  const steps = stepsFor(sessionId);
  for (const s of steps) {
    const { value, rt } = answerFor(sessionId, s.position);
    await saveAnswer(userId, sessionId, s.position, value, false, rt, device);
  }
  const done = await sessionState(userId, sessionId);
  console.log(`${sessionId} (${sessionPlan(sessionId).title}): ${steps.length} steps → ${done.step.kind}${done.step.kind === "done" ? `, confidence ${done.step.confidence}` : ""}`);
}

console.log(`Seeded demo account: ${EMAIL} / ${PASSWORD}`);
process.exit(0);
