// Renders the DIRECTION.md figures: mark options as standalone SVGs, plus PNG sheets of the
// options and the two cover directions. Usage: node design/prototypes/render.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { markDial, markRose, markSpecimen, SAMPLES } from "./marks.mjs";

const out = "design/direction";
mkdirSync(out, { recursive: true });
const literal = (s) => s.replaceAll("var(--ink, #111)", "#111111").replaceAll("var(--accent, #2340E8)", "#2340E8");
const opts = [["a-dial", "A · Dial", markDial], ["b-rose", "B · Rose", markRose], ["c-specimen", "C · Specimen", markSpecimen]];
for (const [id, , fn] of opts) SAMPLES.forEach((p, i) => writeFileSync(`${out}/mark-${id}-${i + 1}.svg`, literal(fn(p, 240))));

import { readFileSync } from "node:fs";
const b64 = (dir, file) => readFileSync(`node_modules/geist/dist/fonts/${dir}/${file}`).toString("base64");
const font = (fam, w, dir, file) => `@font-face{font-family:${fam};font-weight:${w};src:url(data:font/woff2;base64,${b64(dir, file)}) format("woff2")}`;
const css = `${font("Geist", 400, "geist-sans", "Geist-Regular.woff2")}${font("Geist", 500, "geist-sans", "Geist-Medium.woff2")}${font("GeistMono", 400, "geist-mono", "GeistMono-Regular.woff2")}
:root{--ink:#111;--accent:#2340E8}*{box-sizing:border-box;margin:0}body{background:#F7F7F5;color:#111;font-family:Geist;padding:48px}
.mono{font-family:GeistMono}.lab{font-family:GeistMono;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#63656a}
.paper{background:#fff;border:1px solid #c9c9c4}.rule{border-top:1px solid #e3e3df}`;

const sheet = `<style>${css}table{border-collapse:collapse}td{padding:16px 24px;vertical-align:top}th{text-align:left;padding:0 24px 12px}</style>
<table><tr><th></th>${SAMPLES.map((s) => `<th class="lab">${s.name}</th>`).join("")}</tr>
${opts.map(([, label, fn]) => `<tr><td class="lab" style="padding-top:110px">${label}</td>${SAMPLES.map((p) => `<td><div class="paper" style="padding:20px">${fn(p, 220)}</div></td>`).join("")}</tr>`).join("")}</table>`;

const A = SAMPLES[0];
const paths = [["B2B sales", "Strong fit"], ["Partnerships, channel & business development", "Strong fit"], ["Real estate brokerage", "Possible fit"]];
const brief = ["Persuading, leading and selling clearly appeal to you most.", "Extraversion is clearly higher than the rest of your personality profile.", "In the reasoning tasks, no area stood out clearly from the others."];
const figures = [["Holland code", "ESC"], ["Top work value", "Recognition"], ["Standout trait", "Extraversion"], ["Reasoning · 90% range", "P45–75"]];
const effort = "5 sessions · 391 answers · 12 timed tasks · 205 career paths";

// Direction 1: Dossier — portrait A4 sheets, cover and summary side by side
const d1 = `<style>${css}body{padding:56px 72px}.sheet{width:595px;height:842px;padding:56px;display:flex;flex-direction:column}</style>
<div style="display:flex;gap:40px;align-items:flex-start">
<div class="paper sheet">
  <div style="display:flex;justify-content:space-between"><span style="font-weight:500;letter-spacing:.14em;font-size:14px">LANE</span><span class="lab">LN-20261026-IH4F · 26.10.2026</span></div>
  <div style="margin-top:96px" class="lab">Career Profile</div>
  <div style="margin-top:12px;font-size:56px;line-height:58px;font-weight:500;letter-spacing:-.02em">Ingrid<br>Halvorsen</div>
  <div style="flex:1;display:flex;align-items:center;justify-content:center">${markDial(A, 300)}</div>
  <div class="rule" style="padding-top:14px;display:flex;justify-content:space-between"><span class="mono" style="font-size:12px">${effort}</span></div>
</div>
<div class="paper sheet">
  <div style="display:flex;justify-content:space-between"><span class="lab">Summary · Ingrid Halvorsen</span><span class="lab">01</span></div>
  <div style="display:flex;gap:28px;margin-top:28px;align-items:center">${markDial(A, 150)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;flex:1">${figures.map(([l, v]) => `<div><div class="lab">${l}</div><div style="font-size:22px;font-weight:500;margin-top:4px" class="${l.startsWith("Reas") || l.startsWith("Hol") ? "mono" : ""}">${v}</div></div>`).join("")}</div></div>
  <div style="margin-top:32px;background:#111;color:#f7f7f5;padding:22px 24px">
    <div class="lab" style="color:#b3b5ba">Your three closest career paths</div>
    ${paths.map(([n, b], i) => `<div style="display:flex;justify-content:space-between;gap:16px;padding:12px 0;${i ? "border-top:1px solid #3a3c41" : ""}"><span style="font-size:17px"><span class="mono" style="color:#9a9ca2;margin-right:12px">0${i + 1}</span>${n}</span><span class="lab" style="color:#ededea;border:1px solid #6e7076;padding:2px 6px;height:fit-content;white-space:nowrap">${b}</span></div>`).join("")}
  </div>
  <div style="margin-top:28px" class="lab">In brief</div>
  ${brief.map((s, i) => `<div style="display:grid;grid-template-columns:28px 1fr;margin-top:10px;font-size:15px;line-height:22px"><span class="mono" style="color:#63656a">0${i + 1}</span>${s}</div>`).join("")}
  <div style="flex:1"></div><div class="rule lab" style="padding-top:12px">Measured with validated instruments · every score has a 90% range · see Method and limits</div>
</div></div>`;

// Direction 2: Instrument — landscape, offset stack, the mark as the hero
const d2 = `<style>${css}body{padding:56px 72px}.land{width:900px;height:560px;padding:44px 52px}</style>
<div style="position:relative;height:700px">
<div class="paper land" style="position:absolute;left:56px;top:56px"></div>
<div class="paper land" style="position:absolute;left:28px;top:28px"></div>
<div class="paper land" style="position:absolute;left:0;top:0;display:grid;grid-template-columns:420px 1fr;gap:40px">
  <div style="display:flex;align-items:center;justify-content:center;border-right:1px solid #e3e3df;padding-right:40px">${markDial(A, 380)}</div>
  <div style="display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between"><span style="font-weight:500;letter-spacing:.14em;font-size:14px">LANE</span><span class="lab">LN-20261026-IH4F</span></div>
    <div style="margin-top:auto" class="lab">Career Profile · 26 October 2026</div>
    <div style="margin-top:12px;font-size:60px;line-height:62px;font-weight:500;letter-spacing:-.025em">Ingrid Halvorsen</div>
    <div style="margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:14px 20px">${figures.map(([l, v]) => `<div class="rule" style="padding-top:8px"><div class="lab">${l}</div><div style="font-size:20px;font-weight:500;margin-top:2px">${v}</div></div>`).join("")}</div>
    <div class="mono" style="margin-top:28px;font-size:12px;color:#47494e">${effort}</div>
  </div>
</div></div>`;

const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
for (const [name, html, w, h] of [["marks-sheet", sheet, 1000, 900], ["cover-dossier", d1, 1440, 980], ["cover-instrument", d2, 1440, 820]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<!doctype html>${html}`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  await p.close();
}
await b.close();
console.log("rendered");
