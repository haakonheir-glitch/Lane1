import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { SectionHeader } from "@/components/report/SectionHeader";
import { SampleCareerRow } from "@/components/marketing/SampleCareerRow";
import { JobFinder } from "@/components/marketing/JobFinder";
import { RadarProfile } from "@/components/data/RadarProfile";
import { ScaleTable } from "@/components/results/ScaleTable";
import { radarDims } from "@/lib/view/profile";
import { pad2 } from "@/lib/format";
import { sortMatches } from "@/lib/matching/fit";
import { getSampleLaneMap, getSampleProfile as getProfile, getTaxonomyIndex } from "@/lib/data/sample";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const problems = [
  {
    title: "Credentials sort people, not fit.",
    body: "School, university and hiring filter on grades and degrees. Almost nothing in that chain asks what you would be best at or most engaged by.",
  },
  {
    title: "Most people only see a few options.",
    body: "Careers advice covers the jobs people around you already do. Hundreds of kinds of paid work never come up, so they are never considered.",
  },
  {
    title: "Self-tests guess instead of measuring.",
    body: "Most career quizzes are unvalidated and give one confident answer. They don't say how precise the result is, so a lucky guess and a solid finding look the same.",
  },
];

const method = [
  { n: "01", title: "Assessment", body: "Five short sessions: validated questionnaires on interests, personality and work values, and reasoning tasks generated fresh for you." },
  { n: "02", title: "Profile report", body: "Every score with its measurement error, the strengths that clearly stand out, a written summary, and what the results can't tell you." },
  { n: "03", title: "Career map", body: "205 career paths in fit bands against your own strengths, with the day-to-day work, how people get in, how it pays and where you'd realistically start." },
];

const faq = [
  {
    q: "Does this use my DNA?",
    a: "No, and it never will. Genetic tests cannot tell you which job suits you; the science does not support it, and anyone claiming otherwise is selling certainty that does not exist. Lane uses what you report and how you perform on short reasoning tasks.",
  },
  {
    q: "Is this just another personality test?",
    a: "The core is a set of validated public instruments: the IPIP-NEO-120 personality inventory, the O*NET® Interest Profiler and Work Importance Locator, plus reasoning tasks generated fresh for every person. Lane adds its own experimental questions for career paths those instruments miss; they are collected but not used in your results until a pilot validates them. Every score is shown with its measurement error, and a difference is called a strength only when it is larger than that error. Even good tests predict job outcomes only modestly, and the report says so.",
  },
  {
    q: "How long does it take?",
    a: "About 135 minutes in total, split into five sessions of 20–30 minutes, because answers get careless after half an hour. You get part of your profile after each one, and you can stop and come back at any point. Once all five are done, nothing else is asked of you.",
  },
  {
    q: "What do I get at the end?",
    a: "Two things. A profile report: your interests, values, personality and reasoning, each with its measurement error, a short written summary, and the limits of what it can say. And a Career map: all 205 career paths sorted into fit bands, each with the day-to-day work, how people get in, how it pays and the role you could realistically start in.",
  },
  {
    q: "What does “fit relative to me” mean?",
    a: "Your Career map compares career paths against your own strongest and weakest traits, not against other people. A strong-fit career path is one of your best options among your own options. It is not a claim that you would beat anyone else at it.",
  },
  {
    q: "Why bands instead of a ranking?",
    a: "With 205 career paths, number 5 and number 25 are often the same within measurement error, so a ranking would claim precision the test doesn't have. A career path is a strong fit only when it's clearly ahead of most of your other career paths; the many that can't be told apart are shown as possible fits, so you can see where the measurement stops.",
  },
  {
    q: "What happens to my data?",
    a: "It is yours. You can export everything as a file or delete your account at any time. We do not sell data, and we never share anything that identifies you.",
  },
];

