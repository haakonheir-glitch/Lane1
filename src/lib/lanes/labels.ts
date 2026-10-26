/**
 * Short UI labels for the taxonomy's vocabularies (the taxonomy's own descriptions are longer
 * and are shown in the lane detail). Keyed by the generated ids, so a taxonomy rebuild that
 * adds a value fails the type check until it has a label here.
 */
import type { EntryId, LevelId, ModeId, PayoffId, SprintId } from "../taxonomy/generated";
import type { EntryNote } from "../matching";

export { payoffLabel, WINNER_TAKE_ALL_NOTE } from "../matching/payoff";

export const modeLabel: Record<ModeId, string> = {
  employed: "Employed",
  public: "Public sector",
  freelance: "Freelance",
  owner: "Own business",
  performer: "Performer",
  gig: "Gig",
};

export const entryLabel: Record<EntryId, string> = {
  open: "Open entry",
  course: "Short course",
  certificate: "Licence",
  apprenticeship: "Apprenticeship",
  degree: "Degree",
  advanced: "Advanced degree",
  selection: "Talent selection",
};

export const sprintLabel: Record<SprintId, string> = {
  direct: "Real sprint",
  simulated: "Practice tasks",
  shadow: "Interview & shadow",
};

export const levelShort: Record<LevelId, string> = {
  trainee: "Trainee",
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  manager: "Manager",
  director: "Director",
  exec: "Executive",
  owner: "Owner",
};

export const entryNoteText: Record<EntryNote, string> = {
  standard: "Without experience in this career path, this is where you'd realistically start.",
  from_experience: "Based on the job and years you told us about, you could start from here.",
  via_other_lane: "This career path has no junior roles. People usually move in at mid level after a few years in a related one.",
  needs_experience: "This career path is only open to people with substantial experience elsewhere, so there's no starting role to recommend yet.",
};

/*
 * Plain-language versions for people who haven't learned the Career map's vocabulary yet
 * (the landing page). Keyed by the generated ids like the labels above.
 */
export const plainPayoff: Record<PayoffId, string> = {
  linear: "steady pay",
  linear_high_floor: "good pay from the start",
  convex: "uneven pay, high upside",
  steep: "up-or-out, big top rewards",
  winner_take_all: "a few earn most",
};

export const plainEntry: Record<EntryId, string> = {
  open: "open to anyone",
  course: "short course",
  certificate: "licence needed",
  apprenticeship: "apprenticeship",
  degree: "degree needed",
  advanced: "advanced degree",
  selection: "talent spotted",
};

export const plainSprint: Record<SprintId, string> = {
  direct: "try it for real",
  simulated: "try it with practice",
  shadow: "try it by shadowing",
};
