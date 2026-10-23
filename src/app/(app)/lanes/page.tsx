import type { Metadata } from "next";
import { Suspense } from "react";
import { AppPage } from "@/components/shell/AppPage";
import { LaneMap } from "@/components/lanes/LaneMap";
import { LaneSummary } from "@/components/lanes/LaneSummary";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { getLaneMap, getUser } from "@/lib/data";
import { SampleBanner } from "@/components/report/SampleBanner";
import { OwnResultsNote } from "@/components/report/OwnResultsNote";
import { OnetAttribution } from "@/components/report/OnetAttribution";

export const metadata: Metadata = { title: "Lane Map" };

export default async function LanesPage({ searchParams }: PageProps<"/lanes">) {
  const { lane } = await searchParams;
  const [{ rows, vocab, detail, source }, user] = await Promise.all([getLaneMap(typeof lane === "string" ? lane : null), getUser()]);
  return (
    <AppPage
      title="Lane Map"
      meta={`${rows.length} lanes · ${vocab.families.length} families${source === "sample" ? " · sample" : ""}`}
      action={
        <ButtonLink href="/sprints" variant="secondary" size="sm">
          Sprints
        </ButtonLink>
      }
    >
      <div className="max-w-content">
        {source === "own" ? <OwnResultsNote className="mb-10" /> : <SampleBanner what="Lane Map results" className="mb-10" />}
        <p className="label text-ink-3">Lanes · {user.reportId}</p>
        <h1 className="mt-4 max-w-[20ch] text-h1 font-medium text-ink">Your lanes, compared with each other.</h1>
        <p className="mt-4 max-w-reading text-body-l text-ink-2">
          Every kind of paid work, in {vocab.families.length} families. A lane is a strong fit when it uses more of your stronger traits than your
          weaker ones, clearly enough to survive measurement error. It is a starting point for trying things, not a prediction of success.
        </p>
        <div className="mt-14">
          <LaneSummary rows={rows} />
        </div>
        <div className="mt-16">
          <Suspense fallback={<Skeleton lines={8} />}>
            <LaneMap rows={rows} vocab={vocab} detail={detail} />
          </Suspense>
        </div>
        <OnetAttribution className="mt-20" />
      </div>
    </AppPage>
  );
}
