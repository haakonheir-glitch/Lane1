/**
 * End-to-end run as a brand-new user against a running server: sign up, onboard, then complete
 * S1–S5 through the real UI (every questionnaire format and every cognitive task).
 *
 *   npm run e2e [-- baseUrl]
 *
 * The respondent persona uses the item bank as its oracle (to pass validity items and answer
 * consistently); everything it does still goes through the browser.
 */
import { chromium, type Page, type Response } from "playwright";
import { stepsFor } from "../src/lib/assess/service";
import type { PublicStep, TaskTurn } from "../src/lib/bank/public";
import type { SessionId } from "../src/lib/bank/types";

const base = process.argv[2] ?? "http://localhost:3000";
const email = `e2e-${Date.now()}@example.com`;
const password = "correct-horse-battery";
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
const errors: string[] = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const log = (s: string) => console.log("✓", s);
const waitPath = (pathname: string) => p.waitForURL((u) => u.pathname === pathname, { timeout: 60_000 });

// Track what the server last told the client.
let step: PublicStep | null = null;
let trial: TaskTurn["trial"] = null;
let turns = 0;
const current = () => trial; // read through a function: these are updated by the response listener
p.on("response", async (r: Response) => {
  if (!/\/api\/assess\/S\d\/(state|answer|task)$/.test(new URL(r.url()).pathname) || !r.ok()) return;
  const j = await r.json().catch(() => null);
  if (!j) return;
  turns++;
  // A slow state response can land after an answer's response: never step back to an earlier item.
  const later = (s: PublicStep) => !(step?.kind === "item" && s.kind === "item" && s.position < step.position);
  if (j.step && later(j.step)) step = j.step;
  if ("trial" in j) trial = j.trial;
  if (j.next && later(j.next)) step = j.next;
});

// Sign up and onboard
await p.goto(base + "/signup");
await p.fill("#name", "Eva Test");
await p.fill("#email", email);
await p.fill("#password", password);
await p.click("button[type=submit]");
await waitPath("/start");
// Age and situation by keyboard
// Wait for each step to load before answering it: a key pressed mid-transition is dropped.
for (const next of [/step=2/, /step=3/]) {
  await p.waitForTimeout(600);
  await p.keyboard.press("2");
  await p.waitForURL(next);
}
// What do you do now: job-title search (Norwegian alias) + years
await p.waitForURL(/step=3/);
await p.getByRole("combobox").fill("salgssjef");
await p.getByRole("option").first().waitFor();
await p.keyboard.press("Enter");
await p.getByText("1–2 years").click();
await p.getByRole("button", { name: "Continue" }).click();
// What are you considering: two picks, one resolved through an alias
await p.waitForURL(/step=4/);
for (const q of ["YouTuber", "rørlegger"]) {
  await p.getByRole("combobox").fill(q);
  await p.getByRole("option").first().waitFor();
  await p.getByRole("option").first().click();
  await p.waitForTimeout(150);
}
await p.getByRole("button", { name: "Continue" }).click();
// Clarity goal
await p.waitForURL(/step=5/);
await p.waitForTimeout(300);
await p.keyboard.press("2");
await p.waitForURL(/step=done/);
await p.getByRole("button", { name: "Go to assessment" }).click();
await waitPath("/assess");
log("signed up and onboarded (current job, years, two considered lanes)");

/** The persona's answer for a questionnaire step (same logic as scripts/seed.mts). */
function persona(sessionId: SessionId, position: number) {
  const s = stepsFor(sessionId)[position]!;
  const item = s.block.items[s.itemIndex]!;
  if (item.validity?.kind === "infrequency") return 1;
  if (item.validity?.kind === "instructed") return item.validity.passIfEq;
  const f = item.format;
  if (f.type !== "likert5" && f.type !== "likert7") return 1;
  const lean = (item.scale === "E" || item.scale === "S" || item.domain === "Extraversion" ? 1 : item.scale === "R" ? -1 : 0) * (item.key === -1 ? -1 : 1);
  return Math.min(f.options.length, Math.max(1, 3 + lean + ((position * 7) % 3) - 1));
}

