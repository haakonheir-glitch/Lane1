import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { SectionHeader } from "@/components/report/SectionHeader";
import { LaneRow } from "@/components/lanes/LaneRow";
import { RadarProfile } from "@/components/data/RadarProfile";
import { ScaleTable } from "@/components/results/ScaleTable";
import { radarDims } from "@/lib/view/profile";
import { pad2 } from "@/lib/format";
import { sortMatches } from "@/lib/matching/fit";
import { getSampleLaneMap, getSampleProfile as getProfile, getTaxonomyIndex } from "@/lib/data/sample";

const problems = [
  {
    title: "Credentials sort people, not fit.",
    body: "School, university and hiring filter on grades and degrees. Almost nothing in that chain asks what you would be best at or most engaged by.",
  },
  {
    title: "Most people never try the alternatives.",
    body: "Switching costs years, so people commit early and stay. The career paths they never tried remain a permanent “what if”.",
  },
  {
    title: "Doubt fills the gap.",
    body: "Without evidence, every path looks greener from the outside. People pursue their work without conviction, or keep switching without learning.",
  },
];

const method = [
  { n: "01", title: "Profile", body: "Interests, personality, reasoning games and work values, combined into one coherent profile with intervals." },
  { n: "02", title: "Career map", body: "205 career paths in fit bands against your own strengths, with how each career path actually pays and where you'd realistically start." },
  { n: "03", title: "Sprints", body: "One-to-three-week real trials of your top career paths. You log performance, improvement and how the work felt." },
  { n: "04", title: "Evidence", body: "A running record of everything you tried. Conviction builds, or drops, on data rather than on hope." },
];

const faq = [
  {
    q: "Does this use my DNA?",
    a: "No, and it never will. Genetic tests cannot tell you which job suits you; the science does not support it, and anyone claiming otherwise is selling certainty that does not exist. Lane uses what you report, how you perform on short tasks, and what happens when you actually try the work.",
  },
  {
    q: "Is this just another personality test?",
    a: "The core is a set of validated public instruments: the IPIP-NEO-120 personality inventory, the O*NET® Interest Profiler and Work Importance Locator, plus reasoning tasks generated fresh for every person. Lane adds its own experimental questions for career paths those instruments miss; they are collected but not used in your results until a pilot validates them. Even so, a test predicts job outcomes only modestly. The point of Lane is the second half: short real-world sprints that produce evidence a questionnaire cannot.",
  },
  {
    q: "How long does it take?",
    a: "About 135 minutes in total, split into five sessions of 20–30 minutes, because answers get careless after half an hour. You get part of your profile after each one. A sprint asks for roughly 30–60 minutes a day for one to two weeks.",
  },
  {
    q: "What does “fit relative to me” mean?",
    a: "Your Career map compares career paths against your own strongest and weakest traits, not against other people. A strong-fit career path is one of your best options among your own options. It is not a claim that you would beat anyone else at it.",
  },
  {
    q: "Why bands instead of a ranking?",
    a: "With 205 career paths, number 5 and number 25 are often the same within measurement error, so a ranking would claim precision the test doesn't have. A career path is a strong fit only when it's clearly ahead of most of your other career paths; the many that can't be told apart are worth testing. Sprint evidence settles what a questionnaire can't.",
  },
  {
    q: "What happens to my data?",
    a: "It is yours. You can export everything as a file or delete your account at any time. We do not sell data, and we never share anything that identifies you.",
  },
];

