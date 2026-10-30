import { describe, expect, it } from "vitest";
import { buildCareerPicks, careerCategory } from "@/lib/data/lanes";
import { sampleProfile } from "@/lib/mock/profile";
import { LANES, taxonomy } from "@/lib/taxonomy";

const noExperience = { current: null, considering: [] } as never;

describe("Career map picks", () => {
  const picks = buildCareerPicks(sampleProfile, noExperience);

  it("gives 3–4 directions of 2–3 career paths, then five more corporate and five more non-corporate, no repeats", () => {
    expect(picks.directions.length).toBeGreaterThanOrEqual(3);
    expect(picks.directions.length).toBeLessThanOrEqual(4);
    for (const d of picks.directions) {
      expect(d.picks.length, d.name).toBeGreaterThanOrEqual(2);
      expect(d.picks.length, d.name).toBeLessThanOrEqual(3);
      expect(d.picks.every((p) => p.direction?.id === d.id)).toBe(true);
    }
    expect(picks.overall.map((p) => p.row.id)).toEqual(picks.directions.flatMap((d) => d.picks.map((p) => p.row.id)));
    const ids = [...picks.overall, ...picks.corporate, ...picks.ownPath].map((p) => p.row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(picks.corporate).toHaveLength(5);
    expect(picks.ownPath).toHaveLength(5);
    expect(picks.corporate.every((p) => p.category === "corporate")).toBe(true);
    expect(picks.ownPath.every((p) => p.category === "own_path")).toBe(true);
  });

  it("orders each direction by fulfilment fit, and the other lists by band, then fit", () => {
    for (const d of picks.directions)
      for (let i = 1; i < d.picks.length; i++) expect(d.picks[i - 1]!.row.fulfilment!.mean).toBeGreaterThanOrEqual(d.picks[i]!.row.fulfilment!.mean);
    const order = ["strong", "testing", "unlikely"];
    for (const list of [picks.corporate, picks.ownPath])
      for (let i = 1; i < list.length; i++) {
        const [a, b] = [list[i - 1]!.row, list[i]!.row];
        expect(order.indexOf(a.band) < order.indexOf(b.band) || (a.band === b.band && (a.vsAverage ?? 0) >= (b.vsAverage ?? 0))).toBe(true);
      }
  });

  it("leads with a specific starting role, never management", () => {
    for (const p of [...picks.overall, ...picks.corporate, ...picks.ownPath]) {
      if (!p.role) continue;
      const lane = LANES.find((l) => l.id === p.row.id)!;
      const role = lane.roles.find((r) => r.title === p.role!.title)!;
      expect(taxonomy.levels[role.level].track).not.toBe("mgmt");
      expect(p.role.reason.length).toBeGreaterThan(10);
    }
  });

  it("puts poker, content creation and professional sport outside corporate", () => {
    const byName = (n: string) => careerCategory(LANES.find((l) => l.name === n)!);
    expect(byName("Professional strategy games")).toBe("own_path");
    expect(byName("Content creation")).toBe("own_path");
    expect(byName("Professional sport")).toBe("own_path");
    expect(byName("B2B sales")).toBe("corporate");
    expect(byName("Politics & elected office")).toBe("other");
    expect(byName("Nursing & midwifery")).toBe("other");
  });

  it("never lists nonprofit, care or coaching work as corporate", () => {
    for (const l of LANES.filter((l) => ["healthcare", "care_social", "education"].includes(l.family) || l.id === "sports_coaching")) {
      expect(careerCategory(l), l.name).not.toBe("corporate");
    }
    expect(careerCategory(LANES.find((l) => l.id === "nonprofit")!)).toBe("other");
  });
});