const until = async (cond: () => boolean, ms = 15_000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting (step ${JSON.stringify(step)?.slice(0, 200)})`);
    await p.waitForTimeout(40);
  }
};
const visible = (sel: ReturnType<Page["getByRole"]>) => sel.isVisible().catch(() => false);

async function answerItem(sessionId: SessionId, s: Extract<PublicStep, { kind: "item" }>) {
  const f = s.item.format;
  switch (f.type) {
    case "likert5":
    case "likert7":
    case "single":
    case "sjt":
      await p.keyboard.press(String(f.type.startsWith("likert") ? persona(sessionId, s.position) : 1));
      return;
    case "multi":
      await p.locator("fieldset input[type=checkbox]").first().check();
      await p.getByRole("button", { name: "Continue" }).click();
      return;
    case "text":
      await p.locator("textarea").fill("Fixing a broken bike with my grandfather.");
      await p.getByRole("button", { name: "Continue" }).click();
      return;
    case "number":
      await p.locator("input[type=number]").fill("3");
      await p.getByRole("button", { name: "Continue" }).click();
      return;
    case "slider_0_100":
      await p.getByRole("slider").focus();
      for (let i = 0; i < 6; i++) await p.keyboard.press("PageUp");
      await p.getByRole("button", { name: "Continue" }).click();
      return;
    case "forced_q_sort": {
      for (;;) {
        const finish = p.getByRole("button", { name: "Finish sort" });
        if (await visible(finish)) {
          await finish.click();
          return;
        }
        const confirm = p.getByRole("button", { name: /^Confirm \d+\/(\d+)$/ });
        const need = Number((await confirm.innerText()).split("/")[1]);
        const cards = p.locator("[aria-label=Cards] button:not([disabled])");
        for (let i = 0; i < need; i++) await cards.nth(i).click(); // first n available, keeps stable order
        await confirm.click();
        await p.waitForTimeout(80);
      }
    }
    case "ideas": {
      await p.getByRole("button", { name: "Begin" }).click();
      for (const idea of ["doorstop", "paperweight", "bookend"]) {
        await p.locator("#idea").fill(idea);
        await p.keyboard.press("Enter");
      }
      await p.getByRole("button", { name: "I'm done early" }).click();
      return;
    }
  }
}

const RT_KEYS = ["d", "f", "j", "k"];
async function playTrial(t: NonNullable<TaskTurn["trial"]>) {
  switch (t.task) {
    case "matrix":
    case "number_series":
    case "letter_series":
    case "quant":
    case "learning_rate":
    case "delay_discount":
      await p.keyboard.press("1");
      return;
    case "rotation2d":
      await p.keyboard.press("1");
      await p.keyboard.press("2");
      await p.keyboard.press("Enter");
      return;
    case "backward_digits":
    case "corsi": {
      await p.keyboard.press("Enter");
      const showMs = t.sequence.length * (t.presentationMs + t.isiMs);
      await p.waitForTimeout(500 + showMs + 250); // 500 ms lead-in before the first stimulus
      if (t.task === "corsi") {
        for (const v of t.sequence) await p.getByRole("button", { name: `Block ${v + 1}`, exact: true }).click();
      } else {
        for (const d of [...t.sequence].reverse()) await p.keyboard.press(String(d));
        await p.keyboard.press("Enter");
      }
      return;
    }
    case "symbol_match": {
      if (t.durationSec) await p.keyboard.press("Enter");
      for (let i = 0; i < t.pairs.length; i++) {
        const same = [...t.pairs[i]!.left].sort().join() === [...t.pairs[i]!.right].sort().join();
        await p.keyboard.press(same ? "f" : "j");
        await p.waitForTimeout(t.durationSec ? 250 : 20);
        const now = current();
        if (!now || now.index !== t.index || now.practice !== t.practice) return; // timer ran out
      }
      return;
    }
    case "choice_rt":
      await p.keyboard.press("Enter");
      for (const x of t.trials) {
        await p.waitForTimeout(x.foreperiodMs + 120);
        await p.keyboard.press(RT_KEYS[x.stimulus]!);
      }
      return;
    case "balloon": {
      const target = 2 + (t.index % 6);
      for (let i = 0; i < target; i++) {
        await p.keyboard.press(" ");
        await p.waitForTimeout(150);
        if (await p.getByText(/burst/i).first().isVisible().catch(() => false)) return;
      }
      await p.keyboard.press("Enter");
      return;
    }
  }
}

let interrupted = false;

async function runSession(sessionId: SessionId) {
  step = null;
  trial = null;
  await p.goto(`${base}/assess/${sessionId}`);
  await until(() => step !== null);
  const seen = new Set<string>();
  for (;;) {
    const s = step!;
    if (s.kind === "done") break;
    if (s.kind === "env_check") {
      // The step can arrive before the check is drawn: wait for every question first.
      const groups = p.getByRole("radiogroup");
      await groups.nth(s.questions.length - 1).waitFor();
      for (const g of await groups.all()) await g.getByRole("radio", { name: "Yes" }).click();
      await p.getByRole("button", { name: "Start" }).click();
      await until(() => step!.kind !== "env_check");
    } else if (s.kind === "item") {
      seen.add(s.item.format.type);
      await p.waitForTimeout(450); // a careful respondent; also avoids the rapid-response flag
      await answerItem(sessionId, s);
      // Wait for the step to move on, not for any response: in dev, React runs the page's
      // initial state request twice, and counting responses put the persona one item behind.
      await until(() => step!.kind !== "item" || (step as typeof s).position !== s.position);
    } else if (s.kind === "task") {
      const id = s.task.id;
      seen.add(id);
      trial = null;
      await p.getByText(/^Task · about/).waitFor();
      await p.getByRole("button", { name: "Start" }).click();
      await until(() => current() !== null || step!.kind !== "task" || (step as Extract<PublicStep, { kind: "task" }>).task.id !== id);
      let n = 0;
      while (current() && step!.kind === "task") {
        const cont = p.getByRole("button", { name: "Continue" });
        if (await visible(cont)) await cont.click();
        const t = current()!;
        const before = turns;
        await p.waitForTimeout(t.task === "balloon" ? 50 : 200);
        await playTrial(t);
        await until(() => turns > before, 60_000);
        await p.waitForTimeout(t.practice || t.task === "learning_rate" ? 1300 : t.task === "balloon" ? 900 : 120); // feedback / banked display
        if (++n > 400) throw new Error(`${id}: too many trials`);
        // Leave the first task of S3 half-way, then come back: it must restart and accept answers.
        if (sessionId === "S3" && id === "matrix" && n === 4 && !interrupted) {
          interrupted = true;
          trial = null;
          await p.reload();
          await p.getByText(/^Task · about/).waitFor();
          await p.getByRole("button", { name: "Start" }).click();
          await until(() => current() !== null);
          if (!current()!.practice || current()!.index !== 0) throw new Error("resume: expected a fresh attempt starting at practice item 1");
          log("S3 · matrix: left half-way and resumed with fresh items");
        }
      }
      log(`${sessionId} · ${id}: ${n} turns`);
    }
  }
  const outro = (await p.locator("h2").first().innerText()) + " " + (await p.locator("h2 + p").first().innerText());
  log(`${sessionId} done (${[...seen].join(", ")}) → “${outro}”`);
}

// SESSIONS=S4,S5 runs a subset (useful when debugging one task); SESSIONS= (empty) skips the assessment.
const only = (process.env.SESSIONS !== undefined ? process.env.SESSIONS.split(",").filter(Boolean) : ["S1", "S2", "S3", "S4", "S5"]) as SessionId[];
try {
  for (const s of only) await runSession(s);
} catch (e) {
  await p.screenshot({ path: "e2e-failure.png", fullPage: true });
  console.error("Screenshot: e2e-failure.png");
  throw e;
}
if (only.length === 5) {
  await p.goto(base + "/assess");
  const doneCount = await p.getByText(/^Done/).count();
  if (doneCount !== 5) throw new Error(`hub: expected 5 sessions done, saw ${doneCount}`);
  log("hub: 5 sessions marked done");
}

// Own results replace the sample once S1 or S2 is done
await p.goto(base + "/profile");
const ownResults = await p.getByText("Your results", { exact: true }).isVisible().catch(() => false);
if (only.includes("S1") || only.includes("S2")) {
  if (!ownResults) throw new Error("profile: expected the person's own results after S1/S2");
  await p.getByRole("heading", { name: "Your profile, in words" }).waitFor();
  log("profile: own results and the written-report section shown");
  if (only.includes("S3") && only.includes("S4")) {
    // Reasoning is scored against the provisional difficulty table (PLAN D50).
    await p.getByText("Provisional norms ·").first().waitFor();
    // The persona answers accuracy items within ~0.2 s: all rapid guesses, which are scored as
    // missing, so only Memory and Speed (span and speed norms) can have a band.
    const bands = await p.getByText(/^P\d+–\d+$/).count();
    const empty = await p.getByText("not enough data").count();
    if (bands !== 2 || empty !== 3) throw new Error(`profile: expected bands for memory and speed only (rapid guesses), saw ${bands} bands and ${empty} empty areas`);
    log("profile: reasoning scored with provisional norms (memory and speed banded; rapid guesses left out)");
  }
} else if (ownResults) throw new Error("profile: own results shown before any session was done");

// Lane Map: onboarding answers show up, filters work client-side, a lane opens, plans exist
await p.goto(base + "/lanes");
await p.getByText("Your current lane").first().waitFor();
const considering = await p.locator("span.label", { hasText: /^Considering$/ }).count();
if (considering !== 2) throw new Error(`lanes: expected 2 considered lanes, saw ${considering}`);
const summary = () => p.locator("p.mt-8 span.label").first().innerText();
const before = await summary();
await p.getByRole("button", { name: /^Interview & shadow/ }).click();
await p.waitForFunction((b) => document.querySelector("p.mt-8 span.label")?.textContent !== b, before);
log(`lane filters: ${before} → ${await summary()}`);
await p.getByRole("button", { name: "Clear filters" }).first().click();
await p.goto(base + "/lanes?lane=b2b_sales");
const panel = p.locator("[aria-labelledby] h2", { hasText: "B2B sales" }).first();
await panel.waitFor();
await p.getByText(/^You are here$/i).first().waitFor();
await p.getByText(/^You'd start here$/i).first().waitFor();
log("lane detail: current job marked, entry point highlighted");
for (const [id, h1] of [["b2b_sales", /for real/], ["software_engineering", /^Practice tasks/], ["legal_practice", /^Interview and shadow/]] as const) {
  await p.goto(`${base}/lanes/${id}/plan`);
  const text = await p.locator("h1").innerText();
  if (!h1.test(text)) throw new Error(`plan ${id}: unexpected heading "${text}"`);
}
log("plans: real sprint, practice tasks, interview & shadow");

// Pages render
for (const path of ["/profile", "/lanes", "/sprints", "/evidence", "/settings", "/method", "/system"]) {
  const r = await p.goto(base + path);
  if (!r || r.status() >= 400) throw new Error(`${path} → ${r?.status()}`);
}
log("app pages render");

// Export contains responses and trials
const dl = p.waitForEvent("download");
await p.goto(base + "/settings");
await p.getByRole("link", { name: /Export data/ }).click();
const file = await (await dl).path();
const data = JSON.parse(await (await import("node:fs/promises")).readFile(file!, "utf8"));
type ExportSession = { sessionId: string; responses: unknown[]; trials: unknown[]; scores: unknown };
const xs = data.sessions as ExportSession[];
const sum = (f: (x: ExportSession) => number) => xs.reduce((n, x) => n + f(x), 0);
const scored = xs.filter((x) => x.scores).length;
if (scored !== only.length) throw new Error(`export: expected ${only.length} scored sessions, found ${scored}`);
if (data.onboarding?.currentLaneId !== "b2b_sales" || data.onboarding?.considering?.length !== 2) throw new Error("export: onboarding answers missing");
log(`export: ${xs.length} sessions (${scored} scored), ${sum((x) => x.responses.length)} responses, ${sum((x) => x.trials.length)} trials, onboarding answers included`);

await b.close();
if (errors.length) {
  console.error("Browser errors:\n" + [...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log("E2E PASSED");
