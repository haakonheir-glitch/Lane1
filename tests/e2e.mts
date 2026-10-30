/**
 * End-to-end run as a brand-new user against a running server: sign up, onboard, then complete
 * S1–S5 through the real UI (every questionnaire format and every cognitive task).
 *
 *   npm run e2e [-- baseUrl]
 *
 * The respondent persona uses the item bank as its oracle (to pass validity items and answer
 * consistently); everything it does still goes through the browser.
 */
import { writeFileSync } from "node:fs";
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
/*
 * TIMING_LOG=<file>: measure presentation cost in the timed tasks (UX constraint: no added delay).
 * Per task: key/click → next painted change, server reply → next painted change, and main-thread
 * long tasks. Same measurement before and after a UI change; compare medians.
 */
const TIMING = process.env.TIMING_LOG;
// Plain JavaScript on purpose: tsx would compile a function here with helpers the page lacks.
if (TIMING)
  await p.addInitScript(`
    window.__t = { task: "", samples: [], longTasks: {} };
    var pending = [];
    function arm(kind, t0) { if (window.__t.task) pending.push({ kind: kind, t0: t0, task: window.__t.task }); }
    new MutationObserver(function () {
      if (!pending.length) return;
      var batch = pending.splice(0);
      requestAnimationFrame(function () {
        var now = performance.now();
        batch.forEach(function (x) { if (now - x.t0 < 5000) window.__t.samples.push({ task: x.task, kind: x.kind, ms: now - x.t0 }); });
      });
    }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
    addEventListener("keydown", function (e) { arm("keyToPaint", e.timeStamp); }, { capture: true });
    addEventListener("pointerdown", function (e) { arm("keyToPaint", e.timeStamp); }, { capture: true });
    var f = window.fetch;
    window.fetch = function () {
      var args = arguments;
      return f.apply(this, args).then(function (res) { if (String(args[0]).indexOf("/task") >= 0) arm("replyToPaint", performance.now()); return res; });
    };
    try {
      new PerformanceObserver(function (l) {
        var t = window.__t.task; if (t) window.__t.longTasks[t] = (window.__t.longTasks[t] || 0) + l.getEntries().length;
      }).observe({ type: "longtask", buffered: false });
    } catch (e) {}
  `);
const timingMark = (task: string) => (TIMING ? p.evaluate((t) => ((window as unknown as { __t: { task: string } }).__t.task = t), task) : Promise.resolve());
const timingAll: { task: string; kind: string; ms: number }[] = [];
const timingLong: Record<string, number> = {};
const timingCollect = async () => {
  if (!TIMING) return;
  const t = await p.evaluate(() => (window as unknown as { __t: { samples: { task: string; kind: string; ms: number }[]; longTasks: Record<string, number> } }).__t).catch(() => null);
  if (!t) return;
  timingAll.push(...t.samples);
  for (const [k, v] of Object.entries(t.longTasks)) timingLong[k] = (timingLong[k] ?? 0) + v;
};
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
// How satisfied are you in this work: 1–7, advances on its own
await p.waitForURL(/step=4/);
// Wait for the step transition: the outgoing step stays on screen while it animates out.
await p.waitForTimeout(500);
await p.getByText("5", { exact: true }).click();
// Any previous jobs: one, with its own satisfaction
await p.waitForURL(/step=5/);
await p.waitForTimeout(500);
await p.getByRole("combobox").fill("lærer");
await p.getByRole("option").first().waitFor();
await p.getByRole("option").first().click();
await p.getByRole("group", { name: /How satisfied were you/ }).getByText("3", { exact: true }).click();
await p.getByRole("button", { name: "Continue" }).click();
// What are you considering: two picks, one resolved through an alias
await p.waitForURL(/step=6/);
// The previous step's search box is still mounted while it animates out.
await p.waitForTimeout(500);
for (const q of ["YouTuber", "rørlegger"]) {
  await p.getByRole("combobox").fill(q);
  await p.getByRole("option").first().waitFor();
  await p.getByRole("option").first().click();
  await p.waitForTimeout(150);
}
await p.getByRole("button", { name: "Continue" }).click();
// Clarity goal
await p.waitForURL(/step=7/);
await p.waitForTimeout(300);
await p.keyboard.press("2");
await p.waitForURL(/step=done/);
await p.getByRole("button", { name: "Go to assessment" }).click();
await waitPath("/assess");
log(`signed up and onboarded as ${email} (current job, years, satisfaction, a previous job, two considered lanes)`);

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
      await timingMark(id);
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
          await timingMark(id); // the reload cleared the in-page timing log
          await p.getByText(/^Task · about/).waitFor();
          await p.getByRole("button", { name: "Start" }).click();
          await until(() => current() !== null);
          if (!current()!.practice || current()!.index !== 0) throw new Error("resume: expected a fresh attempt starting at practice item 1");
          log("S3 · matrix: left half-way and resumed with fresh items");
        }
      }
      log(`${sessionId} · ${id}: ${n} turns`);
      await timingCollect();
      await timingMark("");
    }
  }
  const outro = (await p.locator("h2").first().innerText()) + " " + ((await p.locator("h2 + *").first().innerText()).replace(/\s+/g, " "));
  log(`${sessionId} done (${[...seen].join(", ")}) → “${outro}”`);
}

