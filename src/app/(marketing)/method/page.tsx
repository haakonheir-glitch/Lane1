import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Method",
  description: "How Lane builds a profile, ranks lanes, runs sprints and weighs evidence, and where the science stops.",
};

const references = [
  { id: 1, text: "Holland, J. L. (1997). Making Vocational Choices: A Theory of Vocational Personalities and Work Environments (3rd ed.). Psychological Assessment Resources." },
  { id: 2, text: "Nye, C. D., Su, R., Rounds, J., & Drasgow, F. (2012). Vocational interests and performance: A quantitative summary of over 60 years of research. Perspectives on Psychological Science, 7(4), 384–403." },
  { id: 3, text: "Costa, P. T., & McCrae, R. R. (1992). Revised NEO Personality Inventory (NEO-PI-R) and NEO Five-Factor Inventory (NEO-FFI) Professional Manual. Psychological Assessment Resources." },
  { id: 4, text: "Barrick, M. R., & Mount, M. K. (1991). The Big Five personality dimensions and job performance: A meta-analysis. Personnel Psychology, 44(1), 1–26." },
  { id: 5, text: "Schmidt, F. L., & Hunter, J. E. (1998). The validity and utility of selection methods in personnel psychology: Practical and theoretical implications of 85 years of research findings. Psychological Bulletin, 124(2), 262–274." },
  { id: 6, text: "Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2022). Revisiting meta-analytic estimates of validity in personnel selection: Addressing systematic overcorrection for restriction of range. Journal of Applied Psychology, 107(11), 2040–2068." },
  { id: 7, text: "Rosen, S. (1981). The economics of superstars. American Economic Review, 71(5), 845–858." },
  { id: 8, text: "Frank, R. H., & Cook, P. J. (1995). The Winner-Take-All Society. Free Press." },
  { id: 9, text: "Ibarra, H. (2003). Working Identity: Unconventional Strategies for Reinventing Your Career. Harvard Business School Press." },
  { id: 10, text: "Csikszentmihalyi, M. (1990). Flow: The Psychology of Optimal Experience. Harper & Row." },
];

function Cite({ n }: { n: number | number[] }) {
  const ids = Array.isArray(n) ? n : [n];
  return (
    <sup className="ml-0.5 font-mono text-[11px]">
      [
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 ? "," : ""}
          <a href={`#ref-${id}`} className="text-ink-2 underline decoration-rule-strong underline-offset-2 hover:text-ink" aria-label={`Reference ${id}`}>
            {id}
          </a>
        </span>
      ))}
      ]
    </sup>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-16 border-t border-ink pt-3" aria-labelledby={`m-${n}`}>
      <p className="label text-ink">§ {n}</p>
      <h2 id={`m-${n}`} className="mt-4 text-h2 font-medium text-ink">
        {title}
      </h2>
      <div className="mt-6 flex flex-col gap-5 text-body-l text-ink-2">{children}</div>
    </section>
  );
}

