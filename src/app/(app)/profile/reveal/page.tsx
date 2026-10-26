import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { Cover } from "@/components/report/doc/Cover";
import { SummarySheet } from "@/components/report/doc/SummarySheet";
import { EffortLine } from "@/components/report/doc/EffortLine";
import { RevealFlow } from "@/components/report/doc/RevealFlow";
import { getAssessmentHub, getEffort, getMyReport, getProfileView, getTopCareerPaths, getUser } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { formatIsoDot } from "@/lib/format";
import { summarise } from "@/lib/view/profile";
import { REVEALED_COOKIE } from "@/lib/reveal";

export const metadata: Metadata = { title: "Your report" };

/** The report's delivery after S5. Plays once per device; later visits go straight to the report. */
export default async function RevealPage({ searchParams }: PageProps<"/profile/reveal">) {
  const u = await requireUser();
  const { replay } = await searchParams;
  const [hub, jar] = await Promise.all([getAssessmentHub(), cookies()]);
  if (hub.some((s) => s.status !== "completed")) redirect("/assess");
  if (jar.get(REVEALED_COOKIE)?.value === u.id && replay !== "1") redirect("/profile");
  const [{ profile }, me, picks, effort, written] = await Promise.all([getProfileView(), getUser(), getTopCareerPaths(), getEffort(), getMyReport()]);
  const lastSession = profile.sessions.filter((s) => s.completedAt).map((s) => s.completedAt!).sort().pop();
  const brief = summarise(profile).filter((_, i, all) => all.length <= 3 || i !== 1);
  return (
    <AppPage title="Your report" meta={me.reportId}>
      <div className="mx-auto max-w-[1040px]">
        <RevealFlow
          hasReasoning={!!profile.reasoning}
          writtenConsent={!!written}
          configured={!!process.env.ANTHROPIC_API_KEY}
          cover={<Cover profile={profile} name={me.name} reportId={me.reportId} date={lastSession ? formatIsoDot(lastSession) : "—"} effort={<EffortLine effort={effort} countUp />} reveal />}
          summary={<SummarySheet profile={profile} name={me.name} reportId={me.reportId} paths={picks} brief={brief} />}
        />
      </div>
    </AppPage>
  );
}
