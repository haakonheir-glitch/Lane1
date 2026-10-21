// End-to-end run as a brand-new user against a running server. Usage: node tests/e2e.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const email = `e2e-${Date.now()}@example.com`;
const password = "correct-horse-battery";
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const step = (s) => console.log("✓", s);
const waitPath = (pathname) => p.waitForURL((u) => u.pathname === pathname, { timeout: 60_000 });

// Sign up
await p.goto(base + "/signup");
await p.fill("#name", "Eva Test");
await p.fill("#email", email);
await p.fill("#password", password);
await p.click("button[type=submit]");
await waitPath("/start");
step("signed up → /start");

// Onboarding: three choices by keyboard, then save
for (let i = 0; i < 3; i++) {
  await p.waitForTimeout(300);
  await p.keyboard.press("2");
}
await p.waitForURL(/step=done/);
await p.getByRole("button", { name: "Go to assessment" }).click();
await waitPath("/assess");
step("onboarding saved → /assess");

// Questionnaires by keyboard. Persona: enterprising/social, extraverted.
async function likert(module, pick) {
  await p.goto(`${base}/assess/${module}`);
  for (;;) {
    await p.waitForTimeout(60);
    if (await p.getByText("Module recorded").isVisible().catch(() => false)) break;
    const prompt = await p.locator("h2").first().innerText();
    await p.keyboard.press(String(pick(prompt)));
    await p.waitForTimeout(260);
  }
}
const salesy = (t) => (/persuade|negotiate|pitch|deal|lead a team|compete|teach|coach|help someone|customer|conversations with people|energised|centre of attention|speak up|recover quickly|calm|risk/i.test(t) ? 5 : /alone|behind the scenes|drains|wait for others|worry|setbacks stay|tense|criticism/i.test(t) ? 1 : /repair|wire|outdoors|by hand|build something physical|reconcile|spreadsheet|procedure/i.test(t) ? 1 : 3);
await likert("interests", salesy);
step("interests: 36 answered");
await likert("personality", salesy);
step("personality: 40 answered");
await likert("values", (t) => (/upside|above average|best at|proof that/i.test(t) ? 5 : /predictable|next year/i.test(t) ? 1 : 3));
step("values: 16 answered");

// Cognitive games: start each game, answer every item with key 1
await p.goto(base + "/assess/cognitive");
for (let g = 0; g < 3; g++) {
  await p.getByRole("button", { name: "Start" }).click();
  for (let i = 0; i < 8; i++) {
    await p.waitForSelector("[role=timer]");
    await p.keyboard.press(String((i % 4) + 1));
    await p.waitForTimeout(1100);
  }
}
await p.getByText("All three games are done.").waitFor({ timeout: 10_000 });
step("cognitive: 24 items recorded");

// Profile
await p.goto(base + "/profile");
const profileText = await p.locator("main").innerText();
if (/not finished|No games played|not ranked yet|Provisional/.test(profileText)) throw new Error("Profile still incomplete:\n" + profileText.slice(0, 600));
console.log("  summary:", (await p.locator("main ol li").first().innerText()).replace(/\s+/g, " ").slice(0, 160));
step("profile: all sections rendered");

// Lane Map
await p.goto(base + "/lanes");
const top = await p.locator("ol[aria-label='Lanes, ranked'] li").first().innerText();
console.log("  top lane:", top.split("\n").slice(0, 2).join(" "));
await p.locator("ol[aria-label='Lanes, ranked'] button").first().click();
await p.getByRole("link", { name: "Plan a sprint" }).click();
await p.waitForURL(/\/sprints\/template-/);
step("lane map ranked; opened sprint plan");

// Start sprint, tick task, check in, log numbers
await p.getByRole("button", { name: "Start this sprint today" }).click();
await p.waitForURL((u) => /^\/sprints\/[0-9a-f-]{36}$/.test(u.pathname), { timeout: 60_000 });
const sprintUrl = p.url();
await p.locator("ol input[type=checkbox]").first().check();
for (const [label, v] of [["Energy", 6], ["Flow", 5], ["Want to continue", 7]]) {
  await p.getByRole("radiogroup", { name: label }).getByRole("radio", { name: `${v} of 7` }).click();
}
await p.getByRole("button", { name: "Save check-in" }).click();
await p.getByText("Saved for today").waitFor();
const numberInputs = p.locator("form input[type=number]");
const n = await numberInputs.count();
for (let i = 0; i < n; i++) await numberInputs.nth(i).fill(String(10 + i * 2));
await p.getByRole("button", { name: /Add row|Replace today's row/ }).click();
await p.waitForTimeout(1200);
await p.reload();
const persisted = await p.locator("ol input[type=checkbox]").first().isChecked();
const logRows = await p.locator("table caption:text('Performance log') + thead + tbody tr").count();
if (!persisted || logRows < 1) throw new Error(`Sprint data not persisted (task ${persisted}, log rows ${logRows})`);
step("sprint started; task, check-in and log persisted across reload");

// Finish sprint
await p.getByRole("button", { name: "Finish sprint early…" }).click();
await p.getByRole("radio", { name: "Yes, I'd continue" }).click();
await p.getByRole("button", { name: "Complete sprint" }).click();
await p.getByText("Outcome").first().waitFor({ timeout: 20_000 });
step("sprint completed with outcome");

// Evidence
await p.goto(base + "/evidence");
console.log("  headline:", await p.locator("main h1").innerText());
const evText = await p.locator("main").innerText();
if (!/Sprint completed/.test(evText)) throw new Error("Evidence timeline missing sprint");
step("evidence record updated");

// Export
await p.goto(base + "/settings");
const [download] = await Promise.all([p.waitForEvent("download"), p.getByRole("link", { name: "Export data (.json)" }).click()]);
const json = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
if (Object.keys(json.answers).length !== 92 || json.cognitive.length !== 24 || json.sprints.length !== 1) throw new Error("Export incomplete");
step(`export: ${Object.keys(json.answers).length} answers, ${json.cognitive.length} game items, ${json.sprints.length} sprint`);

// Sign out, protected route redirects, sign back in
await p.getByRole("button", { name: "Sign out" }).first().click();
await waitPath("/");
await p.goto(sprintUrl);
await waitPath("/login");
await p.fill("#email", email);
await p.fill("#password", password);
await p.click("button[type=submit]");
await p.waitForURL((u) => u.pathname === new URL(sprintUrl).pathname, { timeout: 60_000 });
step("sign out → protected → sign in returns to the sprint");

// Delete account
await p.goto(base + "/settings");
await p.getByRole("button", { name: "Delete account…" }).click();
await p.fill("#del-pw", password);
await p.fill("#del-confirm", "DELETE");
await p.getByRole("button", { name: "Delete permanently" }).click();
await waitPath("/");
await p.goto(base + "/login");
await p.fill("#email", email);
await p.fill("#password", password);
await p.click("button[type=submit]");
await p.locator("form [role=alert]").getByText("incorrect").waitFor();
step("account deleted; login refused");

console.log(errors.length ? `Page errors:\n${errors.join("\n")}` : "No page errors.");
await b.close();
