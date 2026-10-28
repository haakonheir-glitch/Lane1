"use client";

import { useState } from "react";
import type { LaneRowData } from "@/lib/lanes/types";
import { bandLabel } from "@/lib/matching/fit";
import { cn } from "@/lib/cn";

/**
 * The Career map's default view under matching v2: every career path as a dot, fulfilment fit up
 * (the headline: does the work give you what you need; 50 = your average career path) and ability
 * fit across (can you meet what it demands; 100 = no shortfall). The vertical split is your
 * average career path; the horizontal split is ABILITY_SPLIT. Dot style is the fit band (from rank
 * stability over the draws), so a dot's band and its height can disagree near the middle.
 * Clicking a dot opens its detail; the five best are labelled and keyboard-reachable, and the list
 * views are the full accessible equivalent.
 */

/** Ability fit at or above which the work asks little beyond your measured reasoning range (a mean shortfall under 20 percentile points). Provisional. */
export const ABILITY_SPLIT = 80;

const W = 720;
const H = 520;
// Quadrant captions sit outside the frame (above it, and under the axis numbers), so dots and labels never cover them.
const M = { l: 48, r: 24, t: 30, b: 72 };
const LABELS = 5;

export function FitQuadrant({ rows, selected, onSelect }: { rows: LaneRowData[]; selected?: string; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const plotted = rows.filter((r) => r.fulfilment && r.ability && r.band !== "insufficient");
  const missing = rows.length - plotted.length;
  const minAbility = Math.min(40, ...plotted.map((r) => Math.floor((r.ability!.mean - 5) / 10) * 10));
  const X = { lo: Math.max(0, minAbility), hi: 100 };
  const maxF = Math.max(70, ...plotted.map((r) => Math.ceil(r.fulfilment!.mean + 2)));
  const minF = Math.min(30, ...plotted.map((r) => Math.floor(r.fulfilment!.mean - 2)));
  const Y = { lo: minF, hi: maxF };
  const x = (v: number) => M.l + ((Math.min(X.hi, Math.max(X.lo, v)) - X.lo) / (X.hi - X.lo)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - (Math.min(Y.hi, Math.max(Y.lo, v)) - Y.lo) / (Y.hi - Y.lo)) * (H - M.t - M.b);
  const top = [...plotted].sort((a, b) => b.fulfilment!.mean - a.fulfilment!.mean).slice(0, LABELS);
  const labelled = new Set(top.map((r) => r.id));
  // Labels to the right of their dot, nudged apart vertically so they never overlap.
  const placed: { r: LaneRowData; ly: number }[] = [];
  for (const r of [...top].sort((a, b) => y(a.fulfilment!.mean) - y(b.fulfilment!.mean))) {
    const want = y(r.fulfilment!.mean);
    const prev = placed[placed.length - 1];
    placed.push({ r, ly: prev ? Math.max(want, prev.ly + 15) : want });
  }
  const focus = plotted.find((r) => r.id === (hover ?? selected));
  const sx = x(ABILITY_SPLIT);
  const sy = y(50);
  // Draw strong last (on top), the selected and hovered dots above everything.
  const order = { unlikely: 0, insufficient: 0, testing: 1, strong: 2 } as const;
  const drawn = [...plotted].sort((a, b) => order[a.band] - order[b.band]);

  return (
    <figure className="mt-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={`Career paths by fulfilment fit and ability fit: ${plotted.length} plotted. The five best by fulfilment fit are labelled; the Family and Fit band views list every career path.`}>
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} className="fill-none stroke-rule-strong" />
        {[40, 60].map((t) => (
          <line key={t} x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="stroke-rule" />
        ))}
        {[60, 80].filter((t) => t > X.lo).map((t) => (t === ABILITY_SPLIT ? null : <line key={t} y1={M.t} y2={H - M.b} x1={x(t)} x2={x(t)} className="stroke-rule" />))}
        <line x1={M.l} x2={W - M.r} y1={sy} y2={sy} className="stroke-data-ref" strokeDasharray="3 3" />
        <line y1={M.t} y2={H - M.b} x1={sx} x2={sx} className="stroke-data-ref" strokeDasharray="3 3" />

        <g aria-hidden className="fill-ink-3" style={{ fontSize: 11 }}>
          <text x={W - M.r} y={M.t - 10} textAnchor="end">↑ Gives you what you need · mostly within your range →</text>
          <text x={M.l} y={M.t - 10}>↑ Gives you what you need · stretches your range</text>
          <text x={W - M.r} y={H - M.b + 34} textAnchor="end">↓ Gives you less · mostly within your range →</text>
          <text x={M.l} y={H - M.b + 34}>↓ Gives you less · stretches your range</text>
        </g>

        <g aria-hidden className="fill-ink-3" style={{ fontSize: 11 }}>
          {[40, 50, 60].map((t) => (
            <text key={t} x={M.l - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          ))}
          {[X.lo, 60, ABILITY_SPLIT, 100].filter((t, i, a) => a.indexOf(t) === i && t >= X.lo).map((t) => (
            <text key={t} x={x(t)} y={H - M.b + 16} textAnchor="middle">
              {t}
            </text>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" style={{ fontFamily: "var(--font-sans)" }}>
            Ability fit → (can you meet what it demands)
          </text>
          <text transform={`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" style={{ fontFamily: "var(--font-sans)" }}>
            Fulfilment fit → (does it give you what you need)
          </text>
        </g>

        {focus ? (
          <g aria-hidden className="stroke-you-4">
            <line x1={x(focus.ability!.p10)} x2={x(focus.ability!.p90)} y1={y(focus.fulfilment!.mean)} y2={y(focus.fulfilment!.mean)} />
            <line x1={x(focus.ability!.mean)} x2={x(focus.ability!.mean)} y1={y(focus.fulfilment!.p10)} y2={y(focus.fulfilment!.p90)} />
          </g>
        ) : null}

        {drawn.map((r) => {
          const cx = x(r.ability!.mean);
          const cy = y(r.fulfilment!.mean);
          const active = r.id === selected || r.id === hover;
          const mine = r.current || r.considering;
          return (
            <g
              key={r.id}
              aria-hidden={labelled.has(r.id) ? undefined : true}
              className="cursor-pointer"
              onClick={() => onSelect(r.id)}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover((h) => (h === r.id ? null : h))}
            >
              <title>{`${r.name}: ${bandLabel[r.band]} · fulfilment ${Math.round(r.fulfilment!.mean)} · ability ${Math.round(r.ability!.mean)}${r.provenance === "estimated" ? " · estimated career data" : ""}`}</title>
              <circle cx={cx} cy={cy} r={10} className="fill-transparent" />
              {mine ? <circle cx={cx} cy={cy} r={7} className="fill-none stroke-accent" strokeWidth={1.5} /> : null}
              {r.provenance === "estimated" ? <circle cx={cx} cy={cy} r={mine ? 9.5 : 7} className="fill-none stroke-caution" strokeWidth={1.25} strokeDasharray="2 2" /> : null}
              <circle
                cx={cx}
                cy={cy}
                r={active ? 5.5 : r.band === "strong" ? 4 : 3.5}
                className={cn(
                  active ? "fill-you-5 stroke-you-5" : r.band === "strong" ? "fill-ink stroke-ink" : r.band === "testing" ? "fill-data-band stroke-ink-4" : "fill-rule-strong stroke-rule-strong",
                )}
              />
            </g>
          );
        })}

        {placed.map(({ r, ly }) => (
          <g
            key={r.id}
            role="button"
            tabIndex={0}
            aria-label={`${r.name}: ${bandLabel[r.band]}, fulfilment fit ${Math.round(r.fulfilment!.mean)}, ability fit ${Math.round(r.ability!.mean)}${r.provenance === "estimated" ? ", estimated career data" : ""}. Open details.`}
            className="cursor-pointer outline-none [&:focus-visible_text]:underline"
            onClick={() => onSelect(r.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r.id);
              }
            }}
          >
            <line x1={x(r.ability!.mean) + 6} x2={x(r.ability!.mean) + 14} y1={y(r.fulfilment!.mean)} y2={ly} className="stroke-ink-4" />
            <text
              x={Math.min(x(r.ability!.mean) + 16, W - M.r - 4)}
              y={ly + 4}
              textAnchor={x(r.ability!.mean) + 16 > W - M.r - 160 ? "end" : "start"}
              className={cn("fill-ink stroke-bg", r.id === selected && "fill-accent")}
              strokeWidth={3}
              paintOrder="stroke"
              style={{ fontFamily: "var(--font-sans)", fontSize: 12 }}
            >
              {r.name}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-small text-ink-3">
        <span className="flex items-center gap-2">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="4" className="fill-ink" />
          </svg>
          Strong fit
        </span>
        <span className="flex items-center gap-2">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" className="fill-data-band stroke-ink-4" />
          </svg>
          Possible fit
        </span>
        <span className="flex items-center gap-2">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" className="fill-rule-strong" />
          </svg>
          Unlikely
        </span>
        <span className="flex items-center gap-2">
          <svg width="16" height="16" aria-hidden>
            <circle cx="8" cy="8" r="6" className="fill-none stroke-accent" strokeWidth={1.5} />
          </svg>
          Your current or considered career path
        </span>
        <span className="flex items-center gap-2">
          <svg width="16" height="16" aria-hidden>
            <circle cx="8" cy="8" r="6" className="fill-none stroke-caution" strokeWidth={1.25} strokeDasharray="2 2" />
          </svg>
          Estimated career data
        </span>
        {missing ? <span>{missing} not plotted (not enough data)</span> : null}
      </figcaption>
    </figure>
  );
}
