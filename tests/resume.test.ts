/**
 * Regression: resuming a cognitive task that was left mid-way.
 * The restart (a fresh attempt) must be recorded, so the next answer is checked against it;
 * before the fix every answer after a resume failed with "Out-of-order response", even after reload.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.stubEnv("PGLITE_DATA", "memory");
const { getDb, schema } = await import("@/lib/db");
const { taskTurn } = await import("@/lib/assess/service");

let userId = "";
const start = () => taskTurn(userId, "S3", "matrix", { kind: "start" });
const answer = (t: { index: number; practice: boolean }) =>
  taskTurn(userId, "S3", "matrix", { kind: "respond", index: t.index, practice: t.practice, response: { kind: "choice", choice: 0 }, rtMs: 3000 });

beforeAll(async () => {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ email: "resume@example.com", name: "Resume", passwordHash: "x" }).returning({ id: schema.users.id });
  userId = u!.id;
});

describe("resuming an interrupted task", () => {
  it("restarts with fresh items and accepts answers after the restart", async () => {
    // First attempt: two practice items and one scored item, then the person leaves.
    let r = await start();
    for (let i = 0; i < 3; i++) r = await answer(r.trial!);
    expect(r.trial).toMatchObject({ index: 1, practice: false });

    // Coming back: Start begins a fresh attempt at practice item 0…
    r = await start();
    expect(r.trial).toMatchObject({ index: 0, practice: true });
    // …and answering it works (this is what failed before).
    r = await answer(r.trial!);
    expect(r.trial).toMatchObject({ index: 1, practice: true });

    // Leaving again and coming back starts another fresh attempt, which also works.
    r = await start();
    expect(r.trial).toMatchObject({ index: 0, practice: true });
    await expect(answer(r.trial!)).resolves.toMatchObject({ trial: { index: 1, practice: true } });
  });

  it("doesn't start yet another attempt when the person reloads before answering", async () => {
    const db = await getDb();
    const attempts = async () => new Set((await db.select().from(schema.taskTrials)).filter((t) => t.taskId === "matrix").map((t) => t.attempt)).size;
    const before = await attempts();
    await start(); // last attempt has answers → new attempt
    const afterFirst = await attempts();
    await start(); // reload without answering → same attempt
    expect(afterFirst).toBe(before + 1);
    expect(await attempts()).toBe(afterFirst);
  });
});
