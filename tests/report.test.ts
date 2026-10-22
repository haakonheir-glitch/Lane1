import { beforeAll, describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { addSelfScores } from "@/lib/scoring/self";
import { sampleProfile } from "@/lib/mock/profile";
import { buildReportFacts, type ReportLane } from "@/lib/report/facts";
import type { WrittenReport } from "@/lib/report/schema";
import { relativeOf } from "@/lib/view/profile";

vi.stubEnv("PGLITE_DATA", "memory");
const { ReportError, REPORT_MODEL, unsupportedNumbers, writeReport } = await import("@/lib/report/generate");
const { reportFor } = await import("@/lib/report/service");
const { getDb, schema } = await import("@/lib/db");

// A profile as real users have it now: population norms stripped, self-relative scores added.
const strip = <T extends { normed: unknown }>(s: T) => ({ ...s, normed: null });
const unnormed = addSelfScores({
  ...sampleProfile,
  norms: { status: "pending", note: "" },
  interests: sampleProfile.interests && { ...sampleProfile.interests, scales: sampleProfile.interests.scales.map(strip) },
  personality: sampleProfile.personality && { ...sampleProfile.personality, facets: sampleProfile.personality.facets.map(strip), domains: sampleProfile.personality.domains.map(strip) },
});
const lane: ReportLane = { name: "B2B sales", family: "Sales", band: "strong", drivers: ["Enterprising interests"], payoff: "Base plus variable pay", winnerTakeAll: false, entry: "Open", howToTry: "Real sprint", listedBecause: "strong_fit" };
const facts = buildReportFacts(unnormed, [lane], { current: "salgssjef", considering: ["YouTuber"] });

const report = (text: string): WrittenReport => ({
  headline: "You lean toward persuading and leading.",
  overview: [text],
  sections: [{ id: "interests", title: "Interests", paragraphs: ["Enterprising is your strongest interest."] }],
  nextSteps: ["Try a two-week sales sprint.", "Finish session S3.", "Talk to three people in sales."],
  caveats: ["Your scores are compared with yourself only."],
});

/** A stand-in for the Anthropic client that returns prepared drafts in order. */
function fakeClient(...drafts: (WrittenReport | "refusal")[]) {
  const parse = vi.fn(async () => {
    const d = drafts.shift()!;
    return d === "refusal" ? { stop_reason: "refusal", parsed_output: null, model: REPORT_MODEL } : { stop_reason: "end_turn", parsed_output: d, model: REPORT_MODEL };
  });
  return { client: { beta: { messages: { parse } } } as never, parse };
}

describe("report facts", () => {
  it("are relative to the person, rounded, and free of identity", () => {
    expect(facts.basis).toBe("self");
    const json = JSON.stringify(facts);
    expect(json).not.toMatch(/Ingrid|@|email/i);
    expect(json).not.toMatch(/\d\.\d{3,}/); // scores to one decimal; 0–1 indices to two
    // Tags are exactly the BLUEPRINT relative-strength results, nothing looser.
    const rel = relativeOf(unnormed.interests!.scales);
    const label = { strength: "relative strength", weakness: "relative weakness", none: null };
    for (const a of facts.interests!.areas) expect(a.tag).toBe(label[rel[unnormed.interests!.scales.find((s) => s.label === a.area)!.id]!]);
    expect(facts.interests!.areas.some((a) => a.tag)).toBe(true);
    expect(facts.lanes).toEqual([lane]);
  });
});

describe("number check", () => {
  it("accepts figures from the scores and small counts, rejects invented ones", () => {
    const own = String(facts.interests!.areas[0]!.rawOutOf50);
    expect(unsupportedNumbers(report(`Enterprising scored ${own}. Three lanes stand out.`), facts)).toEqual([]);
    expect(unsupportedNumbers(report("You are in the top 87% for persuasion."), facts)).toEqual(["87"]);
  });
});

describe("writeReport", () => {
  it("asks Claude with structured output, high effort and the refusal fallback", async () => {
    const { client, parse } = fakeClient(report("Clean draft."));
    const r = await writeReport(facts, client);
    expect(r.report.overview).toEqual(["Clean draft."]);
    const req = (parse.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(req).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"], output_config: { effort: "high" } });
    expect(JSON.stringify(req.messages)).toContain("salgssjef");
  });

  it("rewrites once when a draft cites an invented figure, naming the figure", async () => {
    const { client, parse } = fakeClient(report("You beat 87% of people."), report("Persuasion is clearly your strongest area."));
    const r = await writeReport(facts, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(JSON.stringify((parse.mock.calls[1] as unknown[])[0])).toContain("87");
    expect(r.report.overview[0]).toMatch(/strongest/);
  });

  it("rejects the report if the rewrite still invents figures", async () => {
    const { client } = fakeClient(report("Top 87%."), report("Top 91%."));
    await expect(writeReport(facts, client)).rejects.toBeInstanceOf(ReportError);
  });

  it("explains a key that isn't scoped to a workspace", async () => {
    const msg = "This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header.";
    const parse = vi.fn(async () => {
      throw new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: msg } }, msg, new Headers());
    });
    await expect(writeReport(facts, { beta: { messages: { parse } } } as never)).rejects.toThrow(/isn't tied to a workspace/);
  });

  it("turns a refusal into a readable error", async () => {
    const { client } = fakeClient("refusal");
    await expect(writeReport(facts, client)).rejects.toThrow(/couldn't be written/);
  });
});

describe("stored reports", () => {
  let userId = "";
  beforeAll(async () => {
    const db = await getDb();
    const [u] = await db.insert(schema.users).values({ email: "report@example.com", name: "R", passwordHash: "x" }).returning({ id: schema.users.id });
    userId = u!.id;
  });

  it("are reused while the scores are unchanged and rewritten when they change", async () => {
    const write = vi.fn(async () => ({ report: report("Stored."), model: REPORT_MODEL }));
    const a = await reportFor(userId, facts, write);
    const b = await reportFor(userId, facts, write);
    expect([a.reused, b.reused]).toEqual([false, true]);
    expect(write).toHaveBeenCalledTimes(1);
    await reportFor(userId, { ...facts, situation: { current: null, considering: [] } }, write);
    expect(write).toHaveBeenCalledTimes(2);
  });
});
