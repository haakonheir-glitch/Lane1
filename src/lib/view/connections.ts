/**
 * The trait → career connection view: the person's clear strengths on the left, their best career
 * paths on the right, and a line wherever a strength is one of the drivers the matching function
 * reported for that path. Reads match output and tags only. Pure.
 */
import type { ProfileScores } from "../scoring/profile";
import type { CareerPick } from "../lanes/types";
import { relativeOf } from "./profile";

export type Trait = { key: string; label: string; kind: string; basis: "strength" | "ranked first" };
export type Connections = { traits: Trait[]; paths: { id: string; name: string; band: CareerPick["row"]["band"]; keys: string[] }[] };

const DOMAIN_OF: Record<string, string> = { N: "Neuroticism", E: "Extraversion", O: "Openness", A: "Agreeableness", C: "Conscientiousness" };
const AREA_OF: Record<string, string> = { matrix: "reasoning", series: "reasoning", number_series: "reasoning", quant: "quantitative", rotation: "spatial", symbol_match: "speed" };
const VALUE_OF: Record<string, string> = { independence: "Independence", working_conditions: "Working Conditions", achievement: "Achievement", recognition: "Recognition", relationships: "Relationships", support: "Support" };

/** Which trait a matching driver belongs to, or null (e.g. a low-scored, reversed construct). */
export function traitKeyOf(constructId: string): string | null {
  const m = /^([a-z_]+)\.([A-Za-z0-9_]+)(\((-|phase2)\))?$/.exec(constructId);
  if (!m || m[4]) return null;
  const [, prefix, key] = m;
  if (prefix === "interests") return `interest:${key}`;
  if (prefix === "neo") return DOMAIN_OF[key![0]!] ? `domain:${DOMAIN_OF[key![0]!]}` : null;
  if (prefix === "values") return VALUE_OF[key!] ? `value:${VALUE_OF[key!]}` : null;
  if (prefix === "cognitive") return AREA_OF[key!] ? `area:${AREA_OF[key!]}` : null;
  // Matching v2's reasoning-strengths drivers carry the area id itself (reasoning.spatial).
  if (prefix === "reasoning") return ["reasoning", "quantitative", "spatial", "memory", "speed"].includes(key!) ? `area:${key}` : null;
  return null;
}

export function connections(p: ProfileScores, picks: CareerPick[], max = 4): Connections {
  const traits: Trait[] = [];
  const i = p.interests;
  if (i) {
    const rel = relativeOf(i.scales);
    for (const s of [...i.scales].sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0))) if (rel[s.id] === "strength") traits.push({ key: `interest:${s.code}`, label: s.label, kind: "Interest", basis: "strength" });
  }
  const d = p.personality?.domains ?? [];
  const dRel = relativeOf(d);
  for (const x of d) if (dRel[x.id] === "strength") traits.push({ key: `domain:${x.id}`, label: x.label, kind: "Personality", basis: "strength" });
  const areas = p.reasoning?.areas ?? [];
  const aRel = relativeOf(areas);
  for (const a of areas) if (aRel[a.id] === "strength") traits.push({ key: `area:${a.id}`, label: a.label, kind: "Reasoning", basis: "strength" });
  const top = p.values?.filter((v) => v.visibility === "user").sort((a, b) => a.rank - b.rank)[0];
  if (top) traits.push({ key: `value:${top.id}`, label: top.label, kind: "Work value", basis: "ranked first" });
  // Fewer than three clear strengths: add the highest interest, labelled for what it is.
  if (traits.length < 3 && i) {
    const first = [...i.scales].sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0))[0];
    if (first && !traits.some((t) => t.key === `interest:${first.code}`)) traits.unshift({ key: `interest:${first.code}`, label: first.label, kind: "Interest", basis: "ranked first" });
  }
  const shown = traits.slice(0, max);
  const keys = new Set(shown.map((t) => t.key));
  return {
    traits: shown,
    paths: picks.map((c) => ({ id: c.row.id, name: c.row.name, band: c.row.band, keys: [...new Set(c.driverIds.map(traitKeyOf).filter((k): k is string => !!k && keys.has(k)))] })),
  };
}
