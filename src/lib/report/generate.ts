/**
 * Writes the profile report with Claude from computed facts (PLAN D49). Server only: needs
 * ANTHROPIC_API_KEY. The client is a parameter so tests can run without the API.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { numbersIn, type ReportFacts } from "./facts";
import { REPORT_SYSTEM, reportUserMessage } from "./prompt";
import { BestWorkdaySchema, WrittenReportSchema, reportText, type BestWorkday, type StoredWrittenReport, type WrittenReport } from "./schema";
import { claimProblems } from "./claims";
import { WORKDAY_SYSTEM, canWriteWorkday, workdayProblems, workdayUserMessage } from "./workday";
import { BRAND } from "../brand";

export const REPORT_MODEL = "claude-opus-5-5";

/** A failure with a message that can be shown to the person as is. */
export class ReportError extends Error {}

type ParseClient = { beta: { messages: { parse: Anthropic["beta"]["messages"]["parse"] } } };

let defaultClient: Anthropic | null = null;
function client(): ParseClient {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ReportError("The written report isn't set up yet: add your Anthropic API key as ANTHROPIC_API_KEY in .env.local, then restart the app.");
  }
  // A key that isn't scoped to a workspace needs the workspace named on every request.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  defaultClient ??= new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});
  return defaultClient;
}

/** Small counts ("three next steps", "two sessions") are fine; any other figure must come from the scores. */
export function unsupportedNumbers(report: WrittenReport, facts: ReportFacts): string[] {
  const allowed = numbersIn(facts);
  const found = [...reportText(report).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(",", "."));
  return [...new Set(found.filter((n) => !allowed.has(n) && !(Number.isInteger(Number(n)) && Number(n) <= 10)))];
}

/** Everything the report must not say, beyond numbers (claims.ts), across all its prose. */
export const reportClaimProblems = (report: WrittenReport) => claimProblems(reportText(report));

/** One structured-output call; API failures become ReportErrors the person can read. */
async function askParsed<S extends z.ZodType>(c: ParseClient, schema: S, system: string, content: string): Promise<{ parsed: z.infer<S>; model: string }> {
  try {
    const res = await c.beta.messages.parse({
      model: REPORT_MODEL,
      max_tokens: 16000,
      // Server-side fallback: if a safety classifier declines, the request is retried on a
      // fallback model inside the same call (enabled by default for this model).
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") throw new ReportError("The report couldn't be written this time. Try again later.");
    if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new ReportError("The report came back incomplete. Try again.");
    return { parsed: res.parsed_output as z.infer<S>, model: res.model };
  } catch (e) {
    if (e instanceof ReportError) throw e;
    if (e instanceof Anthropic.BadRequestError && /workspace/i.test(e.message))
      throw new ReportError(
        "This API key isn't tied to a workspace. Create a new key inside a workspace in the Anthropic Console (API keys → choose the workspace → Create key), or add ANTHROPIC_WORKSPACE_ID=<workspace id> to .env.local.",
      );
    if (e instanceof Anthropic.AuthenticationError) throw new ReportError("Anthropic rejected the API key. Check ANTHROPIC_API_KEY in .env.local (it starts with sk-ant-).");
    if (e instanceof Anthropic.PermissionDeniedError) throw new ReportError("This API key isn't allowed to use the model. Check the key's workspace in the Anthropic Console.");
    if (e instanceof Anthropic.RateLimitError) throw new ReportError("Too many requests right now. Try again in a minute.");
    if (e instanceof Anthropic.APIConnectionError) throw new ReportError("Couldn't reach Anthropic. Check your internet connection and try again.");
    if (e instanceof Anthropic.APIError) throw new ReportError(`Anthropic returned an error (${e.status ?? "no status"}). Try again later.`);
    throw e;
  }
}

async function ask(c: ParseClient, facts: ReportFacts, correction?: string) {
  const r = await askParsed(c, WrittenReportSchema, REPORT_SYSTEM, reportUserMessage(JSON.stringify(facts, null, 1)) + (correction ? `\n\n${correction}` : ""));
  return { report: r.parsed, model: r.model };
}

const reportProblems = (report: WrittenReport, facts: ReportFacts) => {
  const nums = unsupportedNumbers(report, facts);
  return [...(nums.length ? [`numbers that aren't in the scores: ${nums.join(", ")}`] : []), ...reportClaimProblems(report)];
};

/**
 * Writes the best workday from the Work Design JSON alone. If any sentence fails the check
 * (workday.ts), it is rewritten once with the problems listed; if it still fails, null: the
 * report is saved without it and the chapter says the passage couldn't be written to standard.
 */
export async function writeWorkday(facts: ReportFacts, c: ParseClient): Promise<BestWorkday | null> {
  const wb = facts.workDesign;
  if (!canWriteWorkday(wb)) return null;
  const message = workdayUserMessage(JSON.stringify(wb, null, 1));
  const first = (await askParsed(c, BestWorkdaySchema, WORKDAY_SYSTEM, message)).parsed;
  const bad = workdayProblems(first, wb);
  if (!bad.length) return first;
  const second = (await askParsed(c, BestWorkdaySchema, WORKDAY_SYSTEM, `${message}\n\nYour previous draft failed the check:\n- ${bad.join("\n- ")}\nWrite it again so that every sentence passes.`)).parsed;
  return workdayProblems(second, wb).length ? null : second;
}

/**
 * Writes the report, then the best workday. If the report cites a number that isn't in the scores
 * or makes a claim it may never make (claims.ts), it is rewritten once with the problems named;
 * if it still does, it is rejected rather than shown.
 */
export async function writeReport(facts: ReportFacts, c: ParseClient = client()): Promise<{ report: StoredWrittenReport; model: string }> {
  let written = await ask(c, facts);
  const bad = reportProblems(written.report, facts);
  if (bad.length) {
    written = await ask(c, facts, `Your previous draft broke the rules: ${bad.join("; ")}. Write the report again without any of these.`);
    if (reportProblems(written.report, facts).length)
      throw new ReportError(`The report didn't pass ${BRAND.name}'s accuracy check (it cited figures or made claims your scores don't support), so it wasn't saved. Try again.`);
  }
  return { report: { ...written.report, bestWorkday: await writeWorkday(facts, c) }, model: written.model };
}
