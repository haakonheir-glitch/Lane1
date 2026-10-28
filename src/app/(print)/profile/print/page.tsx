import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReportDocument } from "@/components/report/doc/ReportDocument";
import { PrintSheet } from "@/components/report/doc/PrintSheet";
import { PrintToolbar } from "@/components/report/doc/PrintToolbar";
import { getEffort, getMyReport, getProfileView, getSampleUser, getTopCareerPaths, getUser, getWorkBest } from "@/lib/data";
import { reportTier } from "@/lib/tier";

export const metadata: Metadata = { title: "Profile report · PDF", robots: { index: false } };

export default async function ProfilePrintPage() {
  if (reportTier() !== "full") redirect("/profile");
  const [{ profile, source }, me, sample, written, picks, effort, workBest] = await Promise.all([getProfileView(), getUser(), getSampleUser(), getMyReport(), getTopCareerPaths(), getEffort(), getWorkBest()]);
  const own = source === "own";
  const person = own ? me : sample;
  return (
    <>
      <PrintToolbar back="/profile" />
      <PrintSheet name={person.name} reportId={person.reportId}>
        <ReportDocument profile={profile} person={person} picks={picks} workBest={workBest} effort={effort} written={written} own={own && !!written} tier="full" mode="print" />
      </PrintSheet>
    </>
  );
}
