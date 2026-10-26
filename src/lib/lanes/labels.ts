/**
 * Short UI labels for the taxonomy's vocabularies (the taxonomy's own descriptions are longer
 * and are shown in the career path detail). Keyed by the generated ids, so a taxonomy rebuild
 * that adds a value fails the type check until it has a label here.
 *
 * Payoff and entry are shown in plain language everywhere; the technical terms (convex, open
 * entry, …) are kept for tooltips and the method page.
 */
import type { EntryId, LevelId, ModeId, PayoffId } from "../taxonomy/generated";
import type { EntryNote } from "../matching";
import { payoffLabel as payoffTermLabel } from "../matching/payoff";

export { WINNER_TAKE_ALL_NOTE } from "../matching/payoff";

/** The technical payoff term ("Convex"), for tooltips. */
export const payoffTerm: Record<PayoffId, string> = payoffTermLabel;

export const payoffLabel: Record<PayoffId, string> = {
  linear: "Steady pay",
  linear_high_floor: "Good pay from the start",
  convex: "Uneven pay, high upside",
  steep: "Pay rises steeply with seniority",
  winner_take_all: "Few earn most",
};

export const modeLabel: Record<ModeId, string> = {
  employed: "Employed",
  public: "Public sector",
  freelance: "Freelance",
  owner: "Own business",
  performer: "Performer",
  gig: "Gig",
};

/** The technical entry term ("Open entry"), for tooltips. */
export const entryTerm: Record<EntryId, string> = {
  open: "Open entry",
  course: "Short course",
  certificate: "Licence",
  apprenticeship: "Apprenticeship",
  degree: "Degree",
  advanced: "Advanced degree",
  selection: "Talent selection",
};

export const entryLabel: Record<EntryId, string> = {
  open: "Open to anyone",
  course: "Short course first",
  certificate: "Licence needed",
  apprenticeship: "Apprenticeship",
  degree: "Degree needed",
  advanced: "Advanced degree needed",
  selection: "Selected for talent",
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
