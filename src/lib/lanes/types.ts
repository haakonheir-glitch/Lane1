/**
 * Client-safe shapes for the Lane Map. Built on the server from the taxonomy and the matching
 * results (src/lib/data/lanes.ts), so the browser never loads the full taxonomy.
 */
import type { Band, EntryNote } from "../matching";
import type { EntryId, FamilyId, LaneId, LevelId, ModeId } from "../taxonomy/generated";
import type { Penalty } from "../workdesign/model";
import type { TypicalDay } from "../workdesign/day";

/** "map" = the fulfilment × ability 2×2 (when most career paths have ability fit); the list views group by family or fit band. */
export type LaneView = "map" | "family" | "band";

/** A v2 fit's expected value and the range 80% of the draws fall in (10th–90th percentile), rounded. */
export type FitRange = { mean: number; p10: number; p90: number };

export type LaneRowData = {
  id: LaneId;
  name: string;
  familyId: FamilyId;
  familyName: string;
  entry: EntryId;
  modes: ModeId[];
  band: Band;
  /** Fit relative to the person's average lane, z units; null without enough data. */
  vsAverage: number | null;
  se: number | null;
  /** Lanes the person said they're considering, and the lane of their current job. */
  considering: boolean;
  current: boolean;
  /** Fulfilment fit, 50 = the person's average career path; null without enough data. */
  fulfilment: FitRange | null;
  /** Ability fit, 0–100 (100 = no shortfall); null without enough reasoning results. */
  ability: FitRange | null;
  /** Where the career's O*NET profile comes from ("estimated" profiles are marked in the UI). */
  provenance: "onet" | "estimated" | "unlinked" | null;
  /** Talent-selected career paths: never above "possible fit", with this note. */
  capNote?: string | null;
};

export type RoleRef = { id: string; title: string; level: LevelId; mode: ModeId; aka: string[] };

export type LadderRow = {
  level: LevelId;
  levelLabel: string;
  /** The ladder template's description of this step; null for levels the template doesn't name. */
  step: string | null;
  roles: RoleRef[];
  /** "start" = the person's realistic entry point; "current" = where they are now; "above" = the path. */
  marker: "start" | "current" | "above" | "below";
};

export type LaneDetail = {
  row: LaneRowData;
  description: string;
  riasec: string;
  entryText: string;
  /** What the work demands day to day, from the career path's demand tags. */
  dayToDay: string[];
  ladderName: string;
  ladder: LadderRow[];
  entryNote: EntryNote;
  /** note: set when the role's main O*NET interest is one of the person's two lowest. */
  topRoles: { role: RoleRef; reason: string; note: string | null }[];
  isco: { code: string; label: string }[];
  /** O*NET's picture of the work (Work Activities and Work Context); null without an O*NET profile. */
  day: TypicalDay | null;
  /** Matching v2's view of this career path: both fits, drivers and frictions, you against it. */
  v2: LaneDetailV2;
};

/** One driver or friction from matching v2, in fulfilment points against your average career path. */
export type FitDriver = { id: string; label: string; contribution: number };

/** You against the career on one value mode or working condition, both on 0–100 (different rulers: see DimOverlay). */
export type DimRow = {
  id: string;
  group: "mode" | "condition";
  name: string;
  archetype?: string;
  poles: [string, string];
  /** Your score and its 90% interval; null when not measured. */
  you: number | null;
  lo: number | null;
  hi: number | null;
  /** The career's O*NET-based level (percentile across occupations); null when O*NET has no data. */
  career: number | null;
  /** Working conditions only: which side of a mismatch hurts, and the gap on that side in points. */
  penalty?: Penalty;
  gap?: number | null;
};

export type LaneDetailV2 = {
  fulfilment: FitRange | null;
  ability: FitRange | null;
  /**
   * Share of draws in which this career path is in your top 10% (the strong-fit rule). With the
   * weight ensemble, the smaller of the shares under need-weighted and flat environment weighting,
   * which is what the band rests on.
   */
  pTop: number;
  /** True when pTop is the smaller of two weightings (the ensemble). */
  bothWeightings?: boolean;
  drivers: FitDriver[];
  frictions: FitDriver[];
  dims: DimRow[];
};


export type LaneFilterVocab = {
  families: { id: FamilyId; name: string }[];
};

/** Corporate = corporate and professional-firm ladders; own path = independent, performer, creator, founder. */
export type CareerCategory = "corporate" | "own_path" | "other";

/** One career path on the Career map's result lists, led by the best specific starting role. */
export type CareerPick = {
  row: LaneRowData;
  category: CareerCategory;
  /** The best-matching starting role in this career path, or null when it needs experience first. */
  role: { title: string; levelLabel: string; reason: string; note: string | null } | null;
  /** Up to two other starting roles, best first. */
  alsoRoles: string[];
  entryNote: EntryNote;
  /** What lifts this career path for the person: up to three positive drivers, strongest first. */
  why: string[];
  /** Construct ids of every positive driver, strongest first (for the trait connections view). */
  driverIds: string[];
  /** The path's ladder, entry level first, with the realistic starting step marked. */
  ladder: { label: string; marker: LadderRow["marker"] }[];
};

export type CareerPicks = { overall: CareerPick[]; corporate: CareerPick[]; ownPath: CareerPick[] };