export default function MethodPage() {
  return (
    <div className="page grid-12 pt-16 sm:pt-24">
      <aside className="col-span-12 mb-12 lg:sticky lg:top-24 lg:col-span-3 lg:mb-0 lg:self-start">
        <p className="label text-ink-3">Contents</p>
        <ol className="mt-4 flex flex-col gap-2 border-t border-rule pt-4">
          {["The question", "The profile", "Relative ranking", "Payoff structure", "Sprints", "Evidence", "What we don't do", "References"].map((t, i) => (
            <li key={t}>
              <a href={i === 7 ? "#references" : `#m-${String(i + 1).padStart(2, "0")}`} className="grid grid-cols-[28px_1fr] text-small text-ink-2 transition-quiet hover:text-ink">
                <span className="font-mono text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <article className="col-span-12 lg:col-span-8 lg:col-start-5">
        <p className="label text-ink-3">Method · Working paper v0.1 · October 2026</p>
        <h1 className="mt-8 text-h1 font-medium text-ink">How Lane works, and where the science stops.</h1>
        <p className="mt-6 max-w-reading text-body-l text-ink-2">
          This page explains each step in plain language, with references. Where the research is uncertain or contested,
          we say so.
        </p>

        <div className="max-w-reading">
          <Section n="01" title="The question">
            <p>
              &ldquo;What am I built for?&rdquo; has no single answer, and no instrument can give one. What we can do is
              narrow the field with good measurement, then let real experience decide between the remaining options. Lane
              treats the profile as a starting hypothesis and every sprint as a test of it.
            </p>
          </Section>

          <Section n="02" title="The profile">
            <p>
              <strong className="font-medium text-ink">Interests</strong> are measured on Holland&apos;s six RIASEC
              dimensions: Realistic, Investigative, Artistic, Social, Enterprising and Conventional.<Cite n={1} /> Interest
              fit relates to both performance and persistence, though the effects are moderate.<Cite n={2} />
            </p>
            <p>
              <strong className="font-medium text-ink">Personality</strong> uses the Big Five model.<Cite n={3} />{" "}
              Conscientiousness is the most consistent personality predictor of job performance across occupations; other
              traits matter for specific kinds of work.<Cite n={4} />
            </p>
            <p>
              <strong className="font-medium text-ink">Reasoning</strong> is sampled with three short timed games.
              Classic estimates put cognitive ability among the strongest single predictors of job performance,
              <Cite n={5} /> but a 2022 re-analysis argued those estimates were inflated by statistical over-correction,
              and that the true figures are lower.<Cite n={6} /> We use the games as one input among several, not as a
              ranking of people.
            </p>
            <p>
              <strong className="font-medium text-ink">Work values</strong> (autonomy, security, income and others) are
              ranked by you. They do not predict ability; they shape which lanes you would want even if you were good at
              them.
            </p>
          </Section>

          <Section n="03" title="Relative ranking">
            <p>
              The Lane Map is <em>ipsative</em>: each lane is scored against your own spread of traits, not against other
              people. If your strongest trait is average by population standards, it is still your strongest trait, and
              the lanes that use it rank highest for you.
            </p>
            <p>
              Every score carries an 80% interval. When two lanes&apos; scores are within 2.5 points, we show them as
              tied rather than pretend to an order the data cannot support.
            </p>
          </Section>

          <Section n="04" title="Payoff structure">
            <p>
              Lanes pay out differently. In <strong className="font-medium text-ink">linear</strong> lanes, a competent
              practitioner earns a decent living. In <strong className="font-medium text-ink">convex</strong> lanes,
              rewards accelerate with skill. In <strong className="font-medium text-ink">winner-take-all</strong> lanes,
              a small top tier captures most of the reward.<Cite n={[7, 8]} />
            </p>
            <p>
              &ldquo;Fit × payoff&rdquo; places you on each curve at a realistic skill level, with an interval, and
              discounts lanes accordingly. This is not a judgement about which lanes are worth pursuing. It is a way to
              see the bet you are making.
            </p>
          </Section>

          <Section n="05" title="Sprints">
            <p>
              People rarely think their way into a new career; they discover it by trying things.<Cite n={9} /> A sprint
              is a structured, one-to-three-week trial with a concrete output, such as calls made, videos published or a
              product shipped.
            </p>
            <p>
              We record four things: performance against others at the same stage of the same sprint; rate of
              improvement; daily energy and flow check-ins<Cite n={10} />; and whether you want to continue. Improvement
              rate and the wish to continue tend to say more than first-week performance, which is mostly noise.
            </p>
          </Section>

          <Section n="06" title="Evidence">
            <p>
              Your Evidence Record combines the profile prior with sprint outcomes into a conviction score for each lane
              you have tried. It moves in both directions. As more people complete sprints, the model also learns from what
              happened to profiles like yours, and it reports how many such profiles that estimate rests on.
            </p>
          </Section>

          <Section n="07" title="What we don't do">
            <ul className="flex flex-col gap-3">
              {[
                "We do not use genetic, DNA, hormonal or brain-chemistry data. The science does not support using it to choose a career, and we would not use it if it did.",
                "We do not promise a single true calling. Most people could do well in several lanes.",
                "We do not hide uncertainty. If a confidence interval is wide, you will see that it is wide.",
                "We do not sell your data.",
              ].map((t, i) => (
                <li key={i} className="grid grid-cols-[32px_1fr]">
                  <span className="font-mono text-small text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>

          <section id="references" className="mt-16 scroll-mt-24 border-t border-ink pt-3" aria-labelledby="refs-h">
            <p className="label text-ink">§ 08</p>
            <h2 id="refs-h" className="mt-4 text-h2 font-medium text-ink">
              References
            </h2>
            <ol className="mt-6 flex flex-col">
              {references.map((r) => (
                <li key={r.id} id={`ref-${r.id}`} className="grid scroll-mt-24 grid-cols-[40px_1fr] border-b border-rule py-3 text-small text-ink-2 target:bg-accent-wash">
                  <span className="font-mono text-ink-3">[{r.id}]</span>
                  <span>{r.text}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-16 flex flex-wrap items-center gap-4">
            <ButtonLink href="/start">Start your profile</ButtonLink>
            <span className="text-small text-ink-3">About 35 minutes, saved as you go.</span>
          </div>
        </div>
      </article>
    </div>
  );
}
