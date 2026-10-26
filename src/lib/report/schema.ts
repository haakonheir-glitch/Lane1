/** The written report's fixed shape (structured output), so every report reads the same way. */
import { z } from "zod";

export const REPORT_SECTIONS = ["interests", "values", "personality", "reasoning", "behaviour", "lanes"] as const;

export const WrittenReportSchema = z.object({
  headline: z.string().describe("One sentence that captures the profile, in plain words."),
  overview: z.array(z.string()).describe("Two or three short paragraphs: how the parts of the profile fit together."),
  sections: z
    .array(
      z.object({
        id: z.enum(REPORT_SECTIONS),
        title: z.string(),
        paragraphs: z.array(z.string()),
      }),
    )
    .describe("One section per part of the profile that has data, in the order listed in the instructions."),
  pathsToLookInto: z
    .array(z.string())
    .describe("Exactly three bullets, one sentence each, saying what is worth finding out about the top career paths: how people get in, what the day-to-day work is, and how the pay works. Information, not instructions."),
  caveats: z.array(z.string()).describe("What this report can't tell the person, specific to their data."),
});

export type WrittenReport = z.infer<typeof WrittenReportSchema>;

/** All prose in a report, for checks. */
export const reportText = (r: WrittenReport) => [r.headline, ...r.overview, ...r.sections.flatMap((s) => [s.title, ...s.paragraphs]), ...(r.pathsToLookInto ?? []), ...r.caveats].join("\n");
