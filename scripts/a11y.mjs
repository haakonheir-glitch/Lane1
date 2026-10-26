// Accessibility audit: axe-core (WCAG 2.x A/AA, incl. color contrast) on every route in both themes.
// Usage: node scripts/a11y.mjs [baseUrl]
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const routes = ["/", "/method", "/system", "/login", "/signup", "/start", "/assess", "/assess/S1", "/assess/S2", "/assess/S3", "/profile", "/lanes", "/lanes?lane=b2b_sales", "/lanes?lane=film_tv&view=band", "/start?step=3", "/settings", "/sample", "/profile/share", "/profile/print", "/profile/reveal?replay=1"];

// Sign in (demo account from `npm run seed` by default) so app pages render with data.
async function signIn(ctx) {
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await page.fill("#email", process.env.LANE_EMAIL ?? "demo@lane.local");
  await page.fill("#password", process.env.LANE_PASSWORD ?? "lane-demo-2026");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => u.pathname !== "/login", { timeout: 60000 });
  await page.close();
}

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
let total = 0;
for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => localStorage.setItem("lane-theme", t), theme);
    await signIn(ctx);
    const page = await ctx.newPage();
    for (const r of routes) {
      await page.goto(base + r, { waitUntil: "networkidle" });
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const v of res.violations) {
        total++;
        console.log(`${theme} ${width} ${r} [${v.id}] ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log("   ", n.target.join(" "), "|", (n.failureSummary ?? "").split("\n")[1] ?? "");
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(total ? `${total} violation groups` : "No axe violations.");
