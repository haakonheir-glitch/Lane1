import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { LikertRunner } from "@/components/assess/LikertRunner";
import { PatternGame } from "@/components/assess/PatternGame";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { getModule, getModules, getPatternItems, getQuestions } from "@/lib/data";

export async function generateStaticParams() {
  return (await getModules()).map((m) => ({ module: m.id }));
}

export async function generateMetadata({ params }: PageProps<"/assess/[module]">): Promise<Metadata> {
  const mod = await getModule((await params).module);
  return { title: mod ? mod.title : "Assessment" };
}

export default async function ModulePage({ params }: PageProps<"/assess/[module]">) {
  const { module: id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  const exit = (
    <ButtonLink href="/assess" variant="ghost" size="sm">
      Save &amp; exit
    </ButtonLink>
  );

  if (mod.id === "cognitive") {
    const items = await getPatternItems();
    return (
      <AppPage title={mod.title} meta={mod.instrument} action={exit} bleed>
        <PatternGame items={items} />
      </AppPage>
    );
  }

  const questions = await getQuestions(mod.id);
  return (
    <AppPage title={mod.title} meta={mod.instrument} action={exit} bleed>
      <Suspense fallback={<Skeleton lines={4} className="page py-16" />}>
        <LikertRunner moduleId={mod.id} title={mod.title} questions={questions} />
      </Suspense>
    </AppPage>
  );
}
