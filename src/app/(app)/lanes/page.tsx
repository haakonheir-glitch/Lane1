import type { Metadata } from "next";
import { Suspense } from "react";
import { AppPage } from "@/components/shell/AppPage";
import { LaneMap } from "@/components/lanes/LaneMap";
import { EmptyState } from "@/components/report/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { getLanes, getSprints, getUser } from "@/lib/data";
import { templateForLane } from "@/lib/sprints/templates";

export const metadata: Metadata = { title: "Lane Map" };

export default async function LanesPage() {
  const [lanes, sprints, user] = await Promise.all([getLanes(), getSprints(), getUser()]);
  const templates = Object.fromEntries((lanes ?? []).map((l) => [l.id, templateForLane(l.id).id]));
  return (
    <AppPage
      title="Lane Map"
      meta={lanes ? `${lanes.length} lanes` : "Not ready"}
      action={
        <ButtonLink href="/sprints" variant="secondary" size="sm">
          Sprints
        </ButtonLink>
      }
    >
      <div className="max-w-content">
        <p className="label text-ink-3">Lanes · {user.reportId}</p>
        <h1 className="mt-4 max-w-[20ch] text-h1 font-medium text-ink">Your lanes, ranked against yourself.</h1>
        <p className="mt-4 max-w-reading text-body-l text-ink-2">
          A high rank means a lane uses more of your stronger traits than your weaker ones. It is a starting point for
          trying things, not a prediction of success. Select a lane to see why it ranks where it does.
        </p>
        <div className="mt-12">
          {lanes ? (
            <Suspense fallback={<Skeleton lines={8} />}>
              <LaneMap lanes={lanes} sprints={sprints} templates={templates} />
            </Suspense>
          ) : (
            <EmptyState
              label="Not ready"
              title="Your Lane Map appears when interests and personality are done."
              body="Those two modules take about 15 minutes together. Cognitive games and values sharpen the ranking but aren't required."
              action={<ButtonLink href="/assess">Continue assessment</ButtonLink>}
            />
          )}
        </div>
      </div>
    </AppPage>
  );
}
