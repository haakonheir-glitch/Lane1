/** The scale of the measurement, as shown on the cover: real counts, never estimates. */
export type Effort = { sessions: number; answers: number; tasks: number; trials: number | null; careerPaths: number };

/** "5 sessions · 412 answers · 12 tasks · 205 career paths", from real counts. */
export const effortLine = (e: Effort) =>
  [`${e.sessions} session${e.sessions === 1 ? "" : "s"}`, `${e.answers.toLocaleString("en-GB")} answers`, `${e.tasks} tasks`, `${e.careerPaths} career paths`].join(" · ");