export default async function LandingPage() {
  const [{ rows }, profile, index] = await Promise.all([getSampleLaneMap(), getProfile(), getTaxonomyIndex()]);
  // One strong-fit lane from each of three different families, so the excerpt shows range.
  const excerpt = sortMatches(rows.map((r) => ({ match: r, name: r.name, row: r })), "fit")
    .map((x) => x.row)
    .filter((r, i, all) => r.band === "strong" && all.findIndex((o) => o.familyId === r.familyId) === i)
    .slice(0, 3);
  const totalIndexed = index.laneCount;

  return (
    <div className="page">
      {/* Hero */}
      <section className="grid-12 gap-y-16 pt-16 pb-24 sm:pt-24 lg:pt-32" aria-labelledby="hero-h">
        <div className="col-span-12 lg:col-span-6">
          <p className="label text-ink-3">Career fit, measured · v0.1</p>
          <h1 id="hero-h" className="mt-8 text-display font-medium text-ink">
            Find the work you&apos;re built for. With evidence.
          </h1>
          <p className="mt-8 max-w-[52ch] text-body-l text-ink-2">
            Tests can narrow the field. Only trying the work can settle it. Lane maps the career paths that fit you, runs short
            real-world trials of the best ones, and keeps the record.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Start your profile</ButtonLink>
            <ButtonLink href="#method" variant="secondary">
              How it works
            </ButtonLink>
          </div>
          <p className="mt-10 font-mono text-label uppercase text-ink-3">
            5 sessions · ~135 min in total · {totalIndexed} career paths mapped · no DNA, ever
          </p>
        </div>

        <figure className="col-span-12 self-end lg:col-span-5 lg:col-start-8">
          <div className="rounded-sm border border-rule bg-surface px-5 pt-4 pb-2">
            <div className="flex items-baseline justify-between border-b border-rule-strong pb-3">
              <span className="label text-ink-3">Career map · strong fits</span>
              <span className="label text-ink-3">Sample</span>
            </div>
            <ul aria-label="Sample strong-fit career paths">
              {excerpt.map((l, i) => (
                <li key={l.id} className={i < excerpt.length - 1 ? "border-b border-rule" : ""}>
                  <LaneRow lane={l} showFamily />
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="mt-3 label text-ink-3">
            Fig. 1 · Excerpt from a sample Career map. Dots show fit against the person&apos;s average career path, with a 90% range.
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
        <SectionHeader index="02" label="Method" title="A loop, not a verdict." id="method-h" />
        <ol className="grid gap-8 md:grid-cols-4 md:gap-0">
          {method.map((m, i) => (
            <li key={m.n} className="relative flex gap-4 md:flex-col md:pr-8">
              <div className="flex shrink-0 items-center md:w-full">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ink font-mono text-small text-ink">
                  {m.n}
                </span>
                {i < method.length - 1 ? <span aria-hidden className="hidden h-px flex-1 bg-rule-strong md:block" /> : null}
                {i === method.length - 1 ? (
                  <span aria-hidden className="ml-3 hidden font-mono text-label text-ink-3 md:inline">
                    ↺ 02
                  </span>
                ) : null}
              </div>
              <div className="md:mt-6">
                <h3 className="text-h3 font-medium text-ink">{m.title}</h3>
                <p className="mt-2 text-small text-ink-2">{m.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-reading text-small text-ink-3">
          Sprint evidence flows back into the Career map, so the map you see after three sprints is not the one you
          started with.
        </p>
      </section>

      {/* Why tests alone fail */}
      <section className="py-16" aria-labelledby="why-h">
        <SectionHeader index="03" label="Why tests alone fail" title="A questionnaire can only say so much." id="why-h" />
        <div className="grid-12 gap-y-12">
          <div className="col-span-12 flex flex-col gap-4 text-body-l text-ink-2 lg:col-span-6">
            <p>
              Interest and personality measures are useful. Decades of research show they relate to job performance and
              satisfaction, but the relationships are modest. Most of what decides whether a line of work suits you does
              not show up on a form.
            </p>
            <p>
              It shows up when you do the work: how quickly you improve, whether the hard days still feel worth it, and
              whether you want to come back tomorrow. That is what sprints measure.
            </p>
          </div>
          <figure className="col-span-12 lg:col-span-5 lg:col-start-8">
            <p className="label text-ink-3">What decides fit · illustrative</p>
            <div className="mt-6 flex h-1 w-full" aria-hidden>
              <span className="h-full w-[28%] bg-ink" />
              <span className="h-full w-[30%] bg-accent" />
              <span className="h-full flex-1 bg-rule" />
            </div>
            <ul className="mt-6 flex flex-col gap-4">
              <li className="grid grid-cols-[12px_1fr] items-baseline gap-3">
                <span className="size-2 bg-ink" aria-hidden />
                <span>
                  <span className="block text-body text-ink">What a test can predict</span>
                  <span className="text-small text-ink-3">Interests, personality and reasoning. A real but limited signal.</span>
                </span>
              </li>
              <li className="grid grid-cols-[12px_1fr] items-baseline gap-3">
                <span className="size-2 bg-accent" aria-hidden />
                <span>
                  <span className="block text-body text-ink">What trial data adds</span>
                  <span className="text-small text-ink-3">Rate of improvement, energy and the wish to continue.</span>
                </span>
              </li>
              <li className="grid grid-cols-[12px_1fr] items-baseline gap-3">
                <span className="size-2 border border-ink-4" aria-hidden />
                <span>
                  <span className="block text-body text-ink">What no one can predict</span>
                  <span className="text-small text-ink-3">Luck, timing, the people you meet. We don&apos;t pretend otherwise.</span>
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

      {/* Lane index */}
      <section className="py-16" aria-labelledby="index-h">
        <SectionHeader index="04" label="Career paths we map" title="Every kind of paid work. Not only the corporate kind." id="index-h" aside={`${index.families.length} families · ${totalIndexed} career paths`} />
        <p className="-mt-4 mb-10 max-w-reading text-body text-ink-2">
          Checked against the international occupation classifications (ISCO-08 and ESCO), plus the career paths they miss: creators, founders, esports,
          independent advisers and more.
        </p>
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {index.families.map((f) => (
            <div key={f.id}>
              <h3 className="flex items-baseline justify-between gap-3 border-b border-rule-strong pb-2 label text-ink">
                {f.name}
                <span className="text-ink-3">{pad2(f.lanes.length)}</span>
              </h3>
              <p className="mt-2 text-small text-ink-3">{f.lanes.join(" · ")}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample report */}
      <section id="sample" className="scroll-mt-20 py-16" aria-labelledby="sample-h">
        <SectionHeader index="05" label="Sample report" title="Reads like a lab report. Because it is one." id="sample-h" />
        <div className="relative overflow-hidden rounded-sm border border-rule bg-surface">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-6 py-4">
            <span className="label text-ink-3">Profile report · {profile.scoringVersion}</span>
            <span className="font-mono text-label text-ink-3">SAMPLE · fictional person</span>
          </div>
          <div className="grid gap-10 p-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <p className="label text-ink-3">§ 02 · Interests · O*NET® Interest Profiler</p>
              {profile.interests ? <RadarProfile dimensions={radarDims(profile.interests)} showCi={false} className="mt-4" /> : null}
            </div>
            <div className="lg:col-span-8">
              <p className="mb-4 label text-ink-3">§ 04 · Personality · IPIP-NEO-120 · T with 90% interval</p>
              {profile.personality ? <ScaleTable domains={profile.personality.domains.slice(0, 3)} facets={[]} /> : null}
              <p className="mt-4 label text-ink-3">+ 2 more domains · 29 facets · values · reasoning profile · limitations</p>
            </div>
          </div>
        </div>
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
          <p className="max-w-[24ch] text-h2 font-medium text-ink">Evidence, not horoscopes.</p>
          <ButtonLink href="/signup">Start your profile</ButtonLink>
        </div>
      </section>
    </div>
  );
}
