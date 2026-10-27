/**
 * Client-safe shapes for the Lane Map. Built on the server from the taxonomy and the matching
 * results (src/lib/data/lanes.ts), so the browser never loads the full taxonomy.
 */
import type { Band, Driver, EntryNote } from "../matching";
import type { EntryId, FamilyId, LaneId, LevelId, ModeId } from "../taxonomy/generated";

export type LaneView = "family" | "band";

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
  topRoles: { role: RoleRef; reason: string }[];
  drivers: Driver[];
  unscoredTags: string[];
  isco: { code: string; label: string }[];
  overlay: MatchOverlay;
};

/** One axis per construct the matching uses for a path. `you` is z relative to your own average (null = not measured). */
export type MatchOverlay = { axes: { label: string; kind: "interest" | "demand"; demand: number; you: number | null }[] };

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
  role: { title: string; levelLabel: string; reason: string } | null;
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
