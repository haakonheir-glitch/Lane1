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
  nextSteps: z.array(z.string()).describe("Three concrete next steps, each one sentence."),
  caveats: z.array(z.string()).describe("What this report can't tell the person, specific to their data."),
});

export type WrittenReport = z.infer<typeof WrittenReportSchema>;

/** All prose in a report, for checks. */
export const reportText = (r: WrittenReport) => [r.headline, ...r.overview, ...r.sections.flatMap((s) => [s.title, ...s.paragraphs]), ...r.nextSteps, ...r.caveats].join("\n");
