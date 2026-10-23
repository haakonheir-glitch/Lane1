import type { ProfileScores } from "@/lib/scoring/profile";
import { cn } from "@/lib/cn";

/**
 * Five segments, one per session: the profile visibly building session by session.
 * `highlight` marks one session (the one just finished, on the session outro).
 */
export function SessionStrip({
  sessions,
  highlight,
  className,
}: {
  sessions: Pick<ProfileScores["sessions"][number], "id" | "completedAt" | "confidence">[];
  highlight?: string;
  className?: string;
}) {
  const done = sessions.filter((s) => s.completedAt).length;
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <ol className="grid w-full max-w-[360px] grid-cols-5 gap-1" aria-label={`${done} of ${sessions.length} sessions complete`}>
        {sessions.map((s) => {
          const state = s.completedAt ? (s.confidence === "low" ? "low" : "done") : "open";
          return (
            <li key={s.id} className="flex flex-col gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "h-1.5",
                  state === "done" ? "bg-ink" : state === "low" ? "bg-caution" : "bg-rule-strong",
                  s.id === highlight && "outline outline-1 outline-offset-2 outline-ink",
                )}
              />
              <span className={cn("label", state === "open" ? "text-ink-3" : "text-ink")}>
                {s.id}
                <span className="sr-only">{state === "done" ? " done" : state === "low" ? " done, low confidence" : " not done"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <span className="shrink-0 label text-ink-3">
        {done}/{sessions.length}
      </span>
    </div>
  );
}