export default async function LandingPage() {
  const [{ rows }, profile, index] = await Promise.all([getSampleLaneMap(), getProfile(), getTaxonomyIndex()]);
  // One strong fit, one possible fit and one unlikely, each from a different family, so the
  // excerpt shows what the bands mean.
  const ordered = sortMatches(rows.map((r) => ({ match: r, name: r.name, row: r })), "fit").map((x) => x.row);
  const excerpt: typeof ordered = [];
  for (const band of ["strong", "testing", "unlikely"] as const) {
    const r = ordered.find((x) => x.band === band && !excerpt.some((e) => e.familyId === x.familyId));
    if (r) excerpt.push(r);
  }
  const totalIndexed = index.laneCount;

  return (
    <div className="page">
      {/* Hero */}
      <section className="grid-12 gap-y-16 pt-16 pb-24 sm:pt-24 lg:pt-32" aria-labelledby="hero-h">
        <div className="col-span-12 lg:col-span-6">
          <p className="label text-ink-3">Career fit, measured · v0.1</p>
          <h1 id="hero-h" className="mt-8 text-display font-medium text-ink">
            Find the work you&apos;re built for.
          </h1>
          <p className="mt-8 max-w-[52ch] text-body-l text-ink-2">
            Validated tests of your interests, personality, values and reasoning, matched against {totalIndexed} career paths.
            Measured, not guessed.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Start your profile</ButtonLink>
            <ButtonLink href="#method" variant="secondary">
              How it works
            </ButtonLink>
          </div>
          <p className="mt-4 text-small text-ink-2">Free during the pilot · No card</p>
          <p className="mt-10 font-mono text-label uppercase text-ink-3">
            5 sessions · ~135 min in total · {totalIndexed} career paths mapped · no DNA, ever
          </p>
        </div>

        <figure className="col-span-12 self-end lg:col-span-5 lg:col-start-8">
          <div className="rounded-sm border border-rule bg-surface px-5 pt-4 pb-2">
            <div className="flex items-baseline justify-between border-b border-rule-strong pb-3">
              <span className="label text-ink-3">Career map · one career from each band</span>
              <span className="label text-ink-3">Sample</span>
            </div>
            <ul aria-label="Sample career paths: a strong fit, a possible fit and an unlikely one">
              {excerpt.map((l, i) => (
                <li key={l.id} className={i < excerpt.length - 1 ? "border-b border-rule" : ""}>
                  <SampleCareerRow lane={l} />
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="mt-3 label text-ink-3">
            Fig. 1 · Excerpt from a sample Career map. The dot shows how well each career fits the person, compared with their other careers; the
            bar around it is the 90% range.
          </figcaption>
        </figure>
      </section>

      {/* Problem */}
      <section className="py-16" aria-labelledby="problem-h">
        <SectionHeader index="01" label="The problem" title="Most people end up in their work by accident." id="problem-h" />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
          {problems.map((p, i) => (
            <li key={p.title} className="flex flex-col gap-3">
              <span className="font-mono text-h3 text-ink-3">{pad2(i + 1)}</span>
              <h3 className="text-h3 font-medium text-ink">{p.title}</h3>
              <p className="text-body text-ink-2">{p.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Method */}
      <section id="method" className="scroll-mt-20 py-16" aria-labelledby="method-h">
        <SectionHeader index="02" label="Method" title="A map, not a verdict." id="method-h" />
        <ol className="grid gap-8 md:grid-cols-3 md:gap-0">
          {method.map((m, i) => (
            <li key={m.n} className="relative flex gap-4 md:flex-col md:pr-8">
              <div className="flex shrink-0 items-center md:w-full">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ink font-mono text-small text-ink">
                  {m.n}
                </span>
                {i < method.length - 1 ? <span aria-hidden className="hidden h-px flex-1 bg-rule-strong md:block" /> : null}
              </div>
              <div className="md:mt-6">
                <h3 className="text-h3 font-medium text-ink">{m.title}</h3>
                <p className="mt-2 text-small text-ink-2">{m.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-reading text-small text-ink-3">
          The map shows where your profile fits best and why. It doesn&apos;t tell you what to do; it shows which careers are
          worth looking into first.
        </p>
      </section>

      {/* Sample report */}
      <section id="sample" className="scroll-mt-20 py-16" aria-labelledby="sample-h">
        <SectionHeader index="03" label="Sample report" title="Reads like a lab report. Because it is one." id="sample-h" />
        <div className="relative overflow-hidden rounded-sm border border-rule bg-surface">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-6 py-4">
            <span className="label text-ink-3">Profile report · sample · fictional person</span>
          </div>
          <div className="grid gap-10 p-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <p className="label text-ink-3">§ 02 · Interests · O*NET® Interest Profiler</p>
              {profile.interests ? <RadarProfile dimensions={radarDims(profile.interests)} showCi={false} scale={["10", "30", "50"]} className="mt-4" /> : null}
            </div>
            <div className="lg:col-span-8">
              <p className="mb-4 label text-ink-3">§ 04 · Personality · IPIP-NEO-120 · T with 90% interval</p>
              {profile.personality ? <ScaleTable domains={profile.personality.domains.slice(0, 3)} facets={[]} /> : null}
              <p className="mt-4 label text-ink-3">+ 2 more domains · 29 facets · values · reasoning profile · limitations</p>
            </div>
          </div>
        </div>
      </section>

      {/* What a profile can and can't tell you */}
      <section className="py-16" aria-labelledby="why-h">
        <SectionHeader index="04" label="Limits" title="What a profile can and can&apos;t tell you." id="why-h" />
        <div className="grid-12 gap-y-12">
          <div className="col-span-12 flex flex-col gap-4 text-body-l text-ink-2 lg:col-span-6">
            <p>
              Interest and personality measures are useful. Decades of research show they relate to job performance and
              satisfaction, but the relationships are modest. A profile can show which kinds of work suit how you think and
              what you care about; it can&apos;t say how a particular job, team or year will go.
            </p>
            <p>
              So Lane shows every score with its measurement error, calls a difference a strength only when it is larger than
              that error, and sorts career paths into bands rather than a precise ranking.
            </p>
          </div>
          <figure className="col-span-12 lg:col-span-5 lg:col-start-8">
            <p className="label text-ink-3">What decides fit · illustrative</p>
            <div className="mt-6 flex h-1 w-full" aria-hidden>
              <span className="h-full w-[35%] bg-ink" />
              <span className="h-full flex-1 bg-rule" />
            </div>
            <ul className="mt-6 flex flex-col gap-4">
              <li className="grid grid-cols-[12px_1fr] items-baseline gap-3">
                <span className="size-2 bg-ink" aria-hidden />
                <span>
                  <span className="block text-body text-ink">What a profile can tell you</span>
                  <span className="text-small text-ink-3">Your interests, values, personality and reasoning, and which kinds of work use them. A real but limited signal.</span>
                </span>
              </li>
              <li className="grid grid-cols-[12px_1fr] items-baseline gap-3">
                <span className="size-2 border border-ink-4" aria-hidden />
                <span>
                  <span className="block text-body text-ink">What it can&apos;t</span>
                  <span className="text-small text-ink-3">The specific job and team, effort, luck, timing, the people you meet. We don&apos;t pretend otherwise.</span>
                </span>
              </li>
            </ul>
            <figcaption className="mt-6 text-small text-ink-3">
              Proportions are conceptual, not measured. See the{" "}
              <a href="/method" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
                method
              </a>{" "}
              for the research and its limits.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Career paths */}
      <section className="py-16" aria-labelledby="index-h">
        <SectionHeader index="05" label="Career paths we map" title="Every kind of paid work. Not only the corporate kind." id="index-h" aside={`${index.families.length} families · ${totalIndexed} career paths`} />
        <p className="-mt-4 mb-10 max-w-reading text-body text-ink-2">
          Checked against the international occupation classifications (ISCO-08 and ESCO), plus the career paths they miss: creators, founders, esports,
          independent advisers and more.
        </p>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h3 className="text-h3 font-medium text-ink">Is your job in here?</h3>
            <p className="mt-2 mb-5 text-small text-ink-2">Type any job title, in English or Norwegian. It finds the career path and family it belongs to.</p>
            <JobFinder />
          </div>
          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2" aria-label="Career families">
              {index.families.map((f) => (
                <li key={f.id} className="flex items-baseline justify-between gap-3 bg-bg px-4 py-3">
                  <span className="text-small text-ink">{f.name}</span>
                  <span className="font-mono text-label tabular text-ink-3">{pad2(f.lanes.length)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <details className="group mt-10 border-t border-rule-strong">
          <summary className="flex cursor-pointer list-none items-center gap-3 py-4 text-body text-ink [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="font-mono text-small text-ink-3 transition-quiet group-open:rotate-90">›</span>
            See all {totalIndexed} career paths
          </summary>
          <div className="grid gap-x-8 gap-y-8 pt-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">
            {index.families.map((f) => (
              <div key={f.id}>
                <h4 className="flex items-baseline justify-between gap-3 border-b border-rule-strong pb-2 label text-ink">
                  {f.name}
                  <span className="text-ink-3">{pad2(f.lanes.length)}</span>
                </h4>
                <p className="mt-2 text-small text-ink-3">{f.lanes.join(" · ")}</p>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* FAQ */}
      <section className="py-16" aria-labelledby="faq-h">
        <SectionHeader index="06" label="Questions" title="Asked often." id="faq-h" />
        <div className="max-w-[840px]">
          <Accordion items={faq} />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-ink pt-12" aria-label="Start">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="max-w-[24ch] text-h2 font-medium text-ink">Evidence, not horoscopes.</p>
            <p className="mt-3 max-w-[52ch] text-small text-ink-2">
              Validated instruments, every score shown with its measurement error, and no claim the data can&apos;t support.
            </p>
          </div>
          <ButtonLink href="/signup">Start your profile</ButtonLink>
        </div>
      </section>
    </div>
  );
}
