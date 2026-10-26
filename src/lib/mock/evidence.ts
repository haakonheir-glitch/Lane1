import type { Evidence } from "../types";

export const evidence: Evidence = {
  headline: "Your strongest evidence points to B2B sales and independent content.",
  confidence: "med",
  events: [
    { id: "ev-01", date: "2026-08-17", kind: "assessment", title: "Interests module completed", detail: "RIASEC · 30 items · Enterprising highest" },
    { id: "ev-02", date: "2026-08-20", kind: "assessment", title: "Personality module completed", detail: "Big Five · 30 items" },
    { id: "ev-03", date: "2026-08-24", kind: "assessment", title: "Profile v1.2 issued", detail: "Cognitive games 2 of 3 · values ranked" },
    { id: "ev-04", date: "2026-08-31", kind: "sprint-start", title: "Sprint started: Publish 5 short videos", detail: "Independent content creator · 10 days", laneId: "content_creation" },
    { id: "ev-05", date: "2026-09-06", kind: "check-in", title: "Low-energy check-in", detail: "Energy 4/7 after a video under 200 views", laneId: "content_creation" },
    { id: "ev-06", date: "2026-09-09", kind: "sprint-end", title: "Sprint completed: Publish 5 short videos", detail: "Watch-through +34% · wants to continue", laneId: "content_creation" },
    { id: "ev-07", date: "2026-09-21", kind: "sprint-start", title: "Practice tasks started: Run 4 user interviews", detail: "UX researcher · 7 days", laneId: "ux_research" },
    { id: "ev-08", date: "2026-09-27", kind: "sprint-end", title: "Practice tasks completed: Run 4 user interviews", detail: "Insights per interview +12% · does not want to continue", laneId: "ux_research" },
    { id: "ev-09", date: "2026-10-02", kind: "outcome", title: "Career map re-weighted", detail: "UX researcher moved down 3 places after sprint evidence" },
    { id: "ev-10", date: "2026-10-16", kind: "sprint-start", title: "Sprint started: Hold 20 discovery conversations", detail: "B2B sales · 14 days", laneId: "b2b_sales" },
    { id: "ev-11", date: "2026-10-20", kind: "check-in", title: "Highest check-in so far", detail: "Desire to continue 7/7 on day 5", laneId: "b2b_sales" },
  ],
  conviction: [
    {
      laneId: "b2b_sales",
      points: [
        { date: "2026-08-24", value: 52, ci: [36, 68] },
        { date: "2026-09-07", value: 52, ci: [36, 68] },
        { date: "2026-09-21", value: 53, ci: [37, 69] },
        { date: "2026-10-05", value: 54, ci: [38, 70] },
        { date: "2026-10-12", value: 54, ci: [39, 69] },
        { date: "2026-10-19", value: 68, ci: [56, 80] },
      ],
    },
    {
      laneId: "content_creation",
      points: [
        { date: "2026-08-24", value: 50, ci: [33, 67] },
        { date: "2026-09-07", value: 58, ci: [44, 72] },
        { date: "2026-09-21", value: 64, ci: [52, 76] },
        { date: "2026-10-05", value: 63, ci: [51, 75] },
        { date: "2026-10-12", value: 62, ci: [50, 74] },
        { date: "2026-10-19", value: 62, ci: [50, 74] },
      ],
    },
    {
      laneId: "ux_research",
      points: [
        { date: "2026-08-24", value: 46, ci: [30, 62] },
        { date: "2026-09-07", value: 46, ci: [30, 62] },
        { date: "2026-09-21", value: 45, ci: [30, 60] },
        { date: "2026-10-05", value: 33, ci: [22, 44] },
        { date: "2026-10-12", value: 33, ci: [22, 44] },
        { date: "2026-10-19", value: 32, ci: [21, 43] },
      ],
    },
  ],
};
