/**
 * The 1200×630 share image (Open Graph and Twitter): the landing headline beside a sample
 * Career map card. Rendered by next/og at build time; Satori supports flex layout only, so every
 * element with several children sets display: flex.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getSampleLaneMap } from "@/lib/data/sample";
import { sortMatches, bandLabel } from "@/lib/matching/fit";

export const SHARE_SIZE = { width: 1200, height: 630 };
export const SHARE_ALT = "Lane: find the work you're built for, with evidence. A sample Career map with a strong fit, one worth testing and an unlikely one.";

const INK = "#111111";
const INK_2 = "#47494e";
const INK_3 = "#63656a";
const BG = "#F7F7F5";
const RULE = "#e3e3df";
const RULE_STRONG = "#c9c9c4";
const BAND = "#c3c6cc";
const ACCENT = "#2340E8";

const font = (dir: string, file: string) => readFile(join(process.cwd(), "node_modules/geist/dist/fonts", dir, file));

/** Fit dot on a −1.5…+1.5 scale around the person's average, with its 90% range (as FitIndicator). */
function Fit({ vs, se }: { vs: number | null; se: number | null }) {
  const x = (v: number) => (Math.min(1.5, Math.max(-1.5, v)) / 1.5) * 50 + 50;
  const half = 1.645 * (se ?? 0);
  return (
    <div style={{ display: "flex", position: "relative", width: 110, height: 14, flexShrink: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 7, height: 1, background: RULE_STRONG }} />
      <div style={{ position: "absolute", left: 55, top: 0, width: 1, height: 14, background: "#8a8c91" }} />
      {vs !== null ? (
        <>
          <div style={{ position: "absolute", top: 5, height: 4, borderRadius: 2, background: BAND, left: (x(vs - half) / 100) * 110, width: Math.max(2, ((x(vs + half) - x(vs - half)) / 100) * 110) }} />
          <div style={{ position: "absolute", top: 3, width: 8, height: 8, borderRadius: 4, background: INK, left: (x(vs) / 100) * 110 - 4 }} />
        </>
      ) : null}
    </div>
  );
}

export async function renderShareImage() {
  const [regular, medium, mono, { rows }] = await Promise.all([
    font("geist-sans", "Geist-Regular.ttf"),
    font("geist-sans", "Geist-Medium.ttf"),
    font("geist-mono", "GeistMono-Regular.ttf"),
    getSampleLaneMap(),
  ]);
  const ordered = sortMatches(rows.map((r) => ({ match: r, name: r.name, row: r })), "fit").map((x) => x.row);
  const excerpt: typeof ordered = [];
  for (const band of ["strong", "testing", "unlikely"] as const) {
    const r = ordered.find((x) => x.band === band && !excerpt.some((e) => e.familyId === x.familyId));
    if (r) excerpt.push(r);
  }

  const label = { fontFamily: "Geist Mono", fontSize: 15, letterSpacing: 1.2, textTransform: "uppercase" as const, color: INK_3 };

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: BG, padding: "64px 72px", fontFamily: "Geist", color: INK }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 2, height: 22, background: INK }} />
            <div style={{ ...label, color: INK, fontSize: 20, letterSpacing: 4 }}>LANE</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Geist Medium", fontSize: 64, lineHeight: 1.06, letterSpacing: -2 }}>Find the work you&apos;re built for. With evidence.</div>
            <div style={{ marginTop: 26, fontSize: 24, lineHeight: 1.4, color: INK_2 }}>A profile matched to 205 career paths, then short real-world trials of the best ones.</div>
          </div>
          <div style={{ ...label }}>Free during the pilot · No card</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginLeft: 56, flex: 1, alignSelf: "center", background: "#ffffff", border: `1px solid ${RULE_STRONG}`, borderTop: `3px solid ${ACCENT}`, borderRadius: 4, padding: "22px 28px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 14, borderBottom: `1px solid ${RULE_STRONG}` }}>
            <div style={{ ...label }}>Career map</div>
            <div style={{ ...label }}>Sample</div>
          </div>
          {excerpt.map((l, i) => (
            <div key={l.id} style={{ display: "flex", flexDirection: "column", padding: "18px 0", borderBottom: i < excerpt.length - 1 ? `1px solid ${RULE}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Geist Medium", fontSize: 24, flex: 1, marginRight: 16 }}>{l.name}</div>
                <div style={{ ...label, fontSize: 13, color: l.band === "strong" ? INK : INK_3, border: `1px solid ${l.band === "strong" ? INK : RULE_STRONG}`, borderRadius: 2, padding: "3px 8px", flexShrink: 0 }}>
                  {bandLabel[l.band]}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ fontSize: 18, color: INK_2, flex: 1, marginRight: 16 }}>{l.familyName}</div>
                <Fit vs={l.vsAverage} se={l.se} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...SHARE_SIZE,
      fonts: [
        { name: "Geist", data: regular, style: "normal", weight: 400 },
        { name: "Geist Medium", data: medium, style: "normal", weight: 500 },
        { name: "Geist Mono", data: mono, style: "normal", weight: 400 },
      ],
    },
  );
}
