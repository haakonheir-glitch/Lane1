/**
 * Sessions finished before the difficulty table existed: their trials have no level and their
 * stored scores no per-level counts. Loading them re-scores from the stored trials (PLAN D50).
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.stubEnv("PGLITE_DATA", "memory");
const { getDb, schema } = await import("@/lib/db");
const { rescoreIfStale } = await import("@/lib/assess/service");
const { SCORING_VERSION } = await import("@/lib/scoring/profile");

let rowId = "";
const ladder = [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4]; // matrix, file 14
const old = { session: "S3", validity: { flags: [], confidence: "ok" }, hidden: {}, cognitive: { accuracy: { matrix: { correct: 7, scored: 12 } }, span: {} } };

beforeAll(async () => {
  const db = await getDb();
  const [u] = await db.insert(schema.users).values({ email: "rescore@example.com", name: "R", passwordHash: "x" }).returning({ id: schema.users.id });
  const [s] = await db.insert(schema.assessmentSessions).values({ userId: u!.id, sessionId: "S3", status: "completed" }).returning({ id: schema.assessmentSessions.id });
  rowId = s!.id;
  // Old-format trials: no `level`. Right on levels 1–2 and the first level-3 item, wrong after.
  await db.insert(schema.taskTrials).values([
    ...ladder.map((_, i) => ({ sessionRowId: rowId, taskId: "matrix", attempt: 1, trialIndex: i, payload: { correct: i < 6, timedOut: false, rtMs: 20_000, timeLimitSec: 75 } })),
    { sessionRowId: rowId, taskId: "matrix", attempt: 1, trialIndex: -1, payload: { kind: "end" } },
  ]);
  await db.insert(schema.sessionScores).values({ sessionRowId: rowId, scores: old });
});

describe("re-scoring older sessions", () => {
  it("rebuilds per-level counts from the ladder and stores the new scores", async () => {
    const fresh = await rescoreIfStale(rowId, "S3", old as never);
    expect(fresh.version).toBe(SCORING_VERSION);
    expect(fresh.cognitive?.accuracy.matrix?.byLevel).toEqual([
      { level: 1, correct: 2, scored: 2 },
      { level: 2, correct: 3, scored: 3 },
      { level: 3, correct: 1, scored: 4 },
      { level: 4, correct: 0, scored: 3 },
    ]);
    const db = await getDb();
    const [stored] = await db.select().from(schema.sessionScores).where(eq(schema.sessionScores.sessionRowId, rowId));
    expect((stored!.scores as { version?: string }).version).toBe(SCORING_VERSION);
  });

  it("leaves current scores alone", async () => {
    const current = { ...old, version: SCORING_VERSION };
    expect(await rescoreIfStale(rowId, "S3", current as never)).toBe(current);
  });
});
