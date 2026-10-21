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
  if (j.step) step = j.step;
  if ("trial" in j) trial = j.trial;
  if (j.next) step = j.next;
});

// Sign up and onboard
await p.goto(base + "/signup");
await p.fill("#name", "Eva Test");
await p.fill("#email", email);
await p.fill("#password", password);
await p.click("button[type=submit]");
await waitPath("/start");
for (let i = 0; i < 3; i++) {
  await p.waitForTimeout(300);
  await p.keyboard.press("2");
}
await p.waitForURL(/step=done/);
await p.getByRole("button", { name: "Go to assessment" }).click();
await waitPath("/assess");
log("signed up and onboarded");

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
      const before = turns;
      for (const g of await p.getByRole("radiogroup").all()) await g.getByRole("radio", { name: "Yes" }).click();
      await p.getByRole("button", { name: "Start" }).click();
      await until(() => turns > before);
    } else if (s.kind === "item") {
      seen.add(s.item.format.type);
      const before = turns;
      await p.waitForTimeout(450); // a careful respondent; also avoids the rapid-response flag
      await answerItem(sessionId, s);
      await until(() => turns > before);
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
      }
      log(`${sessionId} · ${id}: ${n} turns`);
    }
  }
  const outro = (await p.locator("h2").first().innerText()) + " " + (await p.locator("h2 + p").first().innerText());
  log(`${sessionId} done (${[...seen].join(", ")}) → “${outro}”`);
}

// SESSIONS=S4,S5 runs a subset (useful when debugging one task).
const only = (process.env.SESSIONS?.split(",") ?? ["S1", "S2", "S3", "S4", "S5"]) as SessionId[];
try {
  for (const s of only) await runSession(s);
} catch (e) {
  await p.screenshot({ path: "e2e-failure.png", fullPage: true });
  console.error("Screenshot: e2e-failure.png");
  throw e;
}
if (only.length < 5) {
  await b.close();
  process.exit(errors.length ? 1 : 0);
}

// Hub shows everything complete
await p.goto(base + "/assess");
const doneCount = await p.getByText(/^Done/).count();
log(`hub: ${doneCount} sessions marked done`);

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
log(`export: ${data.sessions?.length} sessions, ${data.responses?.length} responses, ${data.trials?.length} trials, ${data.scores?.length} scores`);

await b.close();
if (errors.length) {
  console.error("Browser errors:\n" + [...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log("E2E PASSED");
