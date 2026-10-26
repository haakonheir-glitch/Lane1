import type { ProfileScores } from "@/lib/scoring/profile";
import { MARK_LEGEND, MARK_VIEW, markGeometry, markInput, markLabel, type MarkInput } from "@/lib/view/mark";
import { cn } from "@/lib/cn";

/**
 * The Profile Mark: a person's scores drawn as one instrument face. Ink plus the accent only;
 * every element is a score (MARK_LEGEND). Pure SVG, no state. Parts not measured yet are drawn
 * as placeholders, so the mark visibly fills in as sessions are done. `reveal` draws it in once
 * (CSS only, off under reduced motion).
 */
export function ProfileMark({
  scores,
  input,
  size = 240,
  reveal = false,
  className,
  decorative = false,
}: {
  scores?: ProfileScores;
  /** Pass the mark data directly instead of scores (share images, tests). */
  input?: MarkInput;
  size?: number | string;
  reveal?: boolean;
  className?: string;
  /** Hide from screen readers when a nearby text already says the same. */
  decorative?: boolean;
}) {
  const m = input ?? markInput(scores!);
  const g = markGeometry(m);
  return (
    <svg
      viewBox={`0 0 ${MARK_VIEW} ${MARK_VIEW}`}
      width={size}
      height={size}
      fill="none"
      className={cn("text-ink", reveal && "mark-reveal", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : markLabel(m)}
    >
      <circle className="mark-bezel" cx={MARK_VIEW / 2} cy={MARK_VIEW / 2} r={g.bezel.r} stroke="currentColor" strokeWidth={1} />
      <g className="mark-ticks">
        {g.ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="currentColor"
            strokeWidth={t.measured ? 1.6 : 0.75}
            style={reveal ? { animationDelay: `${t.sector * 50}ms` } : undefined}
          />
        ))}
      </g>
      <path className="mark-track" d={g.gauge.track} stroke="currentColor" strokeWidth={0.75} strokeDasharray={g.gauge.band ? undefined : "1.5 2.5"} />
      {g.gauge.band ? <path className="mark-arc" d={g.gauge.band} stroke="currentColor" strokeWidth={5} pathLength={1} /> : null}
      <line x1={g.gauge.mid[0]} y1={g.gauge.mid[1]} x2={g.gauge.mid[2]} y2={g.gauge.mid[3]} stroke="currentColor" strokeWidth={0.75} />
      <polygon points={g.pentagon.reference} stroke="currentColor" strokeWidth={0.5} strokeDasharray="1.5 2" />
      {g.pentagon.shape ? <polygon className="mark-shape" points={g.pentagon.shape} stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" pathLength={1} /> : null}
      <circle cx={MARK_VIEW / 2} cy={MARK_VIEW / 2} r={1.5} fill="currentColor" />
      {g.value ? <circle className="mark-value" cx={g.value.cx} cy={g.value.cy} r={6} fill="var(--accent)" /> : null}
    </svg>
  );
}

/** "How to read your mark": the legend, as a list. */
export function MarkLegend({ className }: { className?: string }) {
  return (
    <dl className={cn("grid gap-3 text-small", className)}>
      {MARK_LEGEND.map((l) => (
        <div key={l.part} className="grid grid-cols-[96px_1fr] gap-3">
          <dt className="text-ink">{l.part}</dt>
          <dd className="text-ink-2">{l.reads}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The mark with its legend on hover and keyboard focus. */
export function ProfileMarkWithLegend({ scores, size = 240, reveal, className }: { scores: ProfileScores; size?: number; reveal?: boolean; className?: string }) {
  return (
    <figure className={cn("group relative inline-block outline-none", className)} tabIndex={0}>
      <ProfileMark scores={scores} size={size} reveal={reveal} />
      <figcaption
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 w-[360px] -translate-x-1/2 rounded-sm border border-rule-strong bg-paper p-4 opacity-0 transition-quiet group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <p className="mb-3 label text-ink-3">How to read your mark</p>
        <MarkLegend />
      </figcaption>
    </figure>
  );
}
