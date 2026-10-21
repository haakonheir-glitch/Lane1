// Visual QA: full-page screenshots of each route at 390/1440 px in light and dark,
// plus a horizontal-overflow check. Usage: node scripts/shoot.mjs [baseUrl] [route ...]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const routes = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ["/", "/method", "/system", "/start", "/assess", "/assess/personality", "/assess/cognitive", "/profile", "/lanes", "/lanes?lane=sales-b2b", "/sprints", "/sprints/sp-sales-calls", "/evidence", "/settings", "/nope"];
const widths = [390, 1440];
const themes = ["light", "dark"];
const out = ".screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const problems = [];
for (const theme of themes) {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => localStorage.setItem("lane-theme", t), theme);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => problems.push(`pageerror ${width} ${theme}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && problems.push(`console ${width} ${theme}: ${m.text()}`));
    for (const route of routes) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) problems.push(`overflow ${overflow}px at ${route} ${width} ${theme}`);
      const name = route.replace(/[/?=&]+/g, "_").replace(/^_/, "") || "home";
      await page.screenshot({ path: `${out}/${name}-${width}-${theme}.png`, fullPage: true });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(problems.length ? problems.join("\n") : "No overflow or runtime errors.");
