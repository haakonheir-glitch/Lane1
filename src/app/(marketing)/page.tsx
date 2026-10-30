import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { SectionHeader } from "@/components/report/SectionHeader";
import { JobFinder } from "@/components/marketing/JobFinder";
import { Scaled } from "@/components/marketing/Scaled";
import { Directions } from "@/components/lanes/Directions";
import { groupDirections } from "@/lib/lanes/types";
import { Cover } from "@/components/report/doc/Cover";
import { SummarySheet } from "@/components/report/doc/SummarySheet";
import { Chapter } from "@/components/report/doc/Chapter";
import { InterestPanel } from "@/components/results/InterestPanel";
import { ProfileMark } from "@/components/brand/ProfileMark";
import { formatIsoDot, pad2 } from "@/lib/format";
import { getTaxonomyIndex } from "@/lib/data/sample";
import { getSampleReport } from "@/lib/data/sample-report";
import { effortLine } from "@/lib/data/effort";
import { summarise } from "@/lib/view/profile";
import { chapterTitles } from "@/lib/view/chapters";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const method = [
  { n: "01", title: "Assessment", body: "Five short sessions: validated questionnaires on interests, personality and work values, and reasoning tasks generated fresh for you." },
  { n: "02", title: "Profile report", body: "Every score with its measurement error, what clearly stands out, a written summary, and what the results can't tell you." },
  { n: "03", title: "Career map", body: "205 career paths in fit bands against your own strengths, with the day-to-day work, how people get in and where you'd start." },
];

