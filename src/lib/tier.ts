/**
 * Report tiers, ready for a paywall but with no payments: REPORT_TIER=free shows the cover, the
 * summary sheet and the top three career paths; "full" (the default) shows every chapter, the
 * whole Career map and the PDF. Locked parts show what's inside, never blurred real data.
 */
export type ReportTier = "free" | "full";

export const reportTier = (): ReportTier => (process.env.REPORT_TIER === "free" ? "free" : "full");

/** One sentence per locked chapter: what the full report adds. */
export const LOCKED_TEXT: Record<string, string> = {
  interests: "Your six interest areas on the radar, with scores, ranges and what stands out.",
  values: "All six work values in the order you ranked them.",
  personality: "Five personality domains and 30 facets, each with its 90% range.",
  reasoning: "Your reasoning range and how the five areas compare, against provisional norms.",
  behaviour: "How fast you learned a new task, how you took risks and how you traded now against later.",
  fit: "How your clearest strengths connect to the career paths that fit you best.",
  analysis: "The full written analysis of your profile.",
  map: "All 205 career paths, with filters, fit bands and the details of each.",
};
