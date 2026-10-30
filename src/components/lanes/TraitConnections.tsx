import Link from "next/link";
import type { Connections } from "@/lib/view/connections";
import { bandLabel } from "@/lib/matching/fit";
import { cn } from "@/lib/cn";

const ROW = 64;

/**
 * Your clearest strengths on the left, your best career paths on the right, and a thin line
 * wherever a strength is one of the drivers behind that path's fit. A path with no line is
 * driven by other parts of the profile. Lines are data, not decoration.
 */
export function TraitConnections({ data, className }: { data: Connections; className?: string }) {
  const { traits, paths } = data;
  if (!traits.length || !paths.length) return null;
  const h = Math.max(traits.length, paths.length) * ROW;
  const yOf = (i: number, n: number) => (h - n * ROW) / 2 + i * ROW + ROW / 2;
  return (
    <figure className={cn("w-full", className)}>
      <div className="grid grid-cols-[minmax(0,220px)_minmax(80px,1fr)_minmax(0,300px)]" style={{ height: h }}>
        <ul aria-label="Your clearest strengths" className="relative">
          {traits.map((t, i) => (
            <li key={t.key} className="absolute inset-x-0 flex -translate-y-1/2 flex-col items-end pr-3 text-right" style={{ top: yOf(i, traits.length) }}>
              <span className="text-body font-medium text-ink">{t.label}</span>
              <span className="text-small text-ink-3">
                {t.kind} · {t.basis}
              </span>
            </li>
          ))}
        </ul>
        <svg aria-hidden viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" width="100%" height={h} className="block overflow-visible">
          {paths.flatMap((p, j) =>
            p.keys.map((k) => {
              const i = traits.findIndex((t) => t.key === k);
              const y1 = yOf(i, traits.length);
              const y2 = yOf(j, paths.length);
              return <path key={`${k}-${p.id}`} d={`M0 ${y1} C 50 ${y1}, 50 ${y2}, 100 ${y2}`} className="stroke-you-5" strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" />;
            }),
          )}
          {traits.map((t, i) => (
            <line key={t.key} x1={0} y1={yOf(i, traits.length)} x2={0.01} y2={yOf(i, traits.length)} strokeWidth={7} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-you-5" />
          ))}
          {paths.map((p, j) => (
            <line key={p.id} x1={99.99} y1={yOf(j, paths.length)} x2={100} y2={yOf(j, paths.length)} strokeWidth={7} strokeLinecap="round" vectorEffect="non-scaling-stroke" className={p.keys.length ? "stroke-ink" : "stroke-ink-4"} />
          ))}
        </svg>
        <ol aria-label="Your directions' career paths" className="relative">
          {paths.map((p, j) => (
            <li key={p.id} className="absolute inset-x-0 flex -translate-y-1/2 flex-col pl-3" style={{ top: yOf(j, paths.length) }}>
              <Link href={`/lanes?lane=${p.id}`} className="truncate text-body font-medium text-ink hover:underline hover:underline-offset-4">
                {p.name}
              </Link>
              <span className="truncate text-small text-ink-3">
                {bandLabel[p.band]}
                {p.estimated ? <span className="text-caution"> · estimated career data</span> : null}
                {p.keys.length ? null : " · driven by other parts of your profile"}
              </span>
              <span className="sr-only">{p.keys.length ? `Driven by ${p.keys.map((k) => traits.find((t) => t.key === k)!.label).join(", ")}.` : ""}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-4 text-small text-ink-3">
        A line means the strength on the left is one of the reasons the matching gave for the career path on the right. Blue is your data.
      </figcaption>
    </figure>
  );
}