const faq = [
  {
    q: "Does this use my DNA?",
    a: `No, and it never will. Genetic tests cannot tell you which job suits you; the science does not support it, and anyone claiming otherwise is selling certainty that does not exist. ${BRAND.name} uses what you report and how you perform on short reasoning tasks.`,
  },
  {
    q: "Is this just another personality test?",
    a: `The core is a set of validated public instruments: the IPIP-NEO-120 personality inventory, the O*NET® Interest Profiler and Work Importance Locator, plus reasoning tasks generated fresh for every person. ${BRAND.name} adds its own experimental questions for career paths those instruments miss; they are collected but not used in your results until a pilot validates them. Every score is shown with its measurement error, and a difference is called a strength only when it is larger than that error. Even good tests predict job outcomes only modestly, and the report says so.`,
  },
  {
    q: "How long does it take?",
    a: "About 135 minutes in total, split into five sessions of 20–30 minutes, because answers get careless after half an hour. You get part of your profile after each one, and you can stop and come back at any point. Once all five are done, nothing else is asked of you.",
  },
  {
    q: "What do I get at the end?",
    a: "Two things. A profile report: your interests, values, personality and reasoning, each with its measurement error, a short written summary, and the limits of what it can say. And a Career map: all 205 career paths sorted into fit bands, each with the day-to-day work, how people get in and the role you could realistically start in.",
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
  const [{ profile, picks, person, effort }, index] = await Promise.all([getSampleReport(), getTaxonomyIndex()]);
  const last = profile.sessions.filter((s) => s.completedAt).map((s) => s.completedAt!).sort().pop();
  const date = last ? formatIsoDot(last) : "—";
  const brief = summarise(profile).filter((_, i, all) => all.length <= 3 || i !== 1);
  const cover = <Cover profile={profile} name={person.name} reportId={person.reportId} date={date} effort={effortLine(effort)} status=" · Sample" />;
  const summary = <SummarySheet profile={profile} name={person.name} reportId={person.reportId} paths={picks} brief={brief} />;
  const totalIndexed = index.laneCount;

  return (
    <div className="page">
      {/* Hero: the product, then the argument */}
      <section className="grid-12 items-center gap-y-16 pt-16 pb-24 sm:pt-20 lg:pt-24" aria-labelledby="hero-h">
        <div className="col-span-12 lg:col-span-5">
          <h1 id="hero-h" className="text-display font-medium text-ink">
            Find the work you&apos;re built for.
          </h1>
          <p className="mt-8 max-w-[44ch] text-body-l text-ink-2">
            Validated tests of your interests, personality, values and reasoning, matched against {totalIndexed} career paths. Measured, not guessed.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Start your profile</ButtonLink>
            <ButtonLink href="/sample" variant="secondary">
              See a sample report
            </ButtonLink>
          </div>
          <p className="mt-4 text-small text-ink-2">Free during the pilot · No card</p>
          <p className="mt-10 font-mono text-small text-ink-3 tabular">{effortLine(effort)}</p>
        </div>
        <figure className="col-span-12 lg:col-span-7 lg:col-start-6">
          <div className="relative mx-auto h-[540px] w-full max-w-[640px]">
            <Scaled width={980} height={1180} scale={0.4} label="A sample report's summary sheet" className="absolute top-0 right-0 h-[440px]! border border-paper-edge bg-paper">
              {summary}
            </Scaled>
            <Scaled width={980} height={574} scale={0.48} label={`A sample report's cover for ${person.name}, with the Profile Mark`} className="absolute bottom-0 left-0 border border-paper-edge bg-paper">
              {cover}
            </Scaled>
          </div>
          <figcaption className="mt-4 text-small text-ink-3">A sample report&apos;s cover and summary sheet, for a fictional person.</figcaption>
        </figure>
      </section>

      {/* What you get */}
      <section className="py-16" aria-labelledby="get-h">
        <SectionHeader index="01" label="What you get" title="A report you keep, and a map of where you fit." id="get-h" />
        <ul className="grid gap-10 md:grid-cols-3">
          {[
            { title: "The cover", body: "Your name, your report ID and your Profile Mark: every line of it is one of your scores.", node: cover, h: 640 },
            { title: "The summary sheet", body: "Your headline results and the directions your strongest fits point in, on one page you can print.", node: summary, h: 1180 },
            {
              title: "The Career map",
              body: "All 205 career paths in fit bands, each with the role you could realistically start in.",
              node: (
                <div className="flex flex-col gap-3 bg-bg p-6">
                  <Directions directions={groupDirections(picks).slice(0, 2)} linked={false} note={false} />
                </div>
              ),
              h: 1180,
            },
          ].map((o) => (
            <li key={o.title} className="flex flex-col">
              <Scaled width={980} height={o.h} scale={0.3} label={`Sample ${o.title.toLowerCase()}`} className="h-[294px]! w-full! border border-paper-edge bg-paper">
                {o.node}
              </Scaled>
              <h3 className="mt-5 text-h3 font-medium text-ink">{o.title}</h3>
              <p className="mt-2 text-body text-ink-2">{o.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Method */}
      <section id="method" className="scroll-mt-20 py-16" aria-labelledby="method-h">
        <SectionHeader index="02" label="Method" title="A map, not a verdict." id="method-h" />
        <ol className="grid gap-8 md:grid-cols-3 md:gap-0">
          {method.map((m, i) => (
            <li key={m.n} className="relative flex gap-4 md:flex-col md:pr-8">
              <div className="flex shrink-0 items-center md:w-full">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ink font-mono text-small text-ink">{m.n}</span>
                {i < method.length - 1 ? <span aria-hidden className="hidden h-px flex-1 bg-rule-strong md:block" /> : null}
              </div>
              <div className="md:mt-6">
                <h3 className="text-h3 font-medium text-ink">{m.title}</h3>
                <p className="mt-2 text-small text-ink-2">{m.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Sample report preview */}
      <section id="sample" className="scroll-mt-20 py-16" aria-labelledby="sample-h">
        <SectionHeader index="03" label="Sample report" title="Reads like a well-made document. Because it is one." id="sample-h" />
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="border border-paper-edge">
            <Chapter id="sample-interests" n="01" kicker="Interests · O*NET® Interest Profiler" title={chapterTitles(profile).interests}>
              {profile.interests ? <InterestPanel interests={profile.interests} /> : null}
            </Chapter>
          </div>
          <div>
            <p className="text-body-l text-ink-2">
              Every chapter leads with what is clearly true, shows the measurement with its range, and keeps every caveat in one place at the end.
            </p>
            <div className="mt-6">
              <ButtonLink href="/sample">Read the full sample report</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Limits */}
      <section className="py-16" aria-labelledby="why-h">
        <SectionHeader index="04" label="Limits" title="What a profile can and can&apos;t tell you." id="why-h" />
        <div className="grid-12 gap-y-10">
          <p className="col-span-12 text-body-l text-ink-2 lg:col-span-6">
            It shows which kinds of work suit how you think and what you care about, measured with validated instruments and shown with its error. It
            can&apos;t say how a particular job, team or year will go, and it doesn&apos;t predict success.
          </p>
          <figure className="col-span-12 lg:col-span-5 lg:col-start-8">
            <div className="flex h-1 w-full" aria-hidden>
              <span className="h-full w-[35%] bg-ink" />
              <span className="h-full flex-1 bg-rule" />
            </div>
            <ul className="mt-5 flex flex-col gap-3">
              <li className="grid grid-cols-[12px_1fr] items-baseline gap-3 text-body text-ink">
                <span className="size-2 bg-ink" aria-hidden />A profile: interests, values, personality, reasoning
              </li>
              <li className="grid grid-cols-[12px_1fr] items-baseline gap-3 text-body text-ink">
                <span className="size-2 border border-ink-4" aria-hidden />
                The rest: the specific job, effort, luck, timing
              </li>
            </ul>
            <figcaption className="mt-4 text-small text-ink-3">
              Proportions are conceptual, not measured.{" "}
              <Link href="/method" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
                The method and its limits
              </Link>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Career paths */}
      <section className="py-16" aria-labelledby="index-h">
        <SectionHeader index="05" label="Career paths" title="Is your job in here?" id="index-h" aside={`${index.families.length} families · ${totalIndexed} career paths`} />
        <p className="-mt-4 mb-10 max-w-reading text-body text-ink-2">
          Checked against the international occupation classifications (ISCO-08 and ESCO), plus the career paths they miss: creators, founders, esports,
          independent advisers and more.
        </p>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="mb-5 text-small text-ink-2">Type any job title, in English or Norwegian. It finds the career path and family it belongs to.</p>
            <JobFinder />
          </div>
          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2" aria-label="Career families">
              {index.families.map((f) => (
                <li key={f.id} className="flex items-baseline justify-between gap-3 bg-paper px-4 py-3">
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
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-8">
            <ProfileMark input={{ riasec: [null, null, null, null, null, null], domains: [null, null, null, null, null], reasoning: null, topValue: null }} size={96} decorative className="hidden shrink-0 sm:block" />
            <div>
              <p className="max-w-[24ch] text-h2 font-medium text-ink">{BRAND.tagline}</p>
              <p className="mt-3 max-w-[52ch] text-small text-ink-2">Measured, not guessed: validated instruments, every score with its measurement error, and no claim the data can&apos;t support.</p>
            </div>
          </div>
          <ButtonLink href="/signup">Start your profile</ButtonLink>
        </div>
      </section>
    </div>
  );
}
