/**
 * Short UI labels for the taxonomy's vocabularies (the taxonomy's own descriptions are longer
 * and are shown in the career path detail). Keyed by the generated ids, so a taxonomy rebuild
 * that adds a value fails the type check until it has a label here.
 *
 * Entry is shown in plain language everywhere; the technical terms (open entry, …) are kept for
 * tooltips and the method page.
 */
import type { EntryId, LevelId, ModeId } from "../taxonomy/generated";
import type { EntryNote } from "../matching";

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
