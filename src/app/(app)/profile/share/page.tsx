import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { ShareBuilder } from "@/components/report/doc/ShareBuilder";
import { getProfileView } from "@/lib/data";

export const metadata: Metadata = { title: "Share your profile" };

export default async function SharePage() {
  const { source } = await getProfileView();
  if (source !== "own") redirect("/profile");
  return (
    <AppPage
      title="Share your profile"
      action={
        <ButtonLink href="/profile" variant="secondary" size="sm">
          Back to report
        </ButtonLink>
      }
    >
      <div className="max-w-content">
        <h1 className="text-h1 font-medium text-ink">Share your profile</h1>
        <p className="mt-3 max-w-reading text-body-l text-ink-2">An image you can post or send. You choose what goes on it; reasoning and personality results stay off unless you add them.</p>
        <div className="mt-10">
          <ShareBuilder />
        </div>
      </div>
    </AppPage>
  );
}
