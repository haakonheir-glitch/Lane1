/** What goes on a share card. Pure, so the opt-in rules can be tested. */
import type { Band } from "../matching/fit";
import type { ProfileScores } from "../scoring/profile";
import { groupDirections, type CareerPick } from "../lanes/types";
import { keyFigures } from "../view/findings";
import { markInput, type MarkInput } from "../view/mark";

export type ShareCard = {
  firstName: string;
  hollandCode: string | null;
  topValue: string | null;
  paths: { name: string; band: Band }[];
  mark: MarkInput;
  /** Present only when the person turns them on. */
  personality?: string | null;
  reasoning?: string | null;
  sample?: boolean;
};

export type ShareOptions = { personality?: boolean; reasoning?: boolean };

/** Builds a card from scores. Personality and reasoning stay out, of the text and of the mark, unless asked for. */
export function shareCardFrom(profile: ProfileScores, firstName: string, picks: CareerPick[], opts: ShareOptions & { sample?: boolean } = {}): ShareCard {
  const f = Object.fromEntries(keyFigures(profile).map((x) => [x.id, x.value]));
  const m = markInput(profile);
  return {
    firstName,
    hollandCode: f.interests ?? null,
    topValue: f.values ?? null,
    paths: groupDirections(picks).slice(0, 3).map((d) => d.picks[0]!).map((p) => ({ name: p.row.name, band: p.row.band })),
    mark: { ...m, reasoning: opts.reasoning ? m.reasoning : null, domains: opts.personality ? m.domains : m.domains.map(() => null) },
    ...(opts.personality ? { personality: f.personality ?? null } : {}),
    ...(opts.reasoning ? { reasoning: f.reasoning ?? null } : {}),
    sample: opts.sample,
  };
}

