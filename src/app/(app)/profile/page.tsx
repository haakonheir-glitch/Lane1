import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { SampleBanner } from "@/components/report/SampleBanner";
import { ReportDocument } from "@/components/report/doc/ReportDocument";
import { ReportRefresher } from "@/components/report/doc/ReportRefresher";
import { PrintButton } from "@/components/report/doc/PrintButton";
import { getEffort, getMyReport, getProfileView, getSampleUser, getTopCareerPaths, getUser } from "@/lib/data";
import { reportTier } from "@/lib/tier";

export const metadata: Metadata = { title: "Profile report" };

export default async function ProfilePage() {
  const [{ profile, source }, me, sample, written, picks, effort] = await Promise.all([getProfileView(), getUser(), getSampleUser(), getMyReport(), getTopCareerPaths(), getEffort()]);
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
      <ReportDocument
        profile={profile}
        person={person}
        picks={picks}
        effort={effort}
        written={written}
        own={own}
        tier={tier}
        reportConfigured={reportConfigured}
        status={written?.stale && reportConfigured ? <ReportRefresher /> : null}
      />
    </AppPage>
  );
}
