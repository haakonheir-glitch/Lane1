/**
 * Outcome check-in (Phase 3): two questions 6 and 12 months after the person opts in, so matching
 * can later be fitted to what actually happened. Only the data model and consent exist yet; no
 * email is sent, so a due check-in is offered in the app. Pure.
 */
export type Wave = "6m" | "12m";
export const WAVES: { id: Wave; months: number }[] = [
  { id: "6m", months: 6 },
  { id: "12m", months: 12 },
];

/** The 1–7 fulfilment question and its end labels, shown exactly as stored. */
export const FULFILMENT_QUESTION = "All in all, how fulfilled are you by the work you do now?";
export const FULFILMENT_ANCHORS = { 1: "Not at all", 7: "Completely" } as const;

export const addMonths = (d: Date, months: number) => {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
};

/**
 * The wave to answer now: the latest one whose date has passed and that isn't answered yet. A
 * missed 6-month check-in is skipped once the 12-month one is due, so the answers stay 6 and 12
 * months apart in meaning.
 */
export function dueWave(consentedAt: Date, answered: Wave[], now: Date = new Date()): Wave | null {
  const passed = WAVES.filter((w) => addMonths(consentedAt, w.months) <= now);
  const latest = passed[passed.length - 1];
  return latest && !answered.includes(latest.id) ? latest.id : null;
}

/** When the next unanswered check-in opens, or null when both are answered or skipped. */
export function nextDate(consentedAt: Date, answered: Wave[], now: Date = new Date()): Date | null {
  const next = WAVES.find((w) => !answered.includes(w.id) && addMonths(consentedAt, w.months) > now);
  return next ? addMonths(consentedAt, next.months) : null;
}
