/**
 * Phase 3 data: the Career map's native v2 fields (rows, detail, typical day), "How you work best"
 * (work design view, drains).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleProfile } from "@/lib/mock/profile";
import { buildLaneDetail, buildLaneMap, reportLanes, workBestFor } from "@/lib/data/lanes";
import { typicalDay } from "@/lib/workdesign/day";
import { workBest, DRAIN_GAP } from "@/lib/workdesign/best";
import { personWorkDesign } from "@/lib/workdesign/person";
import { ENVIRONMENT, VALUE_MODES } from "@/lib/workdesign/model";
import { LANE_PROFILES_V2 } from "@/lib/matching/v2";
import { LANES } from "@/lib/taxonomy";

const none = { current: null, considering: [] };

afterEach(() => vi.unstubAllEnvs());

describe("career map under matching v2", () => {
  const { rows } = buildLaneMap(sampleProfile, none);

  it("gives every row both fits as JSON-safe ranges, with provenance", () => {
    const plotted = rows.filter((r) => r.band !== "insufficient");
    expect(plotted.length).toBeGreaterThan(150);
    for (const r of plotted) {
      expect(r.fulfilment, r.id).not.toBeNull();
      expect(r.fulfilment!.p10).toBeLessThanOrEqual(r.fulfilment!.mean);
      expect(r.fulfilment!.mean).toBeLessThanOrEqual(r.fulfilment!.p90);
      expect(r.provenance).toMatch(/onet|estimated/);
    }
    // The sample has reasoning scores, so ability fit is there (the 2×2's horizontal axis).
    expect(rows.filter((r) => r.ability).length).toBeGreaterThan(150);
    expect(JSON.stringify(rows)).not.toMatch(/NaN/);
    expect(JSON.parse(JSON.stringify(rows))).toEqual(rows);
  });

  it("opens a detail with drivers, frictions, you against the career, and a typical day", () => {
    const d = buildLaneDetail("b2b_sales", sampleProfile, none)!;
    expect(d.v2).not.toBeNull();
    expect(d.v2!.dims.filter((x) => x.group === "mode")).toHaveLength(VALUE_MODES.length);
    expect(d.v2!.dims.filter((x) => x.group === "condition")).toHaveLength(ENVIRONMENT.length);
    expect(d.v2!.dims.find((x) => x.id === "mode.influence")!.career).toBeGreaterThan(80);
    for (const x of d.v2!.dims) if (x.you !== null) expect(x.lo! <= x.you && x.you <= x.hi!).toBe(true);
    expect([...d.v2!.drivers, ...d.v2!.frictions].every((x) => x.id && x.label)).toBe(true);
    expect(d.day!.activities.map((a) => a.name)).toContain("Selling or Influencing Others");
    expect(d.topRoles.length).toBeGreaterThan(0);
  });

  it("puts v2 fits and frictions in the report's career paths, never the word lane", () => {
    const cps = reportLanes(sampleProfile, none);
    expect(cps.length).toBeGreaterThan(0);
    expect(cps.every((c) => c.fulfilmentFit && ["strong", "possible", "unlikely", "insufficient"].includes(c.band))).toBe(true);
    expect(JSON.stringify(cps)).not.toMatch(/\blanes?\b/i);
  });
});

describe("starting roles under v2-0.5", () => {
  it("are ranked from O*NET data where the role has its own link", () => {
    const reasons = LANES.slice(0, 60).flatMap((l) => buildLaneDetail(l.id, sampleProfile, none)?.topRoles ?? []);
    expect(reasons.some((r) => /O\*NET profile/.test(r.reason))).toBe(true);
    expect(reasons.some((r) => /draws on your/.test(r.reason))).toBe(true);
    for (const r of reasons) if (r.note) expect(r.note).toMatch(/one of your two lowest interests/);
  });
});

describe("typical day", () => {
  it("exists for every career path, with O*NET names and descriptions", () => {
    for (const l of LANES) {
      const d = typicalDay(l.id);
      expect(d, l.id).not.toBeNull();
      expect(d!.activities.length).toBeGreaterThanOrEqual(3);
      expect(d!.activities.every((a) => a.name && a.description)).toBe(true);
    }
  });
});

describe("how you work best", () => {
  const wb = workBestFor(sampleProfile);

  it("names every mode and condition by a stable id, with intervals around the score", () => {
    expect(wb.modes.map((m) => m.id)).toEqual(VALUE_MODES.map((m) => `mode.${m.id}`));
    expect(wb.conditions.map((c) => c.id)).toEqual(ENVIRONMENT.map((d) => `env.${d.id}`));
    for (const m of [...wb.modes, ...wb.conditions]) if (m.value !== null) expect(m.lo! <= m.value && m.value <= m.hi!).toBe(true);
    expect(wb.archetype!.top2[0]!.id).toMatch(/^mode\./);
    expect(wb.inseparable.flat().every((id) => id.startsWith("mode."))).toBe(true);
  });

  it("drains only reliable, strong needs, named by the pole that drains, most costly first", () => {
    for (const d of wb.drains) {
      const c = wb.conditions.find((x) => x.id === d.id)!;
      expect(Math.abs(c.value! - 50)).toBeGreaterThan((c.hi! - c.lo!) / 2 - 0.2);
      expect(c.poles).toContain(d.drainedBy);
    }
    const needs = wb.drains.map((d) => d.need);
    expect([...needs].sort((a, b) => b - a)).toEqual(needs);
  });

  it("finds the drain on a made-up profile that needs autonomy and hates deadlines", () => {
    const wd = personWorkDesign(sampleProfile);
    const tweak = { ...wd, environment: wd.environment.map((e) => (e.id === "autonomy" ? { ...e, value: 95, se: 3 } : e.id === "pace" ? { ...e, value: 8, se: 3 } : { ...e, value: 50, se: 3 })) };
    const w = workBest(tweak, null, LANE_PROFILES_V2);
    expect(w.drains.map((d) => d.id)).toEqual(["env.autonomy", "env.pace"]);
    expect(w.drains[0]).toMatchObject({ side: "too_little", drainedBy: "Clear direction and set procedures" });
    expect(w.drains[1]).toMatchObject({ side: "too_much", drainedBy: "Constant deadlines" });
    expect(w.drains[0]!.common).toBeGreaterThan(0);
    // Cognitive challenge is its own fit component, not need-weighted, so it never ranks as a drain.
    const keen = { ...tweak, environment: tweak.environment.map((e) => (e.id === "challenge" ? { ...e, value: 98, se: 2 } : e)) };
    expect(workBest(keen, null, LANE_PROFILES_V2).drains.map((d) => d.id)).toEqual(["env.autonomy", "env.pace"]);
    expect(DRAIN_GAP).toBeGreaterThan(0);
  });
});
