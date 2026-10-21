import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { SessionRunner } from "@/components/assess/SessionRunner";
import { OnetAttribution } from "@/components/report/OnetAttribution";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { requireUser } from "@/lib/auth";
import { getSessionMeta } from "@/lib/data";
import type { SessionId } from "@/lib/bank/types";

export async function generateMetadata({ params }: PageProps<"/assess/[session]">): Promise<Metadata> {
  const meta = await getSessionMeta((await params).session);
  return { title: meta ? `${meta.id} · ${meta.title}` : "Assessment" };
}

export default async function SessionPage({ params }: PageProps<"/assess/[session]">) {
  await requireUser();
  const { session } = await params;
  const meta = await getSessionMeta(session);
  if (!meta) notFound();
  const showsOnet = meta.blocks.some((b) => b.module === "03_interests_onet_ip_short_form" || b.module === "05_values_onet_work_importance");

  return (
    <AppPage
      title={`${meta.id} · ${meta.title}`}
      meta={`~${meta.minutes} min`}
      action={
        <ButtonLink href="/assess" variant="ghost" size="sm">
          Save &amp; exit
        </ButtonLink>
      }
      bleed
    >
      <Suspense fallback={<Skeleton lines={4} className="page py-16" />}>
        <SessionRunner sessionId={meta.id as SessionId} title={meta.title} />
      </Suspense>
      {showsOnet ? (
        <div className="page pb-24">
          <OnetAttribution />
        </div>
      ) : null}
    </AppPage>
  );
}