// SESSIONS=S4,S5 runs a subset (useful when debugging one task); SESSIONS= (empty) skips the assessment.
const only = (process.env.SESSIONS !== undefined ? process.env.SESSIONS.split(",").filter(Boolean) : ["S1", "S2", "S3", "S4", "S5"]) as SessionId[];
try {
  for (const s of only) await runSession(s);
  if (TIMING) {
    const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : null);
    const p95 = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.95)]! : null);
    const tasks = [...new Set(timingAll.map((x) => x.task))];
    const summary = tasks.map((task) => {
      const k = timingAll.filter((x) => x.task === task && x.kind === "keyToPaint").map((x) => x.ms);
      const r = timingAll.filter((x) => x.task === task && x.kind === "replyToPaint").map((x) => x.ms);
      return { task, keyToPaint: { n: k.length, median: med(k), p95: p95(k) }, replyToPaint: { n: r.length, median: med(r), p95: p95(r) }, longTasks: timingLong[task] ?? 0 };
    });
    writeFileSync(TIMING, JSON.stringify({ summary, samples: timingAll }, null, 2));
    log(`timing written to ${TIMING}`);
  }
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
// Only a person's own report has the written-analysis chapter; the sample has a banner instead.
// The report streams in: on a first, uncached load the profile and matching are computed first.
const ownResults =
  only.includes("S1") || only.includes("S2")
    ? await p.locator("#analysis").waitFor({ timeout: 60_000 }).then(() => true, () => false)
    : await p.locator("#analysis").isVisible().catch(() => false);
if (only.includes("S1") || only.includes("S2")) {
  if (!ownResults) throw new Error("profile: expected the person's own results after S1/S2");
  await p.locator("#cover").getByText(/Built from \d+ sessions? · [\d,]+ answers/).waitFor();
  await p.locator("#summary").waitFor();
  log("profile: own report (cover with real effort counts, summary sheet, written-analysis chapter)");
  if (only.includes("S3") && only.includes("S4")) {
    // Reasoning is scored against the provisional difficulty table (PLAN D50).
    await p.getByText("Provisional norms ·").first().waitFor();
    // The persona answers accuracy items within ~0.2 s: all rapid guesses, which are scored as
    // missing, so only Memory and Speed (span and speed norms) can have a band.
    // Counted in the reasoning chapter only: interests and personality have percentile bands too since their norms (v2-0.5).
    const reasoning = p.locator("#reasoning");
    const bands = await reasoning.getByText(/^P\d+–\d+$/).count();
    const empty = await reasoning.getByText("not enough data").count();
    if (bands !== 2 || empty !== 3) throw new Error(`profile: expected bands for memory and speed only (rapid guesses), saw ${bands} bands and ${empty} empty areas`);
    log("profile: reasoning scored with provisional norms (memory and speed banded; rapid guesses left out)");
  }
} else if (ownResults) throw new Error("profile: own results shown before any session was done");

