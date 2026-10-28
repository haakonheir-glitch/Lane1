import { beforeAll, describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { addSelfScores } from "@/lib/scoring/self";
import { sampleProfile } from "@/lib/mock/profile";
import { buildReportFacts, type ReportCareerPath } from "@/lib/report/facts";
import { withoutPay, type BestWorkday, type WrittenReport } from "@/lib/report/schema";
import { claimProblems } from "@/lib/report/claims";
import { workdayProblems } from "@/lib/report/workday";
import { relativeOf } from "@/lib/view/profile";
import { personWorkDesign } from "@/lib/workdesign/person";
import { workBest } from "@/lib/workdesign/best";
import { LANE_PROFILES_V2, matchV2 } from "@/lib/matching/v2";
import { personInputs } from "@/lib/workdesign/person";

vi.stubEnv("PGLITE_DATA", "memory");
const { ReportError, REPORT_MODEL, unsupportedNumbers, writeReport, writeWorkday } = await import("@/lib/report/generate");
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
const lane: ReportCareerPath = {
  name: "B2B sales",
  family: "Sales",
  band: "strong",
  fulfilmentFit: { mean: 65.2, p10: 62.1, p90: 68 },
  abilityFit: null,
  estimatedProfile: false,
  drivers: ["Enterprising interests"],
  frictions: ["Autonomy: less than you need"],
  entry: "Open",
  dayToDay: ["Selling or Influencing Others"],
  listedBecause: "strong_fit",
};
const facts = buildReportFacts(unnormed, [lane], { current: "salgssjef", considering: ["YouTuber"] });
const wb = workBest(personWorkDesign(unnormed), matchV2({ inputs: personInputs(unnormed) }, { draws: 60 }), LANE_PROFILES_V2);
const factsWd = buildReportFacts(unnormed, [lane], { current: null, considering: [] }, wb);
const [first, second] = wb.archetype!.top2;
const other = wb.modes.find((m) => m.archetype !== first!.archetype && m.archetype !== second!.archetype)!;

/** A best workday that passes: about 150 words, every sentence sourced, nothing named without its id. */
const goodDay = (): BestWorkday => ({
  sentences: [
    { text: "Your day starts with a problem worth taking apart, and you get to choose how to approach it.", sources: ["mode.analyse", "env.autonomy"] },
    { text: "Most of the morning goes on finding out what is really going on, reading, comparing and asking good questions.", sources: ["mode.analyse"] },
    { text: "Around midday you share what you found with a small group who want to hear it, and the conversation sharpens the idea.", sources: ["env.social", "mode.teach"] },
    { text: "Nobody stands over you; the deadline is real but far enough away that you can do the work properly.", sources: ["env.autonomy", "env.pace"] },
    { text: "In the afternoon the problem changes shape, so the work never settles into the same loop for long.", sources: ["env.variety"] },
    { text: "You end the day having made something clearer than it was, which is the kind of value your profile leans toward.", sources: ["mode.analyse", "mode.create"] },
    { text: `As a blend, you sit between ${first!.archetype} and ${second!.archetype}, a metaphor for that measured pattern.`, sources: [first!.id, second!.id] },
  ],
});

describe("claims check", () => {
  it("rejects brain, prediction, pay and lane wording, and allows the metaphor and measured scale names", () => {
    expect(claimProblems("Your dopamine spikes when you sell.")).toHaveLength(1);
    expect(claimProblems("You will succeed as a founder.")).toHaveLength(1);
    expect(claimProblems("This lane pays well.").length).toBe(2);
    expect(claimProblems("You're wired for variety, and your Neuroticism is low relative to your other traits.")).toEqual([]);
  });
});

describe("best workday check", () => {
  it("accepts a passage where every sentence traces to the Work Design JSON", () => {
    expect(workdayProblems(goodDay(), wb)).toEqual([]);
  });

  it("rejects unsourced sentences, unknown ids, and modes, conditions or archetypes named without their id", () => {
    const d = goodDay();
    d.sentences[0]!.sources = [];
    d.sentences[1]!.sources = ["mode.juggle"];
    d.sentences[2]!.text = "You get plenty of autonomy over lunch.";
    d.sentences[3]!.text = `A ${other.archetype} would love this afternoon.`;
    const p = workdayProblems(d, wb).join("\n");
    expect(p).toMatch(/Sentence 1 lists no dimension ids/);
    expect(p).toMatch(/mode\.juggle/);
    expect(p).toMatch(/Sentence 3 names autonomy without listing env\.autonomy/);
    expect(p).toMatch(new RegExp(`Sentence 4 names the archetype ${other.archetype}`));
  });

  it("rejects figures, comparisons with others, banned claims, several sentences in one item, and the wrong length", () => {
    const d = goodDay();
    d.sentences[0]!.text = "You beat 87% of people at this.";
    d.sentences[1]!.text = "Unlike most people, you thrive on it.";
    d.sentences[2]!.text = "Your brain lights up in a new lane.";
    d.sentences[3]!.text = "You work alone. Then you meet people.";
    const p = workdayProblems(d, wb).join("\n");
    expect(p).toMatch(/figures .*87/);
    expect(p).toMatch(/most people/);
    expect(p).toMatch(/brain/);
    expect(p).toMatch(/"lane"/);
    expect(p).toMatch(/Sentence 4 is more than one sentence/);
    expect(workdayProblems({ sentences: goodDay().sentences.slice(0, 2) }, wb).join(" ")).toMatch(/words; it must be/);
  });

  it("is written from the Work Design JSON only, rewritten once with the problems listed, and left out if it still fails", async () => {
    const bad: BestWorkday = { sentences: [{ text: "You thrive.", sources: [] }] };
    const { client, parse } = fakeClient(bad as never, goodDay() as never);
    expect(await writeWorkday(factsWd, client)).toEqual(goodDay());
    const req = JSON.stringify((parse.mock.calls[0] as unknown[])[0]);
    expect(req).toContain("mode.analyse");
    expect(req).not.toContain("salgssjef");
    expect(req).not.toContain("B2B sales");
    expect(JSON.stringify((parse.mock.calls[1] as unknown[])[0])).toContain("lists no dimension ids");
    const again = fakeClient(bad as never, bad as never);
    expect(await writeWorkday(factsWd, again.client)).toBeNull();
  });
});

const report = (text: string): WrittenReport => ({
  headline: "You lean toward persuading and leading.",
  overview: [text],
  sections: [{ id: "interests", title: "Interests", paragraphs: ["Enterprising is your strongest interest."] }],
  pathsToLookInto: ["Most people get into sales through an entry-level role.", "The day-to-day work is finding new customers.", "The work draws on your persuasiveness."],
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

describe("older reports without pay", () => {
  it("drops every sentence about pay, income or earnings and keeps the rest", () => {
    const old = report("You lean toward persuading. In B2B sales most income is commission. Your values fit sales work.");
    old.pathsToLookInto = ["How people get in: an entry-level role.", "How the pay works: a base plus commission.", "Day to day: finding customers."];
    old.sections[0]!.paragraphs = ["Most people in esports earn little; a winner-take-all career."];
    const clean = withoutPay(old);
    expect(clean.overview).toEqual(["You lean toward persuading. Your values fit sales work."]);
    expect(clean.pathsToLookInto).toEqual(["How people get in: an entry-level role.", "Day to day: finding customers."]);
    expect(clean.sections[0]!.paragraphs).toEqual([]);
    expect(withoutPay(report("Learning and patience are measured by tasks."))).toEqual(report("Learning and patience are measured by tasks."));
    const withDay = { ...report("Fine."), bestWorkday: { sentences: [{ text: "You earn well.", sources: ["mode.influence"] }, { text: "You like a puzzle.", sources: ["mode.analyse"] }] } };
    expect(withoutPay(withDay).bestWorkday!.sentences.map((x) => x.text)).toEqual(["You like a puzzle."]);
  });
});

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
    expect(facts.careerPaths).toEqual([lane]);
    expect(JSON.stringify(factsWd.workDesign)).not.toMatch(/\d\.\d{3,}/);
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

  it("rewrites once when a draft makes a claim the report never makes", async () => {
    const { client, parse } = fakeClient(report("Your brain is built for selling."), report("Selling draws on your strongest interest."));
    await writeReport(facts, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(JSON.stringify((parse.mock.calls[1] as unknown[])[0])).toContain("brain");
  });

  it("stores the best workday with the report when the Work Design data allows one", async () => {
    const { client, parse } = fakeClient(report("Clean draft."), goodDay() as never);
    const r = await writeReport(factsWd, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(r.report.bestWorkday).toEqual(goodDay());
  });

  it("rejects the report if the rewrite still invents figures", async () => {
    const { client } = fakeClient(report("Top 87%."), report("Top 93%."));
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
