import type { WorkBest } from "@/lib/workdesign/best";
import { cn } from "@/lib/cn";

/** Steps of the "your data" ramp for the blend's segments, strongest first (fills only). */
const FILL = ["bg-you-5", "bg-you-4", "bg-you-3", "bg-you-2", "bg-you-1"];

/**
 * The archetype blend as one bar: each value mode's share (softmax over the mode scores, matching
 * v2), the top two named. Archetypes are a metaphor for a measured pattern of value modes, never a
 * type or a claim about where anyone comes from; the caption says so. Server component.
 */
export function ArchetypeBlend({ blend }: { blend: NonNullable<WorkBest["archetype"]> }) {
  const shown = blend.blend.filter((b) => b.share >= 1);
  const rest = 100 - shown.reduce((a, b) => a + b.share, 0);
  return (
    <figure>
      <div className="flex h-3 w-full overflow-hidden rounded-xs" role="img" aria-label={`Archetype blend: ${blend.blend.map((b) => `${b.archetype} ${b.share}%`).join(", ")}`}>
        {shown.map((b, i) => (
          <div key={b.id} className={cn("h-full border-r border-bg last:border-r-0", FILL[Math.min(i, FILL.length - 1)])} style={{ width: `${b.share}%` }} title={`${b.archetype} (${b.name}) ${b.share}%`} />
        ))}
        {rest > 0 ? <div className="h-full bg-rule" style={{ width: `${rest}%` }} /> : null}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {blend.blend.slice(0, 5).map((b, i) => (
          <li key={b.id} className="flex items-center gap-2 text-small text-ink-2">
            <span aria-hidden className={cn("inline-block size-2.5 rounded-xs", FILL[Math.min(i, FILL.length - 1)])} />
            <span className={i < 2 ? "text-ink" : undefined}>{b.archetype}</span>
            <span className="font-mono text-label text-ink-3 tabular">{b.share}%</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 max-w-[64ch] text-small text-ink-3">
        A blend of nine archetypes, one per value mode, weighted by how strongly each mode shows in your scores. The archetypes are a metaphor for a measured pattern,
        not a personality type or a claim about where you come from.
      </figcaption>
    </figure>
  );
}
