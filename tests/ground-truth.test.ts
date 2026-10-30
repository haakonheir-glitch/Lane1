/**
 * Precision pass step 8: ground truth, stored only. Satisfaction with the current job (and up to two
 * previous jobs) from onboarding, and "Does this resonate?" on the directions' career paths, stored with the
 * matching version (migration 0005). Neither is read by matching.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.stubEnv("PGLITE_DATA", "memory");
const me = vi.hoisted(() => ({ id: "", email: "truth@example.com", name: "T", createdAt: new Date() }));
vi.mock("@/lib/auth", () => ({ requireUser: async () => me }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
// The server's own directions: b2b_sales is second. The client's rank is never stored.
vi.mock("@/lib/data", () => ({ ownDirectionRank: async (id: string) => (id === "b2b_sales" ? 2 : null) }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));
const { getDb, schema } = await import("@/lib/db");
const { eq } = await import("drizzle-orm");
const { V2_CONFIG } = await import("@/lib/matching/v2");

const base = { ageRange: "25–34", situation: "Employed, fairly settled", clarityGoal: "Whether to leave my current field", considering: [] };
const job = { laneId: "b2b_sales", roleId: null, title: "Account executive" };

describe("ground truth", () => {
  it("stores satisfaction with the current job and up to two previous jobs from onboarding", async () => {
    const db = await getDb();
    const [u] = await db.insert(schema.users).values({ email: me.email, name: "T", passwordHash: "x" }).returning({ id: schema.users.id });
    me.id = u!.id;
    const { saveOnboarding } = await import("@/app/actions/onboarding");
    const previous = [{ laneId: "software_engineering", roleId: null, title: "Developer", satisfaction: 3 }];
    await expect(saveOnboarding({ ...base, current: { ...job, years: "2to5", satisfaction: 6 }, previous })).rejects.toThrow("NEXT_REDIRECT");
    const [p] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, me.id));
    expect(p).toMatchObject({ currentSatisfaction: 6, previousJobs: previous, currentTitle: "Account executive" });

    // Out of range, too many previous jobs, or a made-up career path are refused.
    await expect(saveOnboarding({ ...base, current: { ...job, years: "lt2", satisfaction: 8 } })).rejects.toThrow(/too_big|7/);
    await expect(saveOnboarding({ ...base, current: null, previous: [...previous, ...previous, ...previous] })).rejects.toThrow(/too_big|2/);
    await expect(saveOnboarding({ ...base, current: null, previous: [{ ...previous[0]!, laneId: "nope" }] })).rejects.toThrow(/Unknown lane/);
    // Not working: no current satisfaction.
    await expect(saveOnboarding({ ...base, current: null })).rejects.toThrow("NEXT_REDIRECT");
    const [q] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, me.id));
    expect(q).toMatchObject({ currentSatisfaction: null, previousJobs: [] });
  });

  it("stores 'Does this resonate?' with the running matching version and the server's rank, latest answer only", async () => {
    const db = await getDb();
    const { saveResonance } = await import("@/app/actions/resonance");
    expect(await saveResonance({ laneId: "b2b_sales", rank: 1, response: "yes" })).toEqual({ ok: true });
    expect(await saveResonance({ laneId: "b2b_sales", rank: 4, response: "not_really" })).toEqual({ ok: true });
    expect(await saveResonance({ laneId: "nope", rank: 1, response: "yes" })).toMatchObject({ ok: false });
    // A real career path that isn't in the person's directions is refused.
    expect(await saveResonance({ laneId: "software_engineering", rank: 3, response: "yes" })).toMatchObject({ ok: false, error: expect.stringMatching(/directions/) });
    expect(await saveResonance({ laneId: "b2b_sales", rank: 13, response: "yes" })).toMatchObject({ ok: false });
    expect(await saveResonance({ laneId: "b2b_sales", rank: 1, response: "maybe" as never })).toMatchObject({ ok: false });
    const rows = await db.select().from(schema.careerResonance).where(eq(schema.careerResonance.userId, me.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ laneId: "b2b_sales", matchingVersion: V2_CONFIG.version, rank: 2, response: "not_really" });
  });

  it("goes with the account", async () => {
    const db = await getDb();
    await db.delete(schema.users).where(eq(schema.users.id, me.id));
    expect(await db.select().from(schema.careerResonance).where(eq(schema.careerResonance.userId, me.id))).toHaveLength(0);
  });

  it("is never read by matching", () => {
    for (const f of ["src/lib/matching/v2/fit.ts", "src/lib/matching/roles.ts", "src/lib/data/lanes.ts", "src/lib/workdesign/person.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/satisfaction|careerResonance|previousJobs/i);
    }
  });

  it("migration 0005 only adds", () => {
    const sql = readFileSync("drizzle/0005_ground_truth.sql", "utf8");
    expect(sql).not.toMatch(/\bDROP\b|\bRENAME\b|ALTER COLUMN/i);
    expect(sql).toMatch(/CREATE TABLE "career_resonance"/);
  });
});
