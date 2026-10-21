/**
 * Creates (or recreates) a demo account with a complete profile and three sprints,
 * so every screen has real data to show.
 *
 *   npm run seed            local database (stop `npm run dev` first; PGlite allows one process)
 *   DATABASE_URL=… npm run seed -- --force   a hosted database
 *
 * Login: demo@lane.local / lane-demo-2026
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleLite } from "drizzle-orm/pglite";
import { migrate as migrateLite } from "drizzle-orm/pglite/migrator";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { gameItems, likertModules } from "../src/lib/assessment/items";
import { templateForLane } from "../src/lib/sprints/templates";

const EMAIL = "demo@lane.local";
const PASSWORD = "lane-demo-2026";

const url = process.env.DATABASE_URL;
if (url && !process.argv.includes("--force")) {
  console.error("DATABASE_URL is set. Re-run with --force to seed a hosted database.");
  process.exit(1);
}

async function connect() {
  if (url) {
    const client = postgres(url, { max: 1 });
    return { db: drizzlePg(client, { schema }), close: () => client.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzleLite(client, { schema });
  await migrateLite(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { db: db as unknown as ReturnType<typeof drizzlePg<typeof schema>>, close: () => client.close() };
}

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** A persona: enterprising and social, extraverted, values income and achievement. */
const persona: Record<string, number> = {
  R: 2, I: 3, A: 4, S: 4, E: 5, C: 2,
  openness: 4, conscientiousness: 3, extraversion: 5, agreeableness: 4, neuroticism: 2,
  autonomy: 4, achievement: 5, variety: 4, relationships: 3, income: 5, security: 2, impact: 3, recognition: 4,
};

const { db, close } = await connect();

await db.delete(schema.users).where(eq(schema.users.email, EMAIL));
const [user] = await db
  .insert(schema.users)
  .values({ email: EMAIL, name: "Ingrid Halvorsen", passwordHash: await bcrypt.hash(PASSWORD, 12), createdAt: day(-60) })
  .returning({ id: schema.users.id });
const userId = user!.id;

await db.insert(schema.profiles).values({
  userId,
  ageRange: "25–34",
  situation: "Employed, considering a change",
  clarityGoal: "Whether to go independent",
  city: "Oslo",
  onboardedAt: day(-60),
});

// Questionnaire answers with a little deterministic noise.
let k = 0;
for (const [moduleId, items] of Object.entries(likertModules)) {
  const rows = items.map((it) => {
    const base = persona[it.dimension] ?? 3;
    const noisy = Math.min(5, Math.max(1, base + ((k++ * 7) % 5 === 0 ? -1 : (k * 3) % 7 === 0 ? 1 : 0)));
    return { userId, moduleId, itemId: it.id, value: it.reverse ? 6 - noisy : noisy, updatedAt: day(-58) };
  });
  await db.insert(schema.responses).values(rows);
}

// Games: verbal strong, numerical decent, pattern middling.
const accuracy: Record<string, number> = { verbal: 7, numerical: 6, pattern: 5 };
for (const [game, items] of Object.entries(gameItems)) {
  await db.insert(schema.cognitiveResponses).values(
    items.map((it, i) => {
      const correct = i < accuracy[game]!;
      return { userId, gameId: game, itemId: it.id, choice: correct ? it.answerIndex : (it.answerIndex + 1) % 4, correct, ms: Math.round(it.seconds * (0.35 + (i % 4) * 0.08) * 1000), createdAt: day(-56) };
    }),
  );
}
await db.insert(schema.moduleCompletions).values([
  { userId, moduleId: "interests", completedAt: day(-58) },
  { userId, moduleId: "personality", completedAt: day(-57) },
  { userId, moduleId: "cognitive", completedAt: day(-56) },
  { userId, moduleId: "values", completedAt: day(-56) },
]);

/** Inserts a sprint with tasks, check-ins and logs. */
async function sprint(laneId: string, startOffset: number, status: "active" | "completed", data: {
  doneThrough: number;
  checkIns: [day: number, energy: number, flow: number, cont: number][];
  logs: [day: number, values: Record<string, number>][];
  wants?: boolean;
}) {
  const tpl = templateForLane(laneId);
  const [s] = await db
    .insert(schema.sprints)
    .values({
      userId,
      laneId,
      templateId: tpl.id,
      status,
      startedOn: iso(day(startOffset)),
      days: tpl.tasks.length,
      completedAt: status === "completed" ? day(startOffset + tpl.tasks.length - 1) : null,
      wantsToContinue: data.wants ?? null,
    })
    .returning({ id: schema.sprints.id });
  const id = s!.id;
  await db.insert(schema.sprintTasks).values(Array.from({ length: data.doneThrough }, (_, i) => ({ sprintId: id, day: i + 1, done: true })));
  if (data.checkIns.length)
    await db.insert(schema.checkIns).values(data.checkIns.map(([d, energy, flow, cont]) => ({ sprintId: id, day: d, energy, flow, continue: cont })));
  if (data.logs.length) await db.insert(schema.logEntries).values(data.logs.map(([d, values]) => ({ sprintId: id, day: d, values })));
}

await sprint("content", -45, "completed", {
  doneThrough: 10,
  wants: true,
  checkIns: [[1, 6, 5, 6], [3, 5, 6, 6], [5, 5, 6, 5], [7, 4, 4, 5], [9, 6, 6, 6], [10, 6, 5, 6]],
  logs: [[3, { published: 1, watch: 31, hours: 3.5 }], [5, { published: 1, watch: 34, hours: 2.5 }], [6, { published: 1, watch: 39, hours: 2 }], [8, { published: 1, watch: 37, hours: 1.5 }], [9, { published: 1, watch: 46, hours: 1.5 }]],
});
await sprint("ux-research", -30, "completed", {
  doneThrough: 7,
  wants: false,
  checkIns: [[1, 4, 5, 4], [3, 4, 4, 4], [5, 4, 4, 3], [7, 3, 3, 2]],
  logs: [[3, { interviews: 1, insights: 3 }], [4, { interviews: 1, insights: 3 }], [5, { interviews: 2, insights: 7 }]],
});
await sprint("sales-b2b", -5, "active", {
  doneThrough: 5,
  checkIns: [[1, 5, 4, 5], [2, 5, 5, 6], [3, 6, 5, 6], [4, 5, 6, 6], [5, 6, 6, 7]],
  logs: [[3, { dials: 15, conversations: 2, meetings: 0 }], [4, { dials: 14, conversations: 2, meetings: 1 }], [5, { dials: 18, conversations: 4, meetings: 0 }]],
});

await close();
console.log(`Seeded demo account: ${EMAIL} / ${PASSWORD}`);
