/**
 * Writes the profile report with Claude from computed facts (PLAN D49). Server only: needs
 * ANTHROPIC_API_KEY. The client is a parameter so tests can run without the API.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { numbersIn, type ReportFacts } from "./facts";
import { REPORT_SYSTEM, reportUserMessage } from "./prompt";
import { WrittenReportSchema, reportText, type WrittenReport } from "./schema";

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

async function ask(c: ParseClient, facts: ReportFacts, correction?: string) {
  const content = reportUserMessage(JSON.stringify(facts, null, 1)) + (correction ? `\n\n${correction}` : "");
  try {
    const res = await c.beta.messages.parse({
      model: REPORT_MODEL,
      max_tokens: 16000,
      // Server-side fallback: if a safety classifier declines, the request is retried on a
      // fallback model inside the same call (enabled by default for this model).
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(WrittenReportSchema) },
      system: REPORT_SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") throw new ReportError("The report couldn't be written this time. Try again later.");
    if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new ReportError("The report came back incomplete. Try again.");
    return { report: res.parsed_output, model: res.model };
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

/**
 * Writes the report. If it cites a number that isn't in the scores, it is rewritten once with
 * the offending numbers named; if it still does, it is rejected rather than shown.
 */
export async function writeReport(facts: ReportFacts, c: ParseClient = client()): Promise<{ report: WrittenReport; model: string }> {
  const first = await ask(c, facts);
  const bad = unsupportedNumbers(first.report, facts);
  if (!bad.length) return first;
  const second = await ask(c, facts, `Your previous draft used numbers that aren't in the scores: ${bad.join(", ")}. Write the report again without any number that isn't in the scores.`);
  if (unsupportedNumbers(second.report, facts).length) throw new ReportError("The report didn't pass Lane's accuracy check (it cited figures that aren't in your scores), so it wasn't saved. Try again.");
  return second;
}
