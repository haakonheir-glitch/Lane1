import { ButtonLink } from "@/components/ui/Button";
import type { AssessmentModule, ModuleStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { pad2 } from "@/lib/format";

const statusText: Record<ModuleStatus, string> = {
  complete: "Complete",
  "in-progress": "In progress",
  "not-started": "Not started",
};

export function StatusMark({ status }: { status: ModuleStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-2 label", status === "complete" ? "text-positive" : status === "in-progress" ? "text-ink" : "text-ink-3")}>
      <span
        aria-hidden
        className={cn(
          "relative size-2 overflow-hidden rounded-full",
          status === "complete" ? "bg-positive" : status === "in-progress" ? "border border-ink" : "border border-ink-4",
        )}
      >
        {status === "in-progress" ? <span className="absolute inset-y-0 left-0 w-1/2 bg-ink" /> : null}
      </span>
      {statusText[status]}
    </span>
  );
}

export function ModuleRow({ module, index, primary }: { module: AssessmentModule; index: number; primary?: boolean }) {
  const pct = Math.round((module.answered / module.items) * 100);
  const action = module.status === "complete" ? "Review" : module.status === "in-progress" ? "Resume" : "Start";
  return (
    <li className="grid grid-cols-[32px_1fr] gap-x-4 gap-y-4 border-b border-rule py-6 md:grid-cols-[40px_1.4fr_1fr_120px] md:items-center">
      <span className="font-mono text-small text-ink-3">{pad2(index)}</span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-h3 font-medium text-ink">{module.title}</h3>
          <span className="label text-ink-3">{module.instrument}</span>
        </div>
        <p className="mt-2 max-w-reading text-small text-ink-2">{module.description}</p>
        {module.parts ? (
          <ul className="mt-3 flex flex-col gap-1">
            {module.parts.map((p) => (
              <li key={p.title} className="flex items-center justify-between gap-4 text-small text-ink-2 sm:max-w-sm">
                {p.title}
                <StatusMark status={p.status} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="col-start-2 flex flex-col gap-2 md:col-start-auto">
        <div className="flex items-baseline justify-between">
          <StatusMark status={module.status} />
          <span className="font-mono text-label text-ink-3">
            ~{module.minutes} MIN · {module.answered}/{module.items}
          </span>
        </div>
        <div className="h-1 w-full bg-rule" aria-hidden>
          <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="col-start-2 md:col-start-auto md:text-right">
        <ButtonLink href={`/assess/${module.id}`} variant={primary ? "primary" : module.status === "complete" ? "ghost" : "secondary"} size="sm">
          {action}
          <span className="sr-only"> {module.title}</span>
        </ButtonLink>
      </div>
    </li>
  );
}
