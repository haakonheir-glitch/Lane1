/**
 * Belief-gated career paths and the strong fits as directions (owner's decisions, 2026-10-30).
 * Religious & spiritual work is suggested only with the person's opt-in ("open to faith-based
 * work"); otherwise it stays in the full map at "possible fit" with BELIEF_NOTE. The strong fits are
 * shown as 3–4 named directions of 2–3 career paths each, never as a ranking.
 */
import { afterEach, describe, expect, it } from "vitest";
import { BELIEF_NOTE, LANE_PROFILES_V2, V2_CONFIG, V2_CONFIGS, applyGates, bestByDirection, directionsOf, matchV2, topFive, type MatchResultV2 } from "@/lib/matching/v2";
import type { LaneMatchV2 } from "@/lib/matching/v2/types";
import { synthetic, TEST_PROFILES } from "@/lib/matching/v2/synthetic";
import { buildCareerPicks, buildLaneMap, reportLanes } from "@/lib/data/lanes";
import { sampleProfile } from "@/lib/mock/profile";
import { getLane } from "@/lib/taxonomy";

const V4 = V2_CONFIGS["v2-0.4"]!;
const V5 = V2_CONFIGS["v2-0.5"]!;
const familyOf = (id: string) => getLane(id)?.family ?? "";

describe("belief-gated career paths", () => {
  const r = matchV2(synthetic(TEST_PROFILES.analyst!.spec, V5.inputs), { config: V5, draws: 60 });
  const strong = r.lanes.find((l) => l.band === "strong")!;
  const cfg = { ...V5, beliefGated: [strong.laneId] };

  it("caps a gated strong fit at possible, with the note, hidden from top lists; the fit is unchanged", () => {
    const g = applyGates(r, cfg, { faith: false });
    const l = g.lanes.find((x) => x.laneId === strong.laneId)!;
    expect(l).toMatchObject({ band: "possible", cappedFrom: "strong", capNote: BELIEF_NOTE, hidden: true });
    expect(l.fulfilmentFit).toEqual(strong.fulfilmentFit);
    expect(g.bandCounts.strong).toBe(r.bandCounts.strong - 1);
    expect(g.bandCounts.possible).toBe(r.bandCounts.possible + 1);
    expect(topFive(g).map((p) => p.laneId)).not.toContain(strong.laneId);
    expect(bestByDirection(g).map((p) => p.laneId)).not.toContain(strong.laneId);
    expect(directionsOf(g, familyOf).flatMap((d) => d.laneIds)).not.toContain(strong.laneId);
    // Every other career path is untouched.
    g.lanes.filter((x) => x.laneId !== strong.laneId).forEach((x, i) => expect(x).toBe(r.lanes.filter((y) => y.laneId !== strong.laneId)[i]));
  });

  it("changes nothing with the opt-in, or with no gated list", () => {
    expect(applyGates(r, cfg, { faith: true })).toBe(r);
    expect(applyGates(r, V4, { faith: false })).toBe(r);
  });

  it("gates Religious & spiritual work under v2-0.5 only, with the owner's note", () => {
    expect(V5.beliefGated).toEqual(["faith"]);
    expect(LANE_PROFILES_V2.faith).toBeDefined();
    expect(getLane("faith")?.name).toMatch(/religious/i);
    expect(V4.beliefGated).toEqual([]);
    expect(BELIEF_NOTE).toBe("Requires a personal faith. Shown only if you say you're open to it.");
  });
});

