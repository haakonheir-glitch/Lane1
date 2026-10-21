import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { LikertRunner } from "@/components/assess/LikertRunner";
import { CognitiveRunner } from "@/components/assess/CognitiveRunner";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { getCognitive, getModuleTitle, getQuestions } from "@/lib/data";
import { likertModules, type LikertModuleId } from "@/lib/assessment/items";

const INSTRUMENT: Record<string, string> = { interests: "RIASEC · 36 items", personality: "Big Five · 40 items", values: "8 values · 16 items", cognitive: "3 timed tasks" };

export async function generateMetadata({ params }: PageProps<"/assess/[module]">): Promise<Metadata> {
  return { title: (await getModuleTitle((await params).module)) ?? "Assessment" };
}

export default async function ModulePage({ params }: PageProps<"/assess/[module]">) {
  const { module: id } = await params;
  const title = await getModuleTitle(id);
  if (!title) notFound();

  const exit = (
    <ButtonLink href="/assess" variant="ghost" size="sm">
      Save &amp; exit
    </ButtonLink>
  );

  if (id === "cognitive") {
    const games = await getCognitive();
    return (
      <AppPage title={title} meta={INSTRUMENT[id]} action={exit} bleed>
        <CognitiveRunner games={games} />
      </AppPage>
    );
  }

  if (!(id in likertModules)) notFound();
  const { questions, answers } = await getQuestions(id as LikertModuleId);
  return (
    <AppPage title={title} meta={INSTRUMENT[id]} action={exit} bleed>
      <Suspense fallback={<Skeleton lines={4} className="page py-16" />}>
        <LikertRunner moduleId={id} title={title} questions={questions} initialAnswers={answers} />
      </Suspense>
    </AppPage>
  );
}
