"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type LineSeries = {
  id: string;
  label: string;
  /** x is an index into xLabels. */
  points: { x: number; y: number; ci?: [number, number] }[];
  emphasis?: boolean;
};

const PAD = { top: 28, right: 16, bottom: 28, left: 40 };

/**
 * Hand-built SVG line chart on the token system: hairline baseline, mono ticks,
 * direct end labels instead of a legend, accent for the emphasised series only.
 */
export function LineChart({
  series,
  xLabels,
  yDomain,
  yTicks,
  unit,
  height = 220,
  label,
  endLabels = true,
  className,
}: {
  series: LineSeries[];
  xLabels: string[];
  yDomain: [number, number];
  yTicks?: number[];
  unit?: string;
  height?: number;
  label: string;
  endLabels?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rightPad = endLabels ? Math.min(140, Math.max(72, width * 0.18)) : PAD.right;
  const pw = width - PAD.left - rightPad;
  const ph = height - PAD.top - PAD.bottom;
  const n = Math.max(1, xLabels.length - 1);
  const [y0, y1] = yDomain;
  const sx = (x: number) => PAD.left + (x / n) * pw;
  const sy = (y: number) => PAD.top + (1 - (y - y0) / (y1 - y0)) * ph;
  const ticks = yTicks ?? [y0, (y0 + y1) / 2, y1];

  // Show at most ~6 x labels.
  const every = Math.max(1, Math.ceil(xLabels.length / Math.max(2, Math.floor(pw / 72))));

  // Muted series first so the emphasised line draws on top.
  const ordered = [...series].sort((a, b) => Number(!!a.emphasis) - Number(!!b.emphasis));

  // Nudge end labels apart so they never overlap.
  const ends = ordered
    .map((s) => {
      const last = s.points[s.points.length - 1];
      return last ? { id: s.id, label: s.label, y: sy(last.y), emphasis: s.emphasis, value: last.y } : null;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    const prev = ends[i - 1]!;
    const cur = ends[i]!;
    if (cur.y - prev.y < 14) cur.y = prev.y + 14;
  }

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <text x={PAD.left - 10} y={sy(t) + 3} textAnchor="end" fontSize={10} className="fill-ink-3">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
            <line x1={PAD.left - 4} x2={PAD.left} y1={sy(t)} y2={sy(t)} className="stroke-ink-4" />
          </g>
        ))}
        {unit ? (
          <text x={PAD.left - 10} y={10} textAnchor="end" fontSize={10} className="fill-ink-3">
            {unit}
          </text>
        ) : null}
        <line x1={PAD.left} x2={PAD.left + pw} y1={PAD.top + ph + 0.5} y2={PAD.top + ph + 0.5} className="stroke-rule-strong" />

        {xLabels.map((l, i) =>
          i % every === 0 || i === xLabels.length - 1 ? (
            <text key={i} x={sx(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"} fontSize={10} className="fill-ink-3">
              {l}
            </text>
          ) : null,
        )}

        {ordered.map((s) => {
          const withCi = s.points.filter((p) => p.ci);
          const area =
            s.emphasis && withCi.length > 1
              ? `M${withCi.map((p) => `${sx(p.x)},${sy(p.ci![1])}`).join("L")}L${[...withCi]
                  .reverse()
                  .map((p) => `${sx(p.x)},${sy(p.ci![0])}`)
                  .join("L")}Z`
              : null;
          const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`).join("");
          return (
            <g key={s.id}>
              {area ? <path d={area} className="fill-accent" opacity={0.1} /> : null}
              <path
                d={d}
                fill="none"
                strokeWidth={s.emphasis ? 1.75 : 1.25}
                strokeLinejoin="round"
                className={s.emphasis ? "stroke-accent" : "stroke-ink-4"}
              />
              {s.points.map((p) => (
                <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={s.emphasis ? 3 : 2} className={s.emphasis ? "fill-accent" : "fill-ink-4"}>
                  <title>{`${s.label} · ${xLabels[p.x] ?? ""}: ${p.y}${unit ? ` ${unit}` : ""}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {endLabels
          ? ends.map((e) => (
              <text key={e.id} x={PAD.left + pw + 10} y={e.y + 3} fontSize={10} className={e.emphasis ? "fill-accent" : "fill-ink-3"}>
                {e.label.length > 18 ? `${e.label.slice(0, 17)}…` : e.label}
              </text>
            ))
          : null}
      </svg>
    </div>
  );
}
