import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { SprintDetail } from "@/components/sprints/SprintDetail";
import { FinishSprint, StartSprintButton } from "@/components/sprints/SprintActions";
import { ButtonLink } from "@/components/ui/Button";
import { DataLabel } from "@/components/data/DataLabel";
import { addDays, ciHalf, fmtSigned, formatDay } from "@/lib/format";
import { getActiveSprint, getLaneName, getSprint } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/sprints/[id]">): Promise<Metadata> {
  const sprint = await getSprint((await params).id);
  return { title: sprint?.title ?? "Sprint" };
}

export default async function SprintPage({ params, searchParams }: PageProps<"/sprints/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const sprint = await getSprint(id);
  if (!sprint) notFound();
  const laneName = getLaneName(sprint.laneId);
  const active = sprint.status === "suggested" ? await getActiveSprint() : undefined;

  const statusLine =
    sprint.status === "active" ? `Day ${sprint.currentDay} of ${sprint.days}` : sprint.status === "completed" ? "Completed" : `Plan · ${sprint.days} days`;

  return (
    <AppPage
      title={sprint.title}
      meta={laneName}
      action={
        <ButtonLink href="/sprints" variant="ghost" size="sm">
          All sprints
        </ButtonLink>
      }
    >
      <div className="max-w-content">
        {sp.notice === "one-at-a-time" ? (
          <p role="status" className="mb-8 rounded-sm border border-rule-strong bg-surface p-4 text-small text-ink-2">
            You already have this sprint running. One sprint at a time keeps the evidence clean.
          </p>
        ) : null}
        <p className="label text-ink-3">
          Sprint · {laneName} · {statusLine}
        </p>
        <h1 className="mt-4 max-w-[22ch] text-h1 font-medium text-ink">{sprint.title}</h1>
        <p className="mt-4 max-w-reading text-body-l text-ink-2">{sprint.brief}</p>

        <div className="mt-10 grid grid-cols-2 gap-6 border-y border-rule py-6 sm:grid-cols-4">
          <DataLabel layout="stacked" label="Lane" value={laneName} small />
          <DataLabel layout="stacked" label="Length" value={sprint.days} unit="days" />
          <DataLabel
            layout="stacked"
            label="Window"
            value={sprint.startedOn ? `${formatDay(sprint.startedOn)}–${formatDay(addDays(sprint.startedOn, sprint.days - 1))}` : "Not started"}
            small
          />
          {sprint.outcome ? (
            <DataLabel layout="stacked" label="Improvement" value={sprint.outcome.improvementRate !== null ? `${fmtSigned(sprint.outcome.improvementRate)}%` : "—"} />
          ) : (
            <DataLabel layout="stacked" label="Check-ins" value={sprint.checkIns.length} unit={`/ ${sprint.days}`} />
          )}
        </div>

        {sprint.outcome ? (
          <section className="mt-10 rounded-sm border border-rule-strong bg-surface p-6" aria-label="Outcome">
            <p className="label text-ink-3">Outcome</p>
            <p className="mt-3 max-w-reading text-body-l text-ink">{sprint.outcome.summary}</p>
            <p className="mt-3 font-mono text-label text-ink-3">
              PERFORMANCE {sprint.outcome.performance ? `P${sprint.outcome.performance.value} ±${ciHalf(sprint.outcome.performance)}` : "— (NEEDS 10 PEERS)"} · ENERGY{" "}
              {sprint.outcome.energyAvg.toFixed(1)}/7 · CONTINUE {sprint.outcome.wantsToContinue ? "YES" : "NO"}
            </p>
          </section>
        ) : null}

        {sprint.status === "suggested" ? (
          <div className="mt-10">
            <StartSprintButton templateId={sprint.templateId} blockedBy={active ? { id: active.id, title: active.title } : undefined} />
          </div>
        ) : null}

        {sprint.status === "active" ? (
          <div className="mt-10">
            <FinishSprint sprintId={sprint.id} lastDay={(sprint.currentDay ?? 0) >= sprint.days} />
          </div>
        ) : null}

        <div className="mt-16">
          <SprintDetail sprint={sprint} />
        </div>
      </div>
    </AppPage>
  );
}
