import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { SampleBanner } from "@/components/report/SampleBanner";
import { ReportDocument } from "@/components/report/doc/ReportDocument";
import { ReportRefresher } from "@/components/report/doc/ReportRefresher";
import { PrintButton } from "@/components/report/doc/PrintButton";
import { getEffort, getMyReport, getOutcome, getProfileView, getSampleUser, getTopCareerPaths, getUser, getWorkBest } from "@/lib/data";
import { reportTier } from "@/lib/tier";

export const metadata: Metadata = { title: "Profile report" };

export default async function ProfilePage() {
  const [{ profile, source }, me, sample, written, picks, effort, workBest, outcome] = await Promise.all([getProfileView(), getUser(), getSampleUser(), getMyReport(), getTopCareerPaths(), getEffort(), getWorkBest(), getOutcome()]);
  const own = source === "own";
  const person = own ? me : sample;
  const tier = reportTier();
  const reportConfigured = !!process.env.ANTHROPIC_API_KEY;
  return (
    <AppPage
      title="Profile report"
      meta={own ? person.reportId : `${person.reportId} · sample`}
      action={
        <div className="flex gap-2">
          {own ? (
            <ButtonLink href="/profile/share" variant="secondary" size="sm">
              Share
            </ButtonLink>
          ) : null}
          {tier === "full" ? <PrintButton /> : null}
          <ButtonLink href="/lanes" variant="secondary" size="sm">
            Open Career map
          </ButtonLink>
        </div>
      }
    >
      {own ? null : <SampleBanner className="mb-8" />}
      {own && outcome.due ? (
        <p className="mb-8 border border-accent bg-accent-wash px-4 py-3 text-small text-ink">
          Your {outcome.due === "6m" ? "6-month" : "12-month"} check-in is open: two questions.{" "}
          <a href="/check-in" className="underline underline-offset-4">
            Answer now
          </a>
        </p>
      ) : null}
      <ReportDocument
        profile={profile}
        person={person}
        picks={picks}
        workBest={workBest}
        effort={effort}
        written={written}
        own={own}
        tier={tier}
        reportConfigured={reportConfigured}
        status={written?.stale && reportConfigured ? <ReportRefresher /> : null}
        outcome={{ consentedAt: outcome.consentedAt?.toISOString() ?? null, next: outcome.next?.toISOString() ?? null, due: !!outcome.due }}
      />
    </AppPage>
  );
}
