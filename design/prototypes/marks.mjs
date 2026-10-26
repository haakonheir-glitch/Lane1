// Profile Mark prototypes for DIRECTION.md. Pure functions: same input → same SVG string.
// Input: { riasec: number[6] (raw 10–50, order R I A S E C), domains: number[5] (z, order O C E A N),
//          reasoning: [lo, hi] percentile or null, topValue: 0–5 (Achievement, Independence,
//          Recognition, Relationships, Support, Working conditions) }
const INK = "var(--ink, #111)";
const ACC = "var(--accent, #2340E8)";
const f = (n) => n.toFixed(2);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const t = (raw) => clamp((raw - 10) / 40); // interests on their 10–50 range, 10 at the centre
const u = (z) => clamp((z + 2.5) / 5); // personality z on −2.5…+2.5
const pol = (cx, cy, r, deg) => [cx + r * Math.cos(((deg - 90) * Math.PI) / 180), cy + r * Math.sin(((deg - 90) * Math.PI) / 180)];
const arc = (cx, cy, r, a0, a1) => {
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
};
const svg = (size, body, vb = 240) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${size}" height="${size}" fill="none">${body}</svg>`;

/** A — Dial: an instrument face. Interests as tick sectors on the bezel, personality as a pentagon, reasoning as a gauge arc, top value as one accent marker. */
export function markDial(p, size = 240) {
  const C = 120, out = [];
  out.push(`<circle cx="${C}" cy="${C}" r="113" stroke="${INK}" stroke-width="1"/>`);
  p.riasec.forEach((raw, i) => {
    for (let k = 0; k < 9; k++) {
      const a = i * 60 + 6 + k * 6;
      const len = 3 + t(raw) * 31;
      const [x0, y0] = pol(C, C, 106, a), [x1, y1] = pol(C, C, 106 - len, a);
      out.push(`<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${INK}" stroke-width="1.6" stroke-linecap="butt"/>`);
    }
  });
  // reasoning gauge: 300° sweep from 210° (0th pct) clockwise
  const g = (pct) => 210 + (pct / 100) * 300;
  out.push(`<path d="${arc(C, C, 70, 210, 510)}" stroke="${INK}" stroke-width="0.75"/>`);
  if (p.reasoning) out.push(`<path d="${arc(C, C, 70, g(p.reasoning[0]), g(p.reasoning[1]))}" stroke="${INK}" stroke-width="5"/>`);
  const [mx0, my0] = pol(C, C, 64, g(50)), [mx1, my1] = pol(C, C, 76, g(50));
  out.push(`<line x1="${f(mx0)}" y1="${f(my0)}" x2="${f(mx1)}" y2="${f(my1)}" stroke="${INK}" stroke-width="0.75"/>`);
  // personality pentagon + its midpoint reference
  const pent = (vals, r) => vals.map((v, i) => pol(C, C, 8 + v * r, i * 72).map(f).join(",")).join(" ");
  out.push(`<polygon points="${pent([0.5, 0.5, 0.5, 0.5, 0.5], 48)}" stroke="${INK}" stroke-width="0.5" stroke-dasharray="1.5 2"/>`);
  out.push(`<polygon points="${pent(p.domains.map(u), 48)}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`);
  out.push(`<circle cx="${C}" cy="${C}" r="1.5" fill="${INK}"/>`);
  // top value: accent marker on the bezel, on the boundary between sectors
  const [vx, vy] = pol(C, C, 113, p.topValue * 60);
  out.push(`<circle cx="${f(vx)}" cy="${f(vy)}" r="6" fill="${ACC}"/>`);
  return svg(size, out.join(""));
}

