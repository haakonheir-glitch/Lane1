"use client";

import { useId } from "react";
import { Kbd } from "@/components/ui/Misc";
import type { PublicCell, PublicTrial } from "@/lib/bank/public";
import { useCountdown, useKeys, useOnce, useOnset } from "./hooks";
import { Timer } from "./Timer";
import type { Respond } from "./TaskRunner";

/* Shape, fill and count encodings follow the generator: SHAPES = circle, square, triangle,
   pentagon, hexagon, arrow; FILLS = empty, lines (45° hatch), solid; count 1–5 on a fixed
   layout; rotation in 45° steps. Hairline strokes, ink only. */

const SHAPE_NAMES = ["circle", "square", "triangle", "pentagon", "hexagon", "arrow"];
const FILL_NAMES = ["empty", "hatched", "solid"];

const LAYOUT: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.3, 0.5], [0.7, 0.5]],
  3: [[0.5, 0.28], [0.28, 0.72], [0.72, 0.72]],
  4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
};

const poly = (n: number, r: number, offset = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = offset + (i * 2 * Math.PI) / n;
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

function Glyph({ shape, r, fill }: { shape: number; r: number; fill: string }) {
  const common = { fill, stroke: "currentColor", strokeWidth: 1.25, strokeLinejoin: "round" as const };
  switch (shape) {
    case 0:
      return <circle r={r} {...common} />;
    case 1:
      return <rect x={-r * 0.85} y={-r * 0.85} width={r * 1.7} height={r * 1.7} {...common} />;
    case 2:
      return <polygon points={poly(3, r)} {...common} />;
    case 3:
      return <polygon points={poly(5, r)} {...common} />;
    case 4:
      return <polygon points={poly(6, r)} {...common} />;
    default:
      return <polygon points={`0,${-r} ${r * 0.75},${-r * 0.05} ${r * 0.3},${-r * 0.05} ${r * 0.3},${r} ${-r * 0.3},${r} ${-r * 0.3},${-r * 0.05} ${-r * 0.75},${-r * 0.05}`} {...common} />;
  }
}

export function describeCell(c: PublicCell) {
  return `${c.count} ${FILL_NAMES[c.fill]} ${SHAPE_NAMES[c.shape]}${c.count > 1 ? "s" : ""}${c.rotation ? `, rotated ${c.rotation * 45}°` : ""}`;
}

export function CellSvg({ cell, size = 80, hatchId }: { cell: PublicCell; size?: number; hatchId: string }) {
  const pts = LAYOUT[cell.count] ?? LAYOUT[1]!;
  const r = (cell.count === 1 ? 0.24 : cell.count === 2 ? 0.17 : cell.count === 5 ? 0.12 : 0.14) * size;
  const fill = cell.fill === 2 ? "currentColor" : cell.fill === 1 ? `url(#${hatchId})` : "none";
  return (
    <>
      {pts.map(([x, y], i) => (
        <g key={i} transform={`translate(${x * size} ${y * size}) rotate(${cell.rotation * 45})`}>
          <Glyph shape={cell.shape} r={r} fill={fill} />
        </g>
      ))}
    </>
  );
}

export function Hatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1" />
      </pattern>
    </defs>
  );
}

export function MatrixTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "matrix" }>; respond: Respond }) {
  const hatch = useId().replace(/:/g, "");
  const rt = useOnset();
  const once = useOnce();
  const pick = (choice: number | null) => once(() => void respond({ kind: "choice", choice }, rt()));
  const left = useCountdown(trial.timeLimitSec, () => pick(null));
  useKeys((k) => {
    const n = Number(k);
    if (n >= 1 && n <= trial.options.length) pick(n - 1);
  });
  const S = 80;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-3">Which option completes the grid?</p>
        <Timer left={left} limit={trial.timeLimitSec} />
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
        <svg
          viewBox={`0 0 ${S * 3} ${S * 3}`}
          className="h-auto w-full max-w-[320px] text-ink"
          role="img"
          aria-label={`3 by 3 grid. ${trial.grid.map((c, i) => (c ? `Cell ${i + 1}: ${describeCell(c)}` : `Cell ${i + 1}: missing`)).join(". ")}.`}
        >
          <Hatch id={hatch} />
          {trial.grid.map((c, i) => (
            <g key={i} transform={`translate(${(i % 3) * S} ${Math.floor(i / 3) * S})`}>
              <rect x={0.5} y={0.5} width={S - 1} height={S - 1} className={c ? "fill-surface stroke-rule" : "fill-none stroke-ink-4"} strokeDasharray={c ? undefined : "3 3"} />
              {c ? (
                <CellSvg cell={c} size={S} hatchId={hatch} />
              ) : (
                <text x={S / 2} y={S / 2 + 5} textAnchor="middle" fontSize={16} className="fill-ink-3">
                  ?
                </text>
              )}
            </g>
          ))}
        </svg>
        <div role="group" aria-label="Options" className="grid grid-cols-4 gap-2">
          {trial.options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              aria-label={`Option ${i + 1}: ${describeCell(o)}`}
              className="flex flex-col items-center gap-1 rounded-xs border border-rule bg-surface p-1 pb-2 text-ink transition-quiet hover:border-rule-strong"
            >
              <svg viewBox={`0 0 ${S} ${S}`} className="aspect-square w-full" aria-hidden>
                <Hatch id={`${hatch}o${i}`} />
                <CellSvg cell={o} size={S} hatchId={`${hatch}o${i}`} />
              </svg>
              <Kbd>{i + 1}</Kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
