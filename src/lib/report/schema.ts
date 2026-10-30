/** The written report's fixed shape (structured output), so every report reads the same way. */
import { z } from "zod";

/** Section ids: "workbest" is "How you work best", "careers" is "Where this work exists" (reports before REPORT_FORMAT 4 used "lanes" for it). */
export const REPORT_SECTIONS = ["workbest", "careers", "interests", "values", "personality", "reasoning", "behaviour"] as const;

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
    .describe("Exactly three bullets, one sentence each, saying what is worth finding out about the career paths in the directions: how people get in, what the day-to-day work is, and which of the person's measured strengths the work draws on. Information, not instructions."),
  caveats: z.array(z.string()).describe("What this report can't tell the person, specific to their data."),
});

export type WrittenReport = z.infer<typeof WrittenReportSchema>;

/**
 * The best workday (Phase 3): about 150 words in sentences, each carrying the ids of the Work Design
 * dimensions it relies on ("mode.analyse", "env.autonomy"). Written in a separate call from the Work
 * Design JSON alone, and checked sentence by sentence (src/lib/report/workday.ts).
 */
export const BestWorkdaySchema = z.object({
  sentences: z
    .array(
      z.object({
        text: z.string().describe("One sentence."),
        sources: z.array(z.string()).describe('The ids of the dimensions in the JSON this sentence relies on, e.g. "mode.analyse" or "env.autonomy". At least one.'),
      }),
    )
    .describe("About 150 words in total, as single sentences in reading order."),
});
export type BestWorkday = z.infer<typeof BestWorkdaySchema>;

/** What is stored: the report, plus the best workday when it passed its check (older reports have none). */
export type StoredWrittenReport = WrittenReport & { bestWorkday?: BestWorkday | null };

/**
 * Reports written before REPORT_FORMAT 3 could describe pay ("winner-take-all", "how the pay
 * works"); Lane no longer shows income labels. Until such a report is rewritten, drop every
 * sentence that talks about pay, income or earnings. Pure.
 */
export const PAY = /\b(pay|pays|paid|income|incomes|earn|earns|earning|earnings|salary|salaries|wage|wages|commission|winner-take-all)\b/i;
const dropPaySentences = (t: string) =>
  t
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !PAY.test(s))
    .join(" ");
export function withoutPay<R extends StoredWrittenReport>(r: R): R {
  const para = (xs: string[]) => xs.map(dropPaySentences).filter((x) => x.trim());
  return {
    ...r,
    overview: para(r.overview),
    sections: r.sections.map((s) => ({ ...s, paragraphs: para(s.paragraphs) })),
    pathsToLookInto: r.pathsToLookInto ? para(r.pathsToLookInto) : r.pathsToLookInto,
    caveats: para(r.caveats),
    ...(r.bestWorkday ? { bestWorkday: { sentences: r.bestWorkday.sentences.filter((x) => !PAY.test(x.text)) } } : {}),
  };
}

/** All prose in a report, for checks. */
export const reportText = (r: WrittenReport) => [r.headline, ...r.overview, ...r.sections.flatMap((s) => [s.title, ...s.paragraphs]), ...(r.pathsToLookInto ?? []), ...r.caveats].join("\n");
