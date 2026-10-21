// Accessibility audit: axe-core (WCAG 2.x A/AA, incl. color contrast) on every route in both themes.
// Usage: node scripts/a11y.mjs [baseUrl]
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const routes = ["/", "/method", "/system", "/start", "/assess", "/assess/personality", "/assess/cognitive", "/profile", "/lanes", "/lanes?lane=sales-b2b", "/sprints", "/sprints/sp-sales-calls", "/evidence", "/settings"];
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
let total = 0;
for (const theme of ["light", "dark"]) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => localStorage.setItem("lane-theme", t), theme);
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
