/**
 * The Profile Mark as a standalone SVG string, for images rendered outside the page (share card,
 * Open Graph). Same geometry as <ProfileMark/>, with literal colours.
 */
import { MARK_VIEW, markGeometry, type MarkInput } from "../view/mark";

export function markSvg(m: MarkInput, { ink = "#111111", accent = "#2340E8", size = 240 } = {}): string {
  const g = markGeometry(m);
  const c = MARK_VIEW / 2;
  const parts = [
    `<circle cx="${c}" cy="${c}" r="${g.bezel.r}" stroke="${ink}" stroke-width="1" fill="none"/>`,
    ...g.ticks.map((t) => `<line x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}" stroke="${ink}" stroke-width="${t.measured ? 1.6 : 0.75}"/>`),
    `<path d="${g.gauge.track}" stroke="${ink}" stroke-width="0.75" fill="none"${g.gauge.band ? "" : ' stroke-dasharray="1.5 2.5"'}/>`,
    g.gauge.band ? `<path d="${g.gauge.band}" stroke="${ink}" stroke-width="5" fill="none"/>` : "",
    `<line x1="${g.gauge.mid[0]}" y1="${g.gauge.mid[1]}" x2="${g.gauge.mid[2]}" y2="${g.gauge.mid[3]}" stroke="${ink}" stroke-width="0.75"/>`,
    `<polygon points="${g.pentagon.reference}" stroke="${ink}" stroke-width="0.5" stroke-dasharray="1.5 2" fill="none"/>`,
    g.pentagon.shape ? `<polygon points="${g.pentagon.shape}" stroke="${ink}" stroke-width="1.5" stroke-linejoin="round" fill="none"/>` : "",
    `<circle cx="${c}" cy="${c}" r="1.5" fill="${ink}"/>`,
    g.value ? `<circle cx="${g.value.cx}" cy="${g.value.cy}" r="6" fill="${accent}"/>` : "",
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEW} ${MARK_VIEW}" width="${size}" height="${size}">${parts.join("")}</svg>`;
}

export const markDataUri = (m: MarkInput, opts?: Parameters<typeof markSvg>[1]) => `data:image/svg+xml;base64,${Buffer.from(markSvg(m, opts)).toString("base64")}`;
