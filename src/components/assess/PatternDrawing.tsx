/* Shape drawing for pattern-matrix items. */
import type { PatternCell } from "@/lib/types";

function Shape({ cell, cx, cy, s }: { cell: PatternCell; cx: number; cy: number; s: number }) {
  const cls = cell.filled ? "fill-ink stroke-ink" : "fill-none stroke-ink";
  const h = s / 2;
  switch (cell.shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={h} className={cls} strokeWidth={1.5} />;
    case "square":
      return <rect x={cx - h} y={cy - h} width={s} height={s} className={cls} strokeWidth={1.5} />;
    case "triangle":
      return <polygon points={`${cx},${cy - h} ${cx + h},${cy + h} ${cx - h},${cy + h}`} className={cls} strokeWidth={1.5} strokeLinejoin="round" />;
    case "diamond":
      return <polygon points={`${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}`} className={cls} strokeWidth={1.5} strokeLinejoin="round" />;
  }
}

export function CellGlyph({ cell, size = 80 }: { cell: PatternCell; size?: number }) {
  const s = size * 0.17;
  const gap = size * 0.26;
  const start = size / 2 - ((cell.count - 1) * gap) / 2;
  return (
    <>
      {Array.from({ length: cell.count }, (_, i) => (
        <Shape key={i} cell={cell} cx={start + i * gap} cy={size / 2} s={s} />
      ))}
    </>
  );
}

export function describe(cell: PatternCell) {
  return `${cell.count} ${cell.filled ? "filled" : "outlined"} ${cell.shape}${cell.count > 1 ? "s" : ""}`;
}

export function Matrix({ item }: { item: { cells: PatternCell[] } }) {
  const size = 80;
  return (
    <svg
      viewBox={`0 0 ${size * 3} ${size * 3}`}
      className="h-auto w-full max-w-[320px]"
      role="img"
      aria-label={`3 by 3 pattern. ${item.cells.map((c, i) => `Cell ${i + 1}: ${describe(c)}`).join(". ")}. Cell 9 is missing.`}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const cell = item.cells[i];
        return (
          <g key={i} transform={`translate(${c * size} ${r * size})`}>
            <rect x={0.5} y={0.5} width={size - 1} height={size - 1} className={cell ? "fill-surface stroke-rule" : "fill-none stroke-ink-4"} strokeDasharray={cell ? undefined : "3 3"} />
            {cell ? (
              <CellGlyph cell={cell} size={size} />
            ) : (
              <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={16} className="fill-ink-3">
                ?
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

