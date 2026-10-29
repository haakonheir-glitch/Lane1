import { describe, expect, it } from "vitest";
import { ASSUMED_RELIABILITY, addSelfScores } from "@/lib/scoring/self";
import { Z90 } from "@/lib/scoring/core";
import type { ProfileScores } from "@/lib/scoring/profile";
import type { ScaleScore } from "@/lib/scoring/types";
import { resolveConstruct } from "@/lib/matching";
import { matchV2 } from "@/lib/matching/v2";
import { personInputs } from "@/lib/workdesign/person";
import { relativeOf } from "@/lib/view/profile";

const raw = (id: string, value: number | null): ScaleScore => ({ id, label: id, raw: value, rawRange: [1, 5], answered: 4, items: 4, normed: null, visibility: "user" });

/** A profile as real users have it today: raw scores, no population norms. */
function unnormed(interests: Record<string, number>, facets: Record<string, number>): ProfileScores {
  return {
    scoringVersion: "test",
    norms: { status: "pending", note: "" },
    sessions: [],
    personality: { facets: Object.entries(facets).map(([k, v]) => raw(k, v)), domains: [], honestyHumility: null },
    interests: {
      scales: Object.entries(interests).map(([k, v]) => ({ ...raw(k, v), rawRange: [10, 50] as [number, number], code: k as "R", likeCount: 0 })),
      hollandCode: null,
      differentiation: null,
      elevation: null,
      lowDifferentiation: false,
    },
    values: null,
    reasoning: null,
    behaviour: null,
    completeness: { partial: true, missing: [] },
  };
}

const RIASEC = { R: 14, I: 30, A: 22, S: 26, E: 44, C: 18 };

describe("addSelfScores", () => {
  const p = addSelfScores(unnormed(RIASEC, { E3: 4.5, N6: 1.5, C2: 3, O5: 3.5 }));

  it("standardises each instrument within the person (mean 0, SD 1)", () => {
    const zs = p.interests!.scales.map((s) => s.self!.z);
    expect(zs.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
    expect(Math.sqrt(zs.reduce((a, b) => a + b * b, 0) / zs.length)).toBeCloseTo(1, 10);
    expect(p.interests!.scales.find((s) => s.id === "E")!.self!.z).toBeGreaterThan(1);
  });

  it("uses the published reliability where there is one, the assumed one otherwise, says which, and sizes the 90% range from it", () => {
    // E3 Assertiveness: Kajonius & Johnson (2019) Table A1 alpha .86.
    const f = p.personality!.facets[0]!.self!;
    expect(f).toMatchObject({ reliability: 0.86, assumedReliability: false });
    expect(f.ci[1] - f.z).toBeCloseTo(Z90 * Math.sqrt(1 - 0.86), 10);
    // A scale with no entry in the table falls back to the planning value and is marked as such.
    const odd = addSelfScores(unnormed(RIASEC, { X1: 4.5, X2: 1.5, X3: 3 })).personality!.facets[0]!.self!;
    expect(odd).toMatchObject({ reliability: ASSUMED_RELIABILITY.facet, assumedReliability: true });
    expect(odd.ci[1] - odd.z).toBeCloseTo(Z90 * Math.sqrt(1 - ASSUMED_RELIABILITY.facet), 10);
  });

  it("gives no self score when there are too few scales or no spread", () => {
    expect(addSelfScores(unnormed({ R: 20, I: 30 }, {})).interests!.scales.every((s) => s.self === null)).toBe(true);
    expect(addSelfScores(unnormed({ R: 20, I: 20, A: 20 }, {})).interests!.scales.every((s) => s.self === null)).toBe(true);
  });

  it("never invents population scores", () => {
    expect([...p.interests!.scales, ...p.personality!.facets].every((s) => s.normed === null)).toBe(true);
  });
});

describe("own results without norms", () => {
  const p = addSelfScores(unnormed(RIASEC, { E3: 4.5, N6: 1.5, C2: 3, O5: 3.5, A3: 2.5, E1: 4 }));

  it("matching falls back to self scores, labelled as such", () => {
    expect(resolveConstruct("interests.E", p)).toMatchObject({ basis: "self" });
    expect(resolveConstruct("neo.E3", p)).toMatchObject({ basis: "self" });
  });

  it("puts lanes in bands instead of 'not enough data'", () => {
    const m = matchV2({ inputs: personInputs(p) }, { draws: 120 }).lanes;
    expect(m.some((x) => x.band === "strong")).toBe(true);
    expect(m.some((x) => x.band === "insufficient")).toBe(false);
    const best = m.find((x) => x.laneId === "b2b_sales")!;
    expect(best.band).toBe("strong");
  });

  it("relative-strength tags work on self scores", () => {
    const rel = relativeOf(p.interests!.scales);
    expect(rel.E).toBe("strength");
    // Interests use the published Short-IP alphas (.85–.90) once transcribed, so the 90% ranges are
    // narrower than with the planning .75: R (lowest) now clears more than half of the other five.
    expect(p.interests!.scales.find((s) => s.id === "R")!.self).toMatchObject({ reliability: 0.88, assumedReliability: false });
    expect(rel.R).toBe("weakness");
  });
});