// Career map: onboarding answers show up, filters work client-side, a lane opens, removed pages redirect
await p.goto(base + "/lanes");
// With ability fit (S3 and S4) the default view is the fit map; the list views carry the named lanes.
if (await p.getByRole("radio", { name: "Fit map" }).count()) {
  await p.locator("svg[aria-label^='Career paths by fulfilment fit']").waitFor();
  log("lanes: fit map is the default view");
}
// Strong fits as directions, without rank numbers; "Does this resonate?" on a direction's career
// path (own results only), stored with the matching version.
if (ownResults) {
  await p.getByText("These fit about equally well; the measurement can't separate them further.").first().waitFor();
  if (await p.getByText("Your best fit").count()) throw new Error("lanes: the numbered best fit is still shown");
  log("lanes: strong fits shown as directions, not ranked");
  await p.getByRole("group", { name: /^Does .+ resonate with you\?$/ }).first().getByText("Not really", { exact: true }).click();
  await p.getByText("Saved. It doesn't change your results.").first().waitFor();
  log("lanes: 'Does this resonate?' saved on a direction's career path");
}
await p.goto(base + "/lanes?view=family");
await p.getByText("Your current career").first().waitFor();
// Count in the map's own lists (the summary at the top repeats named lanes).
const considering = await p.locator("ul[aria-label] span.label", { hasText: /^Considering$/ }).count();
if (considering !== 2) throw new Error(`lanes: expected 2 considered lanes, saw ${considering}`);
const summary = () => p.locator("p.mt-8 span.label").first().innerText();
const before = await summary();
// Compare like with like: innerText is upper-cased by CSS, textContent isn't.
const beforeText = await p.locator("p.mt-8 span.label").first().textContent();
await p.getByRole("button", { name: /^Licence needed/ }).click();
await p.waitForFunction((b) => document.querySelector("p.mt-8 span.label")?.textContent !== b, beforeText);
const after = await summary();
if (after === before) throw new Error("lane filters: the summary didn't change");
log(`lane filters: ${before} → ${after}`);
await p.getByRole("button", { name: "Clear filters" }).first().click();
await p.goto(base + "/lanes?lane=b2b_sales");
const panel = p.locator("[aria-labelledby] h2", { hasText: "B2B sales" }).first();
await panel.waitFor();
await p.getByText(/^You are here$/i).first().waitFor();
await p.getByText(/^You'd start here$/i).first().waitFor();
await p.getByText(/^About this career path$/i).first().waitFor();
log("lane detail: current job marked, entry point highlighted, about block shown");
for (const path of ["/sprints", "/sprints/sp-sales-calls", "/evidence", "/lanes/legal_practice/plan"]) {
  await p.goto(base + path);
  if (new URL(p.url()).pathname !== "/lanes") throw new Error(`${path} should redirect to /lanes, landed on ${p.url()}`);
}
log("removed pages: /sprints, /evidence and plans redirect to /lanes");

// Pages render
for (const path of ["/profile", "/lanes", "/settings", "/method", "/system"]) {
  const before = errors.length;
  const r = await p.goto(base + path);
  // /system (the design specimen) is dev-only by design: a production build answers 404 (and the
  // browser logs that 404 as a console error, which is expected here).
  if (path === "/system" && r?.status() === 404) {
    errors.splice(before);
    continue;
  }
  if (!r || r.status() >= 400) throw new Error(`${path} → ${r?.status()}`);
}
log("app pages render");

// Export contains responses and trials
await p.goto(base + "/settings");
// "Open to faith-based work": off by default (not ticked in onboarding), saved when changed.
const faith = p.getByRole("checkbox", { name: /open to faith-based work/ });
if (await faith.isChecked()) throw new Error("settings: open to faith-based work should be off by default");
await faith.check();
await p.getByText("Saved.").first().waitFor();
await p.reload();
if (!(await p.getByRole("checkbox", { name: /open to faith-based work/ }).isChecked())) throw new Error("settings: open to faith-based work wasn't saved");
await p.getByRole("checkbox", { name: /open to faith-based work/ }).uncheck();
await p.getByText("Saved.").first().waitFor();
log("settings: open to faith-based work is off by default and saves");
const dl = p.waitForEvent("download");
await p.getByRole("link", { name: /Export data/ }).click();
const file = await (await dl).path();
const data = JSON.parse(await (await import("node:fs/promises")).readFile(file!, "utf8"));
type ExportSession = { sessionId: string; responses: unknown[]; trials: unknown[]; scores: unknown };
const xs = data.sessions as ExportSession[];
const sum = (f: (x: ExportSession) => number) => xs.reduce((n, x) => n + f(x), 0);
const scored = xs.filter((x) => x.scores).length;
if (scored !== only.length) throw new Error(`export: expected ${only.length} scored sessions, found ${scored}`);
if (data.onboarding?.currentLaneId !== "b2b_sales" || data.onboarding?.considering?.length !== 2) throw new Error("export: onboarding answers missing");
if (ownResults && data.careerResonance?.[0]?.response !== "not_really") throw new Error("export: resonance answer missing");
if (data.onboarding?.currentSatisfaction !== 5 || data.onboarding?.previousJobs?.[0]?.satisfaction !== 3) throw new Error("export: satisfaction answers missing");
log(`export: ${xs.length} sessions (${scored} scored), ${sum((x) => x.responses.length)} responses, ${sum((x) => x.trials.length)} trials, onboarding answers included`);

await b.close();
if (errors.length) {
  console.error("Browser errors:\n" + [...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log("E2E PASSED");
