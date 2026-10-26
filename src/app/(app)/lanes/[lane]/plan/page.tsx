import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppPage } from "@/components/shell/AppPage";
import { ButtonLink } from "@/components/ui/Button";
import { getLanePlan } from "@/lib/data";
import { pad2 } from "@/lib/format";
import { sprintLabel } from "@/lib/lanes/labels";

export async function generateMetadata({ params }: PageProps<"/lanes/[lane]/plan">): Promise<Metadata> {
  const p = await getLanePlan((await params).lane);
  return { title: p ? p.plan.title : "Plan" };
}

/** Next step for a lane, by sprint feasibility: a real sprint, practice tasks, or interviews and shadowing. */
export default async function LanePlanPage({ params }: PageProps<"/lanes/[lane]/plan">) {
  const p = await getLanePlan((await params).lane);
  if (!p) notFound();
  const { lane, plan } = p;
  return (
    <AppPage
      title={sprintLabel[lane.sprint]}
      meta={`${lane.name} · sample plan`}
      action={
        <ButtonLink href={`/lanes?lane=${lane.id}`} variant="secondary" size="sm">
          Back to lane
        </ButtonLink>
      }
    >
      <article className="max-w-reading">
        <p className="label text-ink-3">
          {lane.familyName} · {sprintLabel[lane.sprint]} · {plan.duration}
        </p>
        <h1 className="mt-4 text-h1 font-medium text-ink">{plan.title.charAt(0).toUpperCase() + plan.title.slice(1)}</h1>
        <p className="mt-4 text-body-l text-ink-2">{plan.intro}</p>
        <ol className="mt-10 flex flex-col border-t border-rule">
          {plan.steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[32px_1fr] gap-2 border-b border-rule py-4">
              <span className="pt-0.5 font-mono text-small text-ink-3">{pad2(i + 1)}</span>
              <span>
                <span className="block text-body text-ink">{s.title}</span>
                <span className="mt-1 block text-small text-ink-2">{s.detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <section className="mt-10" aria-labelledby="measure-h">
          <h2 id="measure-h" className="label text-ink-3">
            What to record
          </h2>
          <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-small text-ink-2">
            {plan.measure.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
        <p className="mt-10 text-small text-ink-3">
          {plan.kind === "sprint"
            ? "Starting and logging sprints from a plan isn't connected yet; for now this is the plan to follow."
            : plan.kind === "practice"
              ? "This career path can't be tried for real in a short sprint, so these are practice tasks instead."
              : "This is licensed or safety-critical work, so Lane offers interviews and shadowing instead of a sprint."}
        </p>
      </article>
    </AppPage>
  );
}
