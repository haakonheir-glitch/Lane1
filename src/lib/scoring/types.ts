import type { Normed } from "./core";

/** "hidden": experimental scales are scored and stored but never shown to users (file status: EXPERIMENTAL). */
export type Visibility = "user" | "hidden";

export type Responses = Record<string, number | null | undefined>;

export type ScaleScore = {
  id: string;
  label: string;
  /** Raw score on the instrument's own metric; null when too few items were answered. */
  raw: number | null;
  rawRange: [number, number];
  answered: number;
  items: number;
  /** Norm-referenced score; null until psychometrics exist for this scale. */
  normed: Normed | null;
  /** Score relative to the person's own other scales on the same instrument (see scoring/self.ts). */
  self?: SelfScore | null;
  visibility: Visibility;
};

/**
 * A scale compared with the person's own other scales on the same instrument, in SD units of
 * that person's spread. Needs no population norms. `assumedReliability` is true while the
 * published reliability isn't transcribed and the BLUEPRINT §7 planning value is used.
 */
export type SelfScore = { z: number; ci: [number, number]; reliability: number; assumedReliability: boolean };
