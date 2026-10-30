import type { Metadata } from "next";
import { Suspense } from "react";
import { Onboarding } from "@/components/assess/Onboarding";
import { Wordmark } from "@/components/shell/Wordmark";
import { Skeleton } from "@/components/ui/Misc";
import { getExperience, getLaneName, getOnboarding, getUser } from "@/lib/data";

export const metadata: Metadata = { title: "Start your profile" };

export default async function StartPage() {
  const [user, onboarding, exp] = await Promise.all([getUser(), getOnboarding(), getExperience()]);
  const withLane = <T extends { laneId: string }>(x: T) => ({ ...x, laneName: getLaneName(x.laneId) });
  return (
    <>
      <header className="page flex h-14 items-center justify-between border-b border-rule">
        <Wordmark />
        <span className="label text-ink-3">{user.name}</span>
      </header>
      <main id="main">
        <Suspense fallback={<Skeleton lines={3} className="page py-24" />}>
          <Onboarding
            name={user.name.split(" ")[0] ?? user.name}
            initial={{
              ageRange: onboarding.ageRange,
              situation: onboarding.situation,
              clarityGoal: onboarding.clarityGoal,
              current: exp.current ? withLane(exp.current) : null,
              years: exp.current?.years ?? null,
              // A returning person who saved onboarding without a job has answered this step.
              currentAnswered: !!exp.current || onboarding.done,
              considering: exp.considering.map(withLane),
              satisfaction: exp.current?.satisfaction ?? null,
              previous: (exp.previous ?? []).map(withLane),
              openToFaith: !!exp.openToFaith,
            }}
          />
        </Suspense>
      </main>
    </>
  );
}
