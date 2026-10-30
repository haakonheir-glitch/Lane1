/**
 * "Open to faith-based work": an optional onboarding toggle, also in settings, stored on the
 * profile (migration 0006, additive) and carried into the experience answers the gate reads.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.stubEnv("PGLITE_DATA", "memory");
const me = vi.hoisted(() => ({ id: "", email: "faith@example.com", name: "F", createdAt: new Date() }));
vi.mock("@/lib/auth", () => ({ requireUser: async () => me, getCurrentUser: async () => me }));
vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (f: unknown) => f }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
}));
const { getDb, schema } = await import("@/lib/db");
const { eq } = await import("drizzle-orm");

const base = { ageRange: "25–34", situation: "Employed, fairly settled", clarityGoal: "Whether to leave my current field", considering: [], current: null };
const stored = async () => (await (await getDb()).select().from(schema.profiles).where(eq(schema.profiles.userId, me.id)))[0];

describe("open to faith-based work", () => {
  it("is off unless chosen in onboarding, and saved when chosen", async () => {
    const db = await getDb();
    const [u] = await db.insert(schema.users).values({ email: me.email, name: "F", passwordHash: "x" }).returning({ id: schema.users.id });
    me.id = u!.id;
    const { saveOnboarding } = await import("@/app/actions/onboarding");
    await expect(saveOnboarding(base)).rejects.toThrow("NEXT_REDIRECT");
    expect((await stored())?.openToFaith).toBe(false);
    await expect(saveOnboarding({ ...base, openToFaith: true })).rejects.toThrow("NEXT_REDIRECT");
    expect((await stored())?.openToFaith).toBe(true);
  });

  it("can be changed in settings", async () => {
    const { setOpenToFaith } = await import("@/app/actions/preferences");
    expect(await setOpenToFaith(false)).toEqual({ ok: true });
    expect((await stored())?.openToFaith).toBe(false);
    expect(await setOpenToFaith("yes" as never)).toMatchObject({ ok: false });
    expect(await setOpenToFaith(true)).toEqual({ ok: true });
    expect((await stored())?.openToFaith).toBe(true);
  });

  it("migration 0006 only adds a column, off by default", () => {
    const sql = readFileSync("drizzle/0006_faith_opt_in.sql", "utf8");
    expect(sql).not.toMatch(/\bDROP\b|\bRENAME\b|ALTER COLUMN/i);
    expect(sql).toMatch(/ADD COLUMN "open_to_faith" boolean DEFAULT false NOT NULL/);
  });
});
