import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { SprintDetail } from "@/components/sprints/SprintDetail";
import { SampleBanner } from "@/components/report/SampleBanner";
import { ButtonLink } from "@/components/ui/Button";
import { DataLabel } from "@/components/data/DataLabel";
import { addDays, ciHalf, fmtSigned, formatDay } from "@/lib/format";
import { getLaneName, getSprint } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/sprints/[id]">): Promise<Metadata> {
  const sprint = await getSprint((await params).id);
  return { title: sprint?.title ?? "Sprint" };
}

export default async function SprintPage({ params }: PageProps<"/sprints/[id]">) {
  const { id } = await params;
  const sprint = await getSprint(id);
  if (!sprint) notFound();
  const laneName = getLaneName(sprint.laneId);

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
        <SampleBanner what="sprint records" className="mb-10" />
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

        <div className="mt-16">
          <SprintDetail sprint={sprint} />
        </div>
      </div>
    </AppPage>
  );
}
