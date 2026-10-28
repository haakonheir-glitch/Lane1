/**
 * "A typical day in this career" (Career map detail, Phase 3): the career path's most distinctive
 * important O*NET Work Activities and Work Context, from taxonomy/derived/career_days.json (built by
 * taxonomy/build/build_career_days.py; the selection rule is in that script and docs/WORK_DESIGN.md).
 * Element names and descriptions are O*NET's own wording. Server only (the file is ~120 KB).
 */
import "server-only";
import daysFile from "../../../taxonomy/derived/career_days.json";

export type TypicalDay = {
  provenance: "onet" | "estimated";
  /** What the work involves most, compared with other occupations: O*NET Work Activities. */
  activities: { id: string; name: string; description: string }[];
  /** The conditions it stands out on: O*NET Work Context, with O*NET's nearest response wording. */
  context: { id: string; name: string; label: string | null }[];
};

type DaysFile = {
  elements: Record<string, { name: string; description: string }>;
  lanes: Record<string, { provenance: "onet" | "estimated"; activities: { id: string }[]; context: { id: string; label: string | null }[] }>;
};
const days = daysFile as DaysFile;

/** Which O*NET build the typical days come from (for cache keys). */
export const CAREER_DAYS_STAMP = `${(daysFile as { release: Record<string, string> }).release.onet}:${(daysFile as { workDesign: string }).workDesign}`;

/** The typical day for one career path, or null when it has no O*NET profile. */
export function typicalDay(laneId: string): TypicalDay | null {
  const d = days.lanes[laneId];
  if (!d) return null;
  const el = (id: string) => days.elements[id]!;
  return {
    provenance: d.provenance,
    activities: d.activities.map((a) => ({ id: a.id, name: el(a.id).name, description: el(a.id).description })),
    context: d.context.map((c) => ({ id: c.id, name: el(c.id).name, label: c.label })),
  };
}
