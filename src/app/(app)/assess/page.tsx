import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { SectionHeader } from "@/components/report/SectionHeader";
import { ButtonLink } from "@/components/ui/Button";
import { SessionStrip } from "@/components/report/SessionStrip";
import { getAssessmentHub, type HubSession } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Assessment" };

function statusText(s: HubSession) {
  if (s.status === "completed") return s.confidence === "low" ? "Done · low confidence" : "Done";
  if (s.status === "discarded") return "Not used · retake";
  if (s.status === "in_progress") return "In progress";
  return "Not started";
}

export default async function AssessPage() {
  const sessions = await getAssessmentHub();
  const done = sessions.filter((s) => s.status === "completed").length;
  const minutesLeft = sessions.filter((s) => s.status !== "completed").reduce((n, s) => n + Math.round(s.minutes * (1 - s.answered / s.total)), 0);
  const next = sessions.find((s) => s.status !== "completed");
  const total = sessions.reduce((n, s) => n + s.minutes, 0);

  return (
    <AppPage title="Assessment" meta={`${done}/5 sessions`}>
      <div className="max-w-content">
        <p className="label text-ink-3">Profile · Assessment</p>
        {next ? (
          <>
            <h1 className="mt-4 max-w-[22ch] text-h1 font-medium text-ink">Five sessions. Never more than 30 minutes at a time.</h1>
            <p className="mt-4 max-w-reading text-body-l text-ink-2">
              About {total} minutes in total, split so you&apos;re never answering for so long that answers get careless.
              Each session unlocks part of your profile. Progress is saved after every answer.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-6 border-t border-ink pt-5 pb-6 sm:grid-cols-3">
              {[
                { label: "Sessions", value: `${done}/5`, unit: "done" },
                { label: "Remaining", value: `~${minutesLeft}`, unit: "min" },
                { label: "Next", value: next.id, unit: next.title },
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <span className="label text-ink-3">{s.label}</span>
                  <span className="font-mono text-h2 text-ink">
                    {s.value} <span className="text-label text-ink-3">{s.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 max-w-[22ch] text-h1 font-medium text-ink">Profile complete.</h1>
            <p className="mt-4 max-w-reading text-body-l text-ink-2">
              All five sessions are done. Your profile report sets out what was measured and how precisely; your Career map shows the career paths
              that fit it best, and what each involves.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 border-t border-ink pt-6 pb-6">
              <ButtonLink href="/profile">Read your report</ButtonLink>
              <ButtonLink href="/lanes">Open your Career map</ButtonLink>
            </div>
          </>
        )}
        <div className="flex flex-col gap-2 border-y border-rule py-4 sm:flex-row sm:items-center sm:justify-between">
          <SessionStrip
            sessions={sessions.map((s) => ({ id: s.id, completedAt: s.status === "completed" ? "done" : null, confidence: s.confidence }))}
            highlight={next?.id}
            className="sm:w-[420px]"
          />
          <p className="text-small text-ink-2">{next ? "Your profile builds with every session you finish." : "You can review any session, or retake one if your answers have changed."}</p>
        </div>

        <section className="mt-16" aria-labelledby="sessions-h">
          <SectionHeader index="01" label="Sessions" title={next ? "In this order works best" : "Your sessions"} id="sessions-h" />
          <ol className="border-t border-rule">
            {sessions.map((s) => {
              const pct = Math.round((s.answered / s.total) * 100);
              const primary = s.id === next?.id;
              const action = s.status === "completed" ? "Review" : s.status === "in_progress" ? "Resume" : s.status === "discarded" ? "Retake" : "Start";
              return (
                <li key={s.id} className="grid grid-cols-[40px_1fr] gap-x-4 gap-y-4 border-b border-rule py-6 md:grid-cols-[48px_1.5fr_1fr_120px] md:items-start">
                  <span className={cn("font-mono text-small", primary ? "text-ink" : "text-ink-3")}>{s.id}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-h3 font-medium text-ink">{s.title}</h3>
                      <span className="label text-ink-3">~{s.minutes} min</span>
                    </div>
                    <p className="mt-2 text-small text-ink-2">
                      <span className="text-ink">Unlocks:</span> {s.unlocks}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-1 label text-ink-3" aria-label="Measures">
                      {s.blocks.map((b, i) => (
                        <li key={b.title}>
                          <span className={b.experimental ? "text-ink-3" : "text-ink-2"}>{b.title}</span>
                          {b.experimental ? <span className="text-ink-3"> (research)</span> : null}
                          {i < s.blocks.length - 1 ? <span aria-hidden className="pl-2 text-ink-4">·</span> : null}
                        </li>
                      ))}
                    </ul>
                    {s.precheck ? <p className="mt-3 text-small text-ink-3">Needs a quiet place and 25 uninterrupted minutes. A keyboard is recommended.</p> : null}
                  </div>
                  <div className="col-start-2 flex flex-col gap-2 md:col-start-auto">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={cn("label", s.status === "completed" && s.confidence !== "low" ? "text-positive" : s.confidence === "low" || s.status === "discarded" ? "text-caution" : "text-ink-3")}>
                        {statusText(s)}
                      </span>
                      <span className="font-mono text-label text-ink-3">{s.completedAt ? formatDate(s.completedAt.toISOString()) : `${pct}%`}</span>
                    </div>
                    <div className="h-1 w-full bg-rule" aria-hidden>
                      <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="col-start-2 md:col-start-auto md:text-right">
                    <ButtonLink href={`/assess/${s.id}`} variant={primary ? "primary" : s.status === "completed" ? "ghost" : "secondary"} size="sm">
                      {action}
                      <span className="sr-only"> session {s.id}</span>
                    </ButtonLink>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-6 max-w-reading text-small text-ink-3">
            Sessions marked &quot;research&quot; include {BRAND.name}&apos;s own experimental questions. They are collected for the pilot and are not part of your results until
            validated. If you stop after S1 and S2, you still get interests, values and personality, and a partial Career map.
          </p>
        </section>
      </div>
    </AppPage>
  );
}
