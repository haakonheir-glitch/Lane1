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
  visibility: Visibility;
};
