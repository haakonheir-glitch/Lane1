import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SegmentedProgress } from "@/components/data/SegmentedProgress";
import { DataLabel } from "@/components/data/DataLabel";
import { addDays, formatDay } from "@/lib/format";
import type { Sprint } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Sprint summary: title, lane, day X of Y, next task, latest check-in. */
export function SprintCard({ sprint, laneName, size = "md" }: { sprint: Sprint; laneName: string; size?: "md" | "lg" }) {
  const day = sprint.currentDay ?? 0;
  const done = sprint.tasks.filter((t) => t.done).length;
  const next = sprint.tasks.find((t) => !t.done);
  const last = sprint.checkIns[sprint.checkIns.length - 1];
  const large = size === "lg";

  return (
    <article className={cn("rounded-sm border border-rule bg-surface", large ? "p-6 sm:p-8" : "p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="label text-ink-3">
            {sprint.kind === "practice" ? "Practice tasks · " : ""}
            {laneName}
            {sprint.startedOn ? ` · Started ${formatDay(sprint.startedOn)}` : ""}
          </p>
          <h3 className={cn("mt-2 font-medium text-ink", large ? "text-h2" : "text-h3")}>
            <Link href={`/sprints/${sprint.id}`} className="transition-quiet hover:text-ink-2">
              {sprint.title}
            </Link>
          </h3>
        </div>
        <span className="shrink-0 font-mono text-small text-ink">
          Day {String(day).padStart(2, "0")}
          <span className="text-ink-3"> / {sprint.days}</span>
        </span>
      </div>

      <SegmentedProgress
        className="mt-6"
        total={sprint.days}
        done={done}
        current={day}
        label={`Day ${day} of ${sprint.days}, ${done} tasks done`}
      />
      {sprint.startedOn ? (
        <div className="mt-2 flex justify-between label text-ink-3">
          <span>{formatDay(sprint.startedOn)}</span>
          <span>{formatDay(addDays(sprint.startedOn, sprint.days - 1))}</span>
        </div>
      ) : null}

      <div className={cn("mt-6 grid gap-6 border-t border-rule pt-6", large ? "sm:grid-cols-[1.4fr_1fr]" : "")}>
        {next ? (
          <div>
            <p className="label text-ink-3">Today · Day {next.day}</p>
            <p className="mt-2 text-body-l text-ink">{next.title}</p>
            {next.detail ? <p className="mt-1 text-small text-ink-2">{next.detail}</p> : null}
          </div>
        ) : null}
        {last ? (
          <div className="flex flex-col gap-2">
            <p className="label text-ink-3">Latest check-in · Day {last.day}</p>
            <DataLabel label="Energy" value={last.energy} unit="/7" />
            <DataLabel label="Flow" value={last.flow} unit="/7" />
            <DataLabel label="Continue" value={last.continue} unit="/7" />
          </div>
        ) : null}
      </div>

      {large ? (
        <div className="mt-6">
          <Link
            href={`/sprints/${sprint.id}`}
            className="inline-flex items-center gap-2 text-small text-ink transition-quiet hover:text-ink-2"
          >
            Open today&apos;s task <ArrowRight aria-hidden strokeWidth={1.5} className="size-4" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}
