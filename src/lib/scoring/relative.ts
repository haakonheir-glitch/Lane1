/**
 * "Relative to yourself", done correctly (BLUEPRINT §7):
 *  1. Norm each scale first (z-scores). Never ipsatize raw answers.
 *  2. Rank the person's own z-scores.
 *  3. A gap between two of your own scores is noisier than either score:
 *     SE_diff = √(2 − r₁ − r₂) in SD units; the gap must exceed 1.96 × SE_diff.
 *  4. Call something a relative strength only when it passes that test; otherwise
 *     say "no clear difference".
 *
 * A scale is labelled a relative strength when it is clearly above more than half of the
 * person's other scales in the set, and a relative weakness when clearly below more than half
 * (PLAN.md decision: the blueprint defines the pairwise test, not how many pairs must pass).
 */
import { isClearDifference } from "./core";

export type Relative = "strength" | "weakness" | "none";

export function relativeStrengths(scales: { id: string; z: number; reliability: number }[]): Record<string, Relative> {
  const out: Record<string, Relative> = {};
  for (const s of scales) {
    const others = scales.filter((o) => o.id !== s.id);
    if (others.length === 0) {
      out[s.id] = "none";
      continue;
    }
    const above = others.filter((o) => s.z > o.z && isClearDifference(s.z, s.reliability, o.z, o.reliability)).length;
    const below = others.filter((o) => s.z < o.z && isClearDifference(s.z, s.reliability, o.z, o.reliability)).length;
    const half = others.length / 2;
    out[s.id] = above > half ? "strength" : below > half ? "weakness" : "none";
  }
  return out;
}
