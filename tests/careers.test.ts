import { describe, expect, it } from "vitest";
import { buildCareerPicks, careerCategory } from "@/lib/data/lanes";
import { sampleProfile } from "@/lib/mock/profile";
import { LANES, taxonomy } from "@/lib/taxonomy";

const noExperience = { current: null, considering: [] } as never;

describe("Career map picks", () => {
  const picks = buildCareerPicks(sampleProfile, noExperience);

  it("gives five best fits overall, then five more corporate and five more non-corporate, no repeats", () => {
    const ids = [...picks.overall, ...picks.corporate, ...picks.ownPath].map((p) => p.row.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(picks.overall).toHaveLength(5);
    expect(picks.corporate).toHaveLength(5);
    expect(picks.ownPath).toHaveLength(5);
    expect(picks.corporate.every((p) => p.category === "corporate")).toBe(true);
    expect(picks.ownPath.every((p) => p.category === "own_path")).toBe(true);
  });

  it("keeps the map's order: band first, then fit", () => {
    const order = ["strong", "testing", "unlikely"];
    for (const list of [picks.overall, picks.corporate, picks.ownPath])
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