/** B — Rose: a scientific glyph. Interests as a ring of wedges, personality as five spokes, reasoning as a band on the inner ring, top value as one accent wedge outline. */
export function markRose(p, size = 240) {
  const C = 120, out = [];
  const wedge = (a0, a1, r0, r1) => {
    const [x0, y0] = pol(C, C, r0, a0), [x1, y1] = pol(C, C, r1, a0), [x2, y2] = pol(C, C, r1, a1), [x3, y3] = pol(C, C, r0, a1);
    return `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)} A${r1} ${r1} 0 0 1 ${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} A${r0} ${r0} 0 0 0 ${f(x0)} ${f(y0)}Z`;
  };
  out.push(`<circle cx="${C}" cy="${C}" r="112" stroke="${INK}" stroke-width="0.5" stroke-dasharray="1.5 2.5"/>`);
  p.riasec.forEach((raw, i) => out.push(`<path d="${wedge(i * 60 + 3, i * 60 + 57, 52, 52 + t(raw) * 60)}" stroke="${INK}" stroke-width="1.25" stroke-linejoin="round"/>`));
  out.push(`<circle cx="${C}" cy="${C}" r="46" stroke="${INK}" stroke-width="0.75"/>`);
  if (p.reasoning) out.push(`<path d="${arc(C, C, 46, (p.reasoning[0] / 100) * 360, (p.reasoning[1] / 100) * 360)}" stroke="${INK}" stroke-width="5"/>`);
  p.domains.forEach((z, i) => {
    const [x, y] = pol(C, C, 4 + u(z) * 34, i * 72 + 36);
    out.push(`<line x1="${C}" y1="${C}" x2="${f(x)}" y2="${f(y)}" stroke="${INK}" stroke-width="1"/><circle cx="${f(x)}" cy="${f(y)}" r="2.5" fill="${INK}"/>`);
  });
  const [vx, vy] = pol(C, C, 112, p.topValue * 60 + 30);
  out.push(`<circle cx="${f(vx)}" cy="${f(vy)}" r="5.5" fill="${ACC}"/>`);
  return svg(size, out.join(""));
}

/** C — Specimen: a square seal read top to bottom. Interests as six bars, personality as five strip tracks, reasoning as a percentile track, top value as one accent cell. */
export function markSpecimen(p, size = 240) {
  const out = [];
  out.push(`<rect x="8" y="8" width="224" height="224" stroke="${INK}" stroke-width="1"/>`);
  for (const [x, y, dx, dy] of [[8, 8, 1, 1], [232, 8, -1, 1], [8, 232, 1, -1], [232, 232, -1, -1]]) out.push(`<path d="M${x + dx * 10} ${y + dy * 3}H${x + dx * 3}V${y + dy * 10}" stroke="${INK}" stroke-width="2"/>`);
  // interests: 6 bars on a 10–50 baseline
  p.riasec.forEach((raw, i) => { const h = 6 + t(raw) * 70; out.push(`<rect x="${28 + i * 32}" y="${f(104 - h)}" width="20" height="${f(h)}" fill="${INK}"/>`); });
  out.push(`<line x1="24" y1="104.5" x2="216" y2="104.5" stroke="${INK}" stroke-width="0.75"/>`);
  // value cells: 6 small squares above, one in accent
  for (let i = 0; i < 6; i++) out.push(`<rect x="${32 + i * 32}" y="22" width="12" height="4" ${i === p.topValue ? `fill="${ACC}"` : `stroke="${INK}" stroke-width="0.5"`}/>`);
  // personality tracks
  p.domains.forEach((z, i) => {
    const y = 124 + i * 15, x = 24 + u(z) * 192;
    out.push(`<line x1="24" y1="${y}" x2="216" y2="${y}" stroke="${INK}" stroke-width="0.5"/><line x1="120" y1="${y - 3}" x2="120" y2="${y + 3}" stroke="${INK}" stroke-width="0.5"/><circle cx="${f(x)}" cy="${y}" r="3" fill="${INK}"/>`);
  });
  // reasoning track
  out.push(`<line x1="24" y1="210" x2="216" y2="210" stroke="${INK}" stroke-width="0.75"/>`);
  if (p.reasoning) out.push(`<rect x="${f(24 + (p.reasoning[0] / 100) * 192)}" y="206" width="${f(((p.reasoning[1] - p.reasoning[0]) / 100) * 192)}" height="8" fill="${INK}"/>`);
  return svg(size, out.join(""));
}

export const SAMPLES = [
  { name: "Sample A · persuader", riasec: [18, 30, 26, 34, 46, 28], domains: [0.2, 0.9, 1.4, -0.3, -0.8], reasoning: [45, 75], topValue: 2 },
  { name: "Sample B · analyst", riasec: [38, 47, 22, 20, 24, 40], domains: [0.8, 1.1, -1.0, 0.1, 0.2], reasoning: [70, 92], topValue: 1 },
  { name: "Sample C · maker", riasec: [30, 36, 48, 26, 22, 14], domains: [1.7, -0.6, 0.3, 0.6, 0.9], reasoning: [35, 68], topValue: 5 },
];
