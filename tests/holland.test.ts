/**
 * The Holland code as shown (owner's decision, 2026-10-30): only letters clearly above the person's
 * own average; a weak third letter is shown as "(R, weak)" or dropped.
 */
import { describe, expect, it } from "vitest";
import { hollandDisplay } from "@/lib/view/holland";
import { addSelfScores } from "@/lib/scoring/self";
import type { InterestScores } from "@/lib/scoring/interests";
import type { ProfileScores } from "@/lib/scoring/profile";

const CODES = ["R", "I", "A", "S", "E", "C"] as const;

/** Interests with these raw sums (10–50), self-scored as the app does (published alphas, about .88). */
function interests(raw: Record<(typeof CODES)[number], number>): InterestScores {
  const scales = CODES.map((c) => ({ id: c, code: c, label: c, raw: raw[c], rawRange: [10, 50] as [number, number], answered: 10, items: 10, likeCount: 0, normed: null, visibility: "user" as const }));
  const sorted = [...scales].sort((a, b) => b.raw - a.raw);
  const p = {
    scoringVersion: "t",
    norms: { status: "pending", note: "" },
    sessions: [],
    personality: null,
    interests: { scales, hollandCode: sorted.slice(0, 3).map((s) => s.code).join(""), differentiation: sorted[0]!.raw - sorted[5]!.raw, elevation: 30, lowDifferentiation: false },
    values: null,
    reasoning: null,
    behaviour: null,
    completeness: { partial: true, missing: [] },
  } as ProfileScores;
  return addSelfScores(p).interests!;
}

describe("Holland code shown to the person", () => {
  it("keeps all three letters when all are clearly above the person's own average", () => {
    const h = hollandDisplay(interests({ R: 12, I: 14, A: 13, S: 44, E: 46, C: 42 }));
    expect(h.text).toBe("ESC");
    expect(h.weak).toBeNull();
  });

  it("marks a third letter that is above the average but not clearly as weak", () => {
    // R 31 is 4.3 points above this person's mean of 26.7; the gap's 90% margin is about 4.4 points.
    const i = interests({ R: 31, I: 14, A: 13, S: 44, E: 46, C: 12 });
    expect(hollandDisplay(i).text).toBe("ES (R, weak)");
    // Two points more and R is clearly above the mean.
    expect(hollandDisplay(interests({ R: 33, I: 14, A: 13, S: 44, E: 46, C: 12 })).text).toBe("ESR");
  });

  it("drops a third letter at or below the average, and stops at the first letter that isn't clear", () => {
    expect(hollandDisplay(interests({ R: 20, I: 20, A: 20, S: 44, E: 46, C: 20 })).text).toBe("ES");
    expect(hollandDisplay(interests({ R: 30, I: 29, A: 28, S: 31, E: 46, C: 27 })).text).toBe("E");
  });

  it("shows no code when nothing is clearly above the average (judged on the raw scale, not the person's own spread), or when interests are undifferentiated", () => {
    expect(hollandDisplay(interests({ R: 30, I: 31, A: 29, S: 32, E: 33, C: 28 })).text).toBeNull();
    expect(hollandDisplay({ ...interests({ R: 12, I: 14, A: 13, S: 44, E: 46, C: 42 }), lowDifferentiation: true }).text).toBeNull();
    expect(hollandDisplay(null).text).toBeNull();
  });
});
