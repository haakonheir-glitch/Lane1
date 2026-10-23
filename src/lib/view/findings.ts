/**
 * Presentation helpers for the profile report: the cover's key figures, the basis line and
 * the one-sentence finding that leads each section. They only read computed scores; nothing
 * here scores, ranks or norms anything new. Pure.
 */
import type { ProfileScores } from "@/lib/scoring/profile";
import type { ScaleScore } from "@/lib/scoring/types";
import { fmtBand, relativeOf } from "./profile";

export type KeyFigure = {
  id: "interests" | "values" | "personality" | "reasoning";
  label: string;
  /** The headline figure, or null while the session that produces it isn't done. */
  value: string | null;
  detail: string;
  /** What the figure rests on: instrument and amount of evidence. */
  source: string;
};

const fmtSelf = (z: number) => `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}`;

/** The comparable z for a scale: population-normed when available, else relative to the person. */
const zOf = (s: ScaleScore) => s.normed?.z ?? s.self?.z ?? null;

const answered = (xs: ScaleScore[]) => xs.reduce((n, s) => n + s.answered, 0);

/** The domain that stands out: a tested relative strength first, else the highest comparable score. */
export function standoutDomain(p: ProfileScores): ScaleScore | null {
  const d = (p.personality?.domains ?? []).filter((x) => zOf(x) !== null);
  if (!d.length) return null;
  const rel = relativeOf(d);
  const strong = d.filter((x) => rel[x.id] === "strength");
  const pool = strong.length ? strong : d;
  return [...pool].sort((a, b) => zOf(b)! - zOf(a)!)[0]!;
}

export function keyFigures(p: ProfileScores): KeyFigure[] {
  const i = p.interests;
  const ranked = i ? [...i.scales].sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0)) : [];
  const values = p.values?.filter((v) => v.visibility === "user").sort((a, b) => a.rank - b.rank) ?? [];
  const top = standoutDomain(p);
  const rel = top && p.personality ? relativeOf(p.personality.domains)[top.id] : undefined;
  const general = p.reasoning?.generalAbility;

  return [
    {
      id: "interests",
      label: "Interests",
      value: i ? (i.hollandCode ?? (i.lowDifferentiation ? "Even" : "—")) : null,
      detail: i ? (i.hollandCode ? `Holland code · ${ranked[0]!.label} first` : "No single area leads") : "Session S1",
      source: i ? `Interest Profiler · ${answered(i.scales)} items` : "Not done yet",
    },
    {
      id: "values",
      label: "Work values",
      value: values[0]?.label ?? null,
      detail: values.length > 1 ? `Ranked first · then ${values[1]!.label}` : values.length ? "Ranked first" : "Session S1",
      source: values.length ? `Card sort · ${values.length} values` : "Not done yet",
    },
    {
      id: "personality",
      label: "Personality",
      value: top?.label ?? null,
      detail: top
        ? top.normed
          ? `${rel === "strength" ? "Relative strength" : "Highest domain"} · ${fmtBand(top.normed)}`
          : `${rel === "strength" ? "Relative strength" : "Highest domain"} · ${fmtSelf(top.self!.z)} vs your average`
        : "Session S2",
      source: p.personality ? `IPIP-NEO-120 · ${answered(p.personality.facets)} items` : "Not done yet",
    },
    {
      id: "reasoning",
      label: "Reasoning",
      value: general ? `P${general.percentileBand[0]}–${general.percentileBand[1]}` : null,
      detail: general ? "General reasoning · 90% range" : p.reasoning ? "Not enough scored items" : "Sessions S3 and S4",
      source: p.reasoning ? "Provisional norms · 5 tasks" : "Not done yet",
    },
  ];
}

/** What each part of the profile is compared with, in one line. */
export function basisLine(p: ProfileScores): string {
  const selfOnly = !(p.personality?.domains.some((d) => d.normed) || p.interests?.scales.some((s) => s.normed));
  const parts = [selfOnly ? "Interests, values and personality: compared with yourself" : "Interests and personality: compared with published norms"];
  if (p.reasoning) parts.push("reasoning: compared with adults 18–35, provisional norms");
  return parts.join(" · ");
}

/** One plain sentence that leads each section. Hedged where the measurement is. */
export function findings(p: ProfileScores) {
  const i = p.interests;
  const ranked = i ? [...i.scales].sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0)) : [];
  const values = p.values?.filter((v) => v.visibility === "user").sort((a, b) => a.rank - b.rank) ?? [];
  const domains = p.personality?.domains.filter((d) => zOf(d) !== null) ?? [];
  const domainRel = relativeOf(domains);
  const strengths = domains.filter((d) => domainRel[d.id] === "strength").map((d) => d.label);
  const areas = p.reasoning?.areas ?? [];
  const areaRel = relativeOf(areas);
  const areaStrengths = areas.filter((a) => areaRel[a.id] === "strength").map((a) => a.label);
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? ""));

  return {
    interests: i
      ? i.hollandCode
        ? `${ranked[0]!.label} first, then ${ranked[1]!.label} and ${ranked[2]!.label}.`
        : "Your six interest areas sit close together; no single area leads yet."
      : null,
    values: values.length > 1 ? `${values[0]!.label} matters most to you, then ${values[1]!.label}.` : null,
    personality: domains.length
      ? strengths.length
        ? `${list(strengths)} stand${strengths.length === 1 ? "s" : ""} out from the rest of your profile.`
        : "No domain stands out from the others by more than the measurement can resolve."
      : null,
    reasoning: areas.length
      ? areaStrengths.length
        ? `${list(areaStrengths)} came out as a clear relative strength.`
        : "No reasoning area stands out clearly from the others."
      : null,
  };
}
