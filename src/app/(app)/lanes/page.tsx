import type { Metadata } from "next";
import { Suspense } from "react";
import { AppPage } from "@/components/shell/AppPage";
import { LaneMap } from "@/components/lanes/LaneMap";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { formatIsoDot } from "@/lib/format";
import { getLanes, getProfile, getSprints } from "@/lib/data";

export const metadata: Metadata = { title: "Lane Map" };

export default async function LanesPage() {
  const [lanes, sprints, profile] = await Promise.all([getLanes(), getSprints(), getProfile()]);
  return (
    <AppPage
      title="Lane Map"
      meta={`${lanes.length} lanes · updated ${formatIsoDot("2026-10-02")}`}
      action={
        <ButtonLink href="/sprints" variant="secondary" size="sm">
          Sprints
        </ButtonLink>
      }
    >
      <div className="max-w-content">
        <p className="label text-ink-3">Lanes · {profile.reportId}</p>
        <h1 className="mt-4 max-w-[20ch] text-h1 font-medium text-ink">Your lanes, ranked against yourself.</h1>
        <p className="mt-4 max-w-reading text-body-l text-ink-2">
          A high rank means a lane uses more of your stronger traits than your weaker ones. It is a starting point for
          trying things, not a prediction of success. Select a lane to see why it ranks where it does.
        </p>
        <div className="mt-12">
          <Suspense fallback={<Skeleton lines={8} />}>
            <LaneMap lanes={lanes} sprints={sprints} />
          </Suspense>
        </div>
      </div>
    </AppPage>
  );
}
