import { describe, expect, it } from "vitest";
import { sampleProfile } from "@/lib/mock/profile";
import { basisLine, findings, keyFigures, standoutDomain } from "@/lib/view/findings";
import type { ProfileScores } from "@/lib/scoring/profile";
import { hollandDisplay } from "@/lib/view/holland";

describe("report cover and findings", () => {
  it("reads the four headline figures from computed scores", () => {
    const f = keyFigures(sampleProfile);
    expect(f.map((x) => x.id)).toEqual(["interests", "values", "personality", "reasoning"]);
    // Only letters clearly above the comparison point (tests/holland.test.ts).
    expect(f[0]!.value).toBe(hollandDisplay(sampleProfile.interests).text);
    expect(f[1]!.value).toBe(sampleProfile.values!.find((v) => v.rank === 1)!.label);
    expect(f[2]!.value).toBe(standoutDomain(sampleProfile)!.label);
    const [lo, hi] = sampleProfile.reasoning!.generalAbility!.percentileBand;
    expect(f[3]!.value).toBe(`P${lo}–${hi}`);
  });

  it("shows sessions still to do instead of figures", () => {
    const empty: ProfileScores = { ...sampleProfile, interests: null, values: null, personality: null, reasoning: null };
    expect(keyFigures(empty).map((x) => x.value)).toEqual([null, null, null, null]);
    expect(Object.values(findings(empty)).every((x) => x === null)).toBe(true);
  });

  it("names a tested relative strength first, and says what each part is compared with", () => {
    expect(findings(sampleProfile).personality).toMatch(/stands? out/);
    expect(basisLine(sampleProfile)).toMatch(/provisional norms/);
  });
});
