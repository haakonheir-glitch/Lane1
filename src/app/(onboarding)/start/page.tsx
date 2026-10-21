import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Onboarding } from "@/components/assess/Onboarding";
import { Wordmark } from "@/components/shell/Wordmark";
import { Skeleton } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Start your profile" };

export default function StartPage() {
  return (
    <>
      <header className="page flex h-14 items-center justify-between border-b border-rule">
        <Wordmark />
        <Link href="/" className="label text-ink-3 transition-quiet hover:text-ink">
          Exit
        </Link>
      </header>
      <main id="main">
        <Suspense fallback={<Skeleton lines={3} className="page py-24" />}>
          <Onboarding />
        </Suspense>
      </main>
    </>
  );
}
