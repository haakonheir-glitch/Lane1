/**
 * Outcome check-in (Phase 3): when each wave is due, and that the two new tables exist (migration
 * 0004), take one answer per wave, check nothing beyond the two questions, and go with the account.
 */
import { describe, expect, it, vi } from "vitest";
import { addMonths, dueWave, nextDate } from "@/lib/outcome";

vi.stubEnv("PGLITE_DATA", "memory");
const me = vi.hoisted(() => ({ id: "", email: "act@example.com", name: "A", createdAt: new Date() }));
vi.mock("@/lib/auth", () => ({ requireUser: async () => me }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
const { getDb, schema } = await import("@/lib/db");
const { eq } = await import("drizzle-orm");

describe("check-in waves", () => {
  const start = new Date("2026-01-15T10:00:00Z");

  it("opens 6 and 12 months after consent, one at a time", () => {
    expect(dueWave(start, [], addMonths(start, 5))).toBeNull();
    expect(nextDate(start, [], addMonths(start, 5))).toEqual(addMonths(start, 6));
    expect(dueWave(start, [], addMonths(start, 6))).toBe("6m");
    expect(dueWave(start, ["6m"], addMonths(start, 7))).toBeNull();
    expect(nextDate(start, ["6m"], addMonths(start, 7))).toEqual(addMonths(start, 12));
    expect(dueWave(start, ["6m"], addMonths(start, 12))).toBe("12m");
    expect(dueWave(start, ["6m", "12m"], addMonths(start, 30))).toBeNull();
    expect(nextDate(start, ["6m", "12m"], addMonths(start, 30))).toBeNull();
  });

  it("adds calendar months without overflowing at the end of a month", () => {
    expect(addMonths(new Date("2026-08-31T12:00:00Z"), 6).toISOString().slice(0, 10)).toBe("2027-02-28");
    expect(addMonths(new Date("2027-03-31T12:00:00Z"), 6).toISOString().slice(0, 10)).toBe("2027-09-30");
    expect(addMonths(new Date("2028-02-29T12:00:00Z"), 12).toISOString().slice(0, 10)).toBe("2029-02-28");
    expect(addMonths(new Date("2026-01-15T12:00:00Z"), 6).toISOString().slice(0, 10)).toBe("2026-07-15");
  });

  it("skips a missed 6-month check-in once the 12-month one is due", () => {
    expect(dueWave(start, [], addMonths(start, 13))).toBe("12m");
  });
});

describe("check-in tables", () => {
  it("store consent and one answer per wave, and are deleted with the account", async () => {
    const db = await getDb();
    const [u] = await db.insert(schema.users).values({ email: "outcome@example.com", name: "O", passwordHash: "x" }).returning({ id: schema.users.id });
    await db.insert(schema.outcomeConsents).values({ userId: u!.id, consentedAt: new Date() });
    await db.insert(schema.outcomeCheckIns).values({ userId: u!.id, wave: "6m", laneId: "b2b_sales", roleId: null, title: "Account executive", fulfilment: 6 });
    await db.insert(schema.outcomeCheckIns).values({ userId: u!.id, wave: "6m", laneId: null, roleId: null, title: null, fulfilment: 2 }).onConflictDoNothing();
    const rows = await db.select().from(schema.outcomeCheckIns).where(eq(schema.outcomeCheckIns.userId, u!.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ wave: "6m", fulfilment: 6, title: "Account executive" });
    // Only the two questions: no income or anything else is stored.
    expect(Object.keys(rows[0]!).sort()).toEqual(["answeredAt", "fulfilment", "laneId", "roleId", "title", "userId", "wave"]);
    await db.delete(schema.users).where(eq(schema.users.id, u!.id));
    expect(await db.select().from(schema.outcomeConsents).where(eq(schema.outcomeConsents.userId, u!.id))).toHaveLength(0);
    expect(await db.select().from(schema.outcomeCheckIns).where(eq(schema.outcomeCheckIns.userId, u!.id))).toHaveLength(0);
  });
});

describe("check-in actions", () => {

  it("store consent only on an explicit yes, save only the wave that is due, and withdraw everything", async () => {
    const db = await getDb();
    const [u] = await db.insert(schema.users).values({ email: me.email, name: "A", passwordHash: "x" }).returning({ id: schema.users.id });
    me.id = u!.id;
    const { setOutcomeConsent, saveOutcomeCheckIn, withdrawOutcomeConsent } = await import("@/app/actions/outcome");
    const answer = { wave: "6m" as const, current: { laneId: "b2b_sales", roleId: null, title: "Account executive" }, fulfilment: 5 };

    expect(await saveOutcomeCheckIn(answer)).toMatchObject({ ok: false, error: expect.stringMatching(/opted in/) });
    expect(await setOutcomeConsent(false as never)).toMatchObject({ ok: false });
    expect(await setOutcomeConsent(true)).toEqual({ ok: true });
    // Just opted in: nothing is due yet.
    expect(await saveOutcomeCheckIn(answer)).toMatchObject({ ok: false, error: expect.stringMatching(/isn't open/) });

    // Seven months later the 6-month check-in is open.
    await db.update(schema.outcomeConsents).set({ consentedAt: addMonths(new Date(), -7) }).where(eq(schema.outcomeConsents.userId, me.id));
    expect(await saveOutcomeCheckIn({ ...answer, current: { laneId: "b2b_sales", roleId: "not-a-role", title: "x" } })).toMatchObject({ ok: false, error: expect.stringMatching(/list/) });
    expect(await saveOutcomeCheckIn({ ...answer, fulfilment: 9 })).toMatchObject({ ok: false });
    expect(await saveOutcomeCheckIn({ ...answer, wave: "12m" })).toMatchObject({ ok: false });
    expect(await saveOutcomeCheckIn(answer)).toEqual({ ok: true });
    expect(await saveOutcomeCheckIn({ ...answer, current: null, fulfilment: 1 })).toMatchObject({ ok: false });
    const rows = await db.select().from(schema.outcomeCheckIns).where(eq(schema.outcomeCheckIns.userId, me.id));
    expect(rows.map((r) => [r.wave, r.fulfilment, r.laneId])).toEqual([["6m", 5, "b2b_sales"]]);

    expect(await withdrawOutcomeConsent()).toEqual({ ok: true });
    expect(await db.select().from(schema.outcomeConsents).where(eq(schema.outcomeConsents.userId, me.id))).toHaveLength(0);
    expect(await db.select().from(schema.outcomeCheckIns).where(eq(schema.outcomeCheckIns.userId, me.id))).toHaveLength(0);
  });
});