describe("the gate in the app's lists", () => {
  // Gate the sample's best fit in the running config, so the effect shows on real lists.
  const saved = V2_CONFIG.beliefGated;
  afterEach(() => {
    V2_CONFIG.beliefGated = saved;
  });
  const open = { current: null, considering: [], openToFaith: true } as never;
  const closed = { current: null, considering: [], openToFaith: false } as never;

  it("keeps it out of directions and the report without the opt-in, in the full map with the note", () => {
    const first = buildCareerPicks(sampleProfile, open).directions[0]!.picks[0]!.row.id;
    V2_CONFIG.beliefGated = [first];
    const picks = buildCareerPicks(sampleProfile, closed);
    expect([...picks.overall, ...picks.corporate, ...picks.ownPath].map((p) => p.row.id)).not.toContain(first);
    expect(reportLanes(sampleProfile, closed).map((c) => c.name)).not.toContain(getLane(first)!.name);
    const row = buildLaneMap(sampleProfile, closed).rows.find((x) => x.id === first)!;
    expect(row).toMatchObject({ band: "testing", capNote: BELIEF_NOTE, gated: true });
  });

  it("shows it again with the opt-in", () => {
    const first = buildCareerPicks(sampleProfile, open).directions[0]!.picks[0]!.row.id;
    V2_CONFIG.beliefGated = [first];
    expect(buildCareerPicks(sampleProfile, open).overall.map((p) => p.row.id)).toContain(first);
    expect(reportLanes(sampleProfile, open).find((c) => c.name === getLane(first)!.name)).toMatchObject({ listedBecause: "strong_fit", talentNote: null });
    expect(buildLaneMap(sampleProfile, open).rows.find((x) => x.id === first)!.gated).toBe(false);
  });
});

describe("directions", () => {
  // A hand-made result: only what directionsOf reads.
  const lane = (laneId: string, direction: string, band: LaneMatchV2["band"], mean: number, extra: Partial<LaneMatchV2> = {}) =>
    ({ laneId, name: laneId, direction, band, fulfilmentFit: { mean }, ...extra }) as unknown as LaneMatchV2;
  const result = (lanes: LaneMatchV2[]) => ({ lanes }) as unknown as MatchResultV2;
  const fam: Record<string, string> = { a1: "A", a2: "A", a3: "B", a4: "B", a5: "C", b1: "D", b2: "D", c1: "E", c2: "E", d1: "F", d2: "F" };

  it("groups strong fits by leading value mode, best direction first, fit order inside, no repeats", () => {
    const r = result([lane("b1", "build", "strong", 70), lane("a1", "influence", "strong", 68), lane("b2", "build", "strong", 60), lane("a2", "influence", "strong", 65), lane("c1", "care", "strong", 62), lane("c2", "care", "strong", 61)]);
    const d = directionsOf(r, (id) => fam[id]!);
    expect(d.map((x) => x.mode)).toEqual(["build", "influence", "care"]);
    expect(d.map((x) => x.laneIds)).toEqual([["b1", "b2"], ["a1", "a2"], ["c1", "c2"]]);
  });

  it("splits a large mode group by family, keeps at most 3 per direction and at most 4 directions", () => {
    const r = result([
      lane("a1", "influence", "strong", 70),
      lane("a2", "influence", "strong", 69),
      lane("a3", "influence", "strong", 68),
      lane("a4", "influence", "strong", 67),
      lane("a5", "influence", "strong", 66),
      lane("b1", "build", "strong", 65),
      lane("b2", "build", "strong", 64),
      lane("c1", "care", "strong", 63),
      lane("c2", "care", "strong", 62),
      lane("d1", "teach", "strong", 61),
      lane("d2", "teach", "strong", 60),
    ]);
    const d = directionsOf(r, (id) => fam[id]!);
    expect(d.length).toBe(4);
    expect(d.slice(0, 2).map((x) => [x.mode, x.family])).toEqual([
      ["influence", "A"],
      ["influence", "B"],
    ]);
    for (const x of d) expect(x.laneIds.length).toBeLessThanOrEqual(3);
    const ids = d.flatMap((x) => x.laneIds);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fills to three directions from possible fits, never with hidden ones", () => {
    const r = result([
      lane("b1", "build", "strong", 70),
      lane("b2", "build", "strong", 69),
      lane("x1", "care", "possible", 66, { hidden: true }),
      lane("c1", "care", "possible", 64),
      lane("c2", "care", "possible", 63),
      lane("d1", "teach", "possible", 60),
      lane("d2", "teach", "possible", 59),
    ]);
    const d = directionsOf(r, () => "F");
    expect(d.map((x) => x.mode)).toEqual(["build", "care", "teach"]);
    expect(d.flatMap((x) => x.laneIds)).not.toContain("x1");
    for (const x of d) expect(x.laneIds.length).toBeGreaterThanOrEqual(2);
  });
});
