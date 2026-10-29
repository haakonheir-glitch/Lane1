/**
 * Norms applied when a profile is read, not when a session is scored. Stored session scores keep
 * the `normed` they were scored with, so a newly transcribed norm (psychometrics.ts) would
 * otherwise reach only people who finish a session after it lands. Re-norming from the stored raw
 * score is exact: `normed` is a pure function of the raw score and the table. Pure.
 */
import { normed, type Psychometric } from "./core";
import { lookup, PSYCHOMETRICS, type SourcedPsychometric } from "./psychometrics";
import type { ProfileScores } from "./profile";
import type { ScaleScore } from "./types";

type Table = Record<string, SourcedPsychometric | Psychometric | null>;

function renorm<T extends ScaleScore>(s: T, key: string, table: Table): T {
  const p = lookup(key, table);
  return { ...s, normed: s.raw !== null && p ? normed(s.raw, p) : null };
}

/** Every interest scale, facet, domain and Honesty-Humility normed against `table` (null where it has no entry). */
export function applyNorms(p: ProfileScores, table: Table = PSYCHOMETRICS): ProfileScores {
  const out: ProfileScores = {
    ...p,
    interests: p.interests ? { ...p.interests, scales: p.interests.scales.map((s) => renorm(s, `onet.${s.code}`, table)) } : null,
    personality: p.personality
      ? {
          facets: p.personality.facets.map((s) => renorm(s, `neo.${s.id}`, table)),
          domains: p.personality.domains.map((s) => renorm(s, `neo.${s.id}`, table)),
          honestyHumility: p.personality.honestyHumility ? renorm(p.personality.honestyHumility, "hh.HH", table) : null,
        }
      : null,
  };
  const b = normBasis(out);
  const status = b.interests === "population" || b.personality === "population" ? "provisional" : "pending";
  return { ...out, norms: { status, note: noteFor(b) } };
}

export type Basis = "population" | "self";

/**
 * What each instrument is compared with. An instrument is population-normed only when every scale
 * the person has a score on is normed: a mix would put two rulers in one chart.
 */
export function normBasis(p: ProfileScores): { interests: Basis; personality: Basis } {
  const all = (xs: ScaleScore[]) => {
    const scored = xs.filter((s) => s.raw !== null);
    return scored.length > 0 && scored.every((s) => s.normed) ? "population" : "self";
  };
  return {
    interests: all(p.interests?.scales ?? []),
    personality: all([...(p.personality?.domains ?? []), ...(p.personality?.facets ?? [])]),
  };
}

function noteFor(b: { interests: Basis; personality: Basis }): string {
  if (b.interests === "population" && b.personality === "population") return "Interests and personality compared with published norms (provisional until Lane has its own norm sample).";
  if (b.interests === "population") return "Interests compared with published norms (provisional until Lane has its own norm sample); personality compared with your own average until its norms are loaded.";
  if (b.personality === "population") return "Personality compared with published norms (provisional until Lane has its own norm sample); interests compared with your own average until their norms are loaded.";
  return "Norm tables not yet loaded: scores shown without percentiles.";
}
