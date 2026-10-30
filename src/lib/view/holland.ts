/**
 * The Holland code as shown to the person (owner's decision, 2026-10-30): only the letters clearly
 * above the person's own average, so a code never claims more than the scores support. Pure.
 *
 * - "Clearly above": the area's raw score is above the mean of the person's six areas by more than
 *   1.645 × the standard error of that gap (a 90% interval that excludes the mean). The error uses
 *   each scale's published SEM (SD × √(1 − α), scoring/psychometrics.ts), or the planning values
 *   where none is published, and the gap's error is √(seᵢ²(1 − 1/n)² + Σⱼ≠ᵢ seⱼ²/n²), the same
 *   formula as the Work Design relative-strength test. It is measured on the raw scale, not in the
 *   person's own spread, so a nearly flat profile doesn't get a code it hasn't earned.
 * - A third letter that is above the mean but not clearly is shown as "(R, weak)"; one at or below
 *   the mean is dropped. A first or second letter that isn't clear ends the code there.
 * - The scoring's own three-letter code (scoring/interests.ts) is unchanged; this is presentation.
 */
import type { InterestScores } from "../scoring/interests";
import { lookup } from "../scoring/psychometrics";
import { ASSUMED_RELIABILITY } from "../scoring/self";
import { Z90 } from "../scoring/core";

export type HollandDisplay = {
  /** The letters clearly above the mean, highest first ("" when none is). */
  letters: string;
  /** A third letter above the mean but not clearly, or null. */
  weak: string | null;
  /** What to print: "ES", "ES (R, weak)", or null when no letter is clearly above the mean. */
  text: string | null;
};

const NONE: HollandDisplay = { letters: "", weak: null, text: null };
/** Planning SD of a 10-item interest sum where no norm is published: 20% of the 10–50 range. */
const PLANNING_RAW_SD = 8;

export function hollandDisplay(i: InterestScores | null | undefined): HollandDisplay {
  if (!i || !i.hollandCode || i.lowDifferentiation) return NONE;
  const scored = i.scales.filter((s) => s.raw !== null);
  const n = scored.length;
  if (n < 3) return NONE;
  const mean = scored.reduce((a, s) => a + s.raw!, 0) / n;
  const sem = (code: string) => {
    const p = lookup(`onet.${code}`);
    return p ? p.sd * Math.sqrt(1 - p.reliability) : PLANNING_RAW_SD * Math.sqrt(1 - ASSUMED_RELIABILITY.scale);
  };
  const gap = (code: string) => {
    const s = scored.find((x) => x.code === code);
    if (!s) return null;
    const others = scored.filter((x) => x !== s).reduce((a, x) => a + sem(x.code) ** 2, 0) / n ** 2;
    const se = Math.sqrt(sem(code) ** 2 * (1 - 1 / n) ** 2 + others);
    return { gap: s.raw! - mean, clear: s.raw! - mean > Z90 * se };
  };
  const top = i.hollandCode.split("");
  let letters = "";
  let weak: string | null = null;
  for (let k = 0; k < top.length; k++) {
    const g = gap(top[k]!);
    if (!g) break;
    if (g.clear) {
      letters += top[k];
      continue;
    }
    // Only a third letter may be shown as weak, and only when it is above the mean at all.
    if (k === 2 && letters.length === 2 && g.gap > 0) weak = top[k]!;
    break;
  }
  if (!letters) return NONE;
  return { letters, weak, text: weak ? `${letters} (${weak}, weak)` : letters };
}
