import type { Metadata } from "next";
import { Suspense } from "react";
import { Onboarding } from "@/components/assess/Onboarding";
import { Wordmark } from "@/components/shell/Wordmark";
import { Skeleton } from "@/components/ui/Misc";
import { getOnboarding, getUser } from "@/lib/data";

export const metadata: Metadata = { title: "Start your profile" };

export default async function StartPage() {
  const [user, onboarding] = await Promise.all([getUser(), getOnboarding()]);
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
            initial={{ ageRange: onboarding.ageRange, situation: onboarding.situation, clarityGoal: onboarding.clarityGoal }}
          />
        </Suspense>
      </main>
    </>
  );
}
