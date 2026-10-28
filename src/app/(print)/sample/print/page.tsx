import type { Metadata } from "next";
import { ReportDocument } from "@/components/report/doc/ReportDocument";
import { PrintSheet } from "@/components/report/doc/PrintSheet";
import { PrintToolbar } from "@/components/report/doc/PrintToolbar";
import { getSampleReport } from "@/lib/data/sample-report";

export const metadata: Metadata = { title: "Sample report · PDF", robots: { index: false } };

export default async function SamplePrintPage() {
  const { profile, picks, workBest, person, effort } = await getSampleReport();
  return (
    <>
      <PrintToolbar back="/sample" />
      <PrintSheet name={`${person.name} (sample)`} reportId={person.reportId}>
        <ReportDocument profile={profile} person={person} picks={picks} workBest={workBest} effort={effort} written={null} own={false} tier="full" mode="print" />
      </PrintSheet>
    </>
  );
}
