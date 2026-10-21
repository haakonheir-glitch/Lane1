import type { EvidenceEvent, EvidenceKind } from "@/lib/types";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/cn";

const kindLabel: Record<EvidenceKind, string> = {
  assessment: "Assessment",
  "sprint-start": "Sprint start",
  "sprint-end": "Sprint end",
  "check-in": "Check-in",
  outcome: "Re-weighting",
};

export function KindMarker({ kind, className }: { kind: EvidenceKind; className?: string }) {
  const common = "block shrink-0";
  switch (kind) {
    case "assessment":
      return <span aria-hidden className={cn(common, "size-2.5 border border-ink bg-bg", className)} />;
    case "sprint-start":
      return <span aria-hidden className={cn(common, "size-2.5 rounded-full border border-ink bg-bg", className)} />;
    case "sprint-end":
      return <span aria-hidden className={cn(common, "size-2.5 rounded-full bg-ink", className)} />;
    case "check-in":
      return <span aria-hidden className={cn(common, "size-1.5 rounded-full bg-ink-4", className)} />;
    case "outcome":
      return <span aria-hidden className={cn(common, "size-2 rotate-45 bg-ink", className)} />;
  }
}

export function TimelineLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Timeline legend">
      {(Object.keys(kindLabel) as EvidenceKind[]).map((k) => (
        <li key={k} className="flex items-center gap-2 label text-ink-3">
          <span className="flex size-3 items-center justify-center">
            <KindMarker kind={k} />
          </span>
          {kindLabel[k]}
        </li>
      ))}
    </ul>
  );
}

/** Vertical timeline of tests, sprints and outcomes, newest first. */
export function EvidenceTimeline({ events, laneNames }: { events: EvidenceEvent[]; laneNames: Record<string, string> }) {
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <ol className="relative">
      <span aria-hidden className="absolute bottom-2 left-[71px] top-2 w-px bg-rule sm:left-[87px]" />
      {sorted.map((e) => (
        <li key={e.id} className="relative grid grid-cols-[56px_32px_1fr] items-start py-3 sm:grid-cols-[72px_32px_1fr]">
          <time dateTime={e.date} className="pt-0.5 font-mono text-label uppercase text-ink-3">
            {formatDay(e.date)}
          </time>
          <span className="flex h-5 items-center justify-center">
            <KindMarker kind={e.kind} />
          </span>
          <div className="min-w-0">
            <p className="text-small text-ink">
              <span className="sr-only">{kindLabel[e.kind]}: </span>
              {e.title}
            </p>
            <p className="mt-0.5 text-small text-ink-3">
              {e.laneId && laneNames[e.laneId] && !e.detail.startsWith(laneNames[e.laneId]!) ? `${laneNames[e.laneId]} · ` : ""}
              {e.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
