/**
 * "How you work best" (report chapter 01, Phase 3): the person's archetype blend, value modes and
 * working conditions with 90% intervals, and what drains them, as one structured object with stable
 * dimension ids ("mode.<id>", "env.<id>", the same ids matching v2's drivers use). The report draws
 * its charts from it and Claude writes the best workday from it, so every sentence can cite these ids.
 *
 * What drains you: the working conditions where a mismatch costs this person most. In matching v2 a
 * point of mismatch on a dimension costs in proportion to how strong the need is on the side that can
 * hurt (fit.ts needWeight), so the drains are the dimensions with the strongest reliable needs (the
 * seven need-weighted conditions; cognitive challenge is its own fit component and isn't ranked), each
 * named by the pole that drains (too little autonomy: "Clear direction and set procedures"). A need is
 * reliable when the score is clear of the scale midpoint by more than its 90% interval. `common` is
 * the share of career paths that miss the need by more than DRAIN_GAP points (how often it bites).
 * Pure.
 */
import { ENVIRONMENT, VALUE_MODES, type Penalty } from "./model";
import type { Relative, WorkDesignProfile } from "./person";
import { needWeight, penaltyOf } from "../matching/v2/fit";
import type { ArchetypeBlend, LaneProfileV2, MatchResultV2 } from "../matching/v2/types";

export type ModeView = { id: string; name: string; archetype: string; poles: [string, string]; value: number | null; lo: number | null; hi: number | null; relative: Relative };
export type ConditionView = { id: string; name: string; poles: [string, string]; penalty: Penalty; value: number | null; lo: number | null; hi: number | null };
export type Drain = {
  id: string;
  name: string;
  /** Which way a mismatch hurts this person. */
  side: "too_little" | "too_much";
  /** The pole of the dimension that drains them, in O*NET-anchored plain words. */
  drainedBy: string;
  /** Need strength on the side that hurts, 0–1 (the weight a point of mismatch carries). */
  need: number;
  /** Share of all career paths that miss the need by more than DRAIN_GAP points (0–1). */
  common: number;
};
export type WorkBest = {
  version: string;
  matching: string | null;
  archetype: Pick<ArchetypeBlend, "top2" | "tentative" | "reason" | "caveat"> & { blend: { id: string; archetype: string; name: string; share: number }[] } | null;
  modes: ModeView[];
  conditions: ConditionView[];
  /** Value-mode pairs built from the same scores, so they can't be told apart. */
  inseparable: [string, string][];
  drains: Drain[];
};

/** Penalty points that count as "missing the need" for `common`. Provisional, like every v2 threshold. */
export const DRAIN_GAP = 15;
/** Need strength below which a dimension is not reported as a drain (10 points from the midpoint). */
const MIN_NEED = 0.2;
const Z90 = 1.645;
const r1 = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number) => Math.max(0, Math.min(100, x));
const interval = (v: number | null, se: number | null) => (v === null || se === null ? { value: null, lo: null, hi: null } : { value: r1(v), lo: r1(clamp(v - Z90 * se)), hi: r1(clamp(v + Z90 * se)) });

/** The person's "How you work best" data, from their Work Design profile and (when matching v2 ran) its result. */
export function workBest(wd: WorkDesignProfile, result: MatchResultV2 | null, lanes: Record<string, LaneProfileV2>): WorkBest {
  const modes = VALUE_MODES.map((d) => {
    const s = wd.valueModes.find((m) => m.id === d.id)!;
    return { id: `mode.${d.id}`, name: d.name, archetype: d.archetype!, poles: d.poles, ...interval(s.value, s.se), relative: s.relative };
  });
  const conditions = ENVIRONMENT.map((d) => {
    const s = wd.environment.find((m) => m.id === d.id)!;
    return { id: `env.${d.id}`, name: d.name, poles: d.poles, penalty: d.penalty!, ...interval(s.value, s.se) };
  });
  const careers = Object.values(lanes);
  const drains = ENVIRONMENT.filter((d) => d.id !== "challenge").flatMap((d): Drain[] => {
    const s = wd.environment.find((m) => m.id === d.id)!;
    if (s.value === null || s.se === null || Math.abs(s.value - 50) <= Z90 * s.se) return [];
    const p = s.value;
    const need = needWeight(d.penalty!, p, 0);
    if (need < MIN_NEED) return [];
    const side = d.penalty === "deficit" || (d.penalty === "two_sided" && p > 50) ? "too_little" : "too_much";
    const known = careers.map((c) => c.environment[d.id]).filter((c): c is number => c !== null && c !== undefined);
    const common = known.length ? known.filter((c) => penaltyOf(d.penalty!, p, c) > DRAIN_GAP).length / known.length : 0;
    return [{ id: `env.${d.id}`, name: d.name, side, drainedBy: side === "too_little" ? d.poles[0] : d.poles[1], need: Math.round(need * 100) / 100, common: Math.round(common * 100) / 100 }];
  })
    .sort((a, b) => b.need - a.need || a.id.localeCompare(b.id))
    .slice(0, 3);
  const a = result?.archetype ?? null;
  return {
    version: wd.version,
    matching: result?.version ?? null,
    archetype: a && {
      blend: a.blend.map((x) => ({ ...x, id: `mode.${x.id}` })),
      top2: a.top2.map((x) => ({ ...x, id: `mode.${x.id}` })),
      tentative: a.tentative,
      reason: a.reason,
      caveat: a.caveat,
    },
    modes,
    conditions,
    inseparable: wd.inseparable.map(([x, y]) => [`mode.${x}`, `mode.${y}`]),
    drains,
  };
}

/** Every dimension id a WorkBest object names (what a best-workday sentence may cite). */
export const workBestIds = (w: WorkBest): Set<string> => new Set([...w.modes.map((m) => m.id), ...w.conditions.map((c) => c.id)]);
