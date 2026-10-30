/**
 * The 1200×630 share card: the Profile Mark, a first name, Holland code, top work value and the
 * one career path from each of the first three directions (unnumbered), with the wordmark. One component for a person's own card (opt-in,
 * /api/share) and the site's Open Graph image (the sample profile). Rendered by next/og; Satori
 * supports flex layout only, so every element with several children sets display: flex.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getSamplePicks, getSampleProfile, getSampleUser } from "@/lib/data/sample";
import { bandLabel } from "@/lib/matching/fit";
import { shareCardFrom, type ShareCard } from "./share-card";
import { BRAND } from "../brand";
import { markDataUri } from "./mark-svg";

export const SHARE_SIZE = { width: 1200, height: 630 };
export const SHARE_ALT = `${BRAND.name}: a sample Career Profile with its Profile Mark, Holland code, top work value and career paths from three directions.`;

const INK = "#111111";
const INK_2 = "#47494e";
const INK_3 = "#63656a";
const BG = "#F7F7F5";
const PAPER = "#ffffff";
const EDGE = "#c9c9c4";
const PANEL_INK = "#f7f7f5";
const PANEL_INK_2 = "#b3b5ba";
const PANEL_RULE = "#3a3c41";

const font = (dir: string, file: string) => readFile(join(process.cwd(), "node_modules/geist/dist/fonts", dir, file));

export async function renderShareCard(card: ShareCard) {
  const [regular, medium, mono] = await Promise.all([font("geist-sans", "Geist-Regular.ttf"), font("geist-sans", "Geist-Medium.ttf"), font("geist-mono", "GeistMono-Regular.ttf")]);
  const label = { fontFamily: "Geist Mono", fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" as const, color: INK_3 };
  const facts: [string, string, boolean][] = (
    [
      ["Holland code", card.hollandCode, true],
      ["Top work value", card.topValue, false],
      ["Standout trait", card.personality, false],
      ["Reasoning · 90% range", card.reasoning, true],
    ] as [string, string | null | undefined, boolean][]
  ).filter((x): x is [string, string, boolean] => !!x[1]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: BG, padding: 44, fontFamily: "Geist", color: INK }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 480, flexShrink: 0, background: PAPER, border: `1px solid ${EDGE}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markDataUri(card.mark, { size: 400 })} width={400} height={400} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 44 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: 2, height: 18, background: INK, marginRight: 12 }} />
              <div style={{ fontFamily: "Geist Mono", fontSize: 18, letterSpacing: 3.5, color: INK }}>{BRAND.upper}</div>
            </div>
            <div style={{ ...label }}>{card.sample ? "Sample profile" : "Career Profile"}</div>
          </div>
          <div style={{ marginTop: 26, fontFamily: "Geist Medium", fontSize: 60, lineHeight: 1.05, letterSpacing: -2 }}>{card.firstName}</div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 18 }}>
            {facts.map(([l, v, monoFace]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", width: "50%", marginBottom: 12 }}>
                <div style={{ ...label, fontSize: 11 }}>{l}</div>
                <div style={{ fontFamily: monoFace ? "Geist Mono" : "Geist Medium", fontSize: 26, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", background: INK, color: PANEL_INK, padding: "16px 20px" }}>
            <div style={{ ...label, fontSize: 11, color: PANEL_INK_2 }}>Your directions</div>
            {card.paths.map((p, i) => (
              <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: i ? `1px solid ${PANEL_RULE}` : "none", marginTop: i ? 0 : 4 }}>
                <div style={{ display: "flex", flexDirection: "column", marginRight: 12 }}>
                  <div style={{ display: "flex", fontSize: 20 }}>{p.name}</div>
                  {p.estimated ? <div style={{ ...label, fontSize: 10, color: PANEL_INK_2, marginTop: 2 }}>Estimated career data</div> : null}
                </div>
                <div style={{ ...label, fontSize: 10, color: PANEL_INK, border: `1px solid ${PANEL_INK_2}`, padding: "2px 6px", flexShrink: 0 }}>{bandLabel[p.band]}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 14, color: INK_2 }}>Measured with validated instruments. Fit with a profile, not a prediction.</div>
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

/** The site's Open Graph image: the same card, with the sample profile. */
export async function renderShareImage() {
  const [profile, picks, user] = await Promise.all([getSampleProfile(), getSamplePicks(), getSampleUser()]);
  return renderShareCard(shareCardFrom(profile, user.name.split(" ")[0]!, picks, { sample: true, personality: true, reasoning: true }));
}
