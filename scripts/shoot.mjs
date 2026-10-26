// Visual QA: full-page screenshots of each route at 390/1440 px in light and dark,
// plus a horizontal-overflow check. Usage: node scripts/shoot.mjs [baseUrl] [route ...]
// SHOOT_OUT sets the folder; SHOOT_SIZES sets viewports, e.g. "1440x900,1280x800".
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const routes = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ["/", "/method", "/system", "/login", "/signup", "/start", "/assess", "/assess/S1", "/assess/S2", "/assess/S3", "/profile", "/lanes", "/lanes?lane=b2b_sales", "/lanes?lane=film_tv&view=band", "/start?step=3", "/settings", "/nope"];
const sizes = (process.env.SHOOT_SIZES ?? "390x900,1440x900").split(",").map((s) => s.split("x").map(Number));
const themes = ["light", "dark"];
const out = process.env.SHOOT_OUT ?? ".screenshots";
mkdirSync(out, { recursive: true });


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

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const problems = [];
for (const theme of themes) {
  for (const [width, height] of sizes) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion: "reduce" });
    await ctx.addInitScript((t) => localStorage.setItem("lane-theme", t), theme);
    await signIn(ctx);
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
