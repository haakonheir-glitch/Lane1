import type { Metadata } from "next";
import { OnetDbAttribution } from "@/components/report/OnetDbAttribution";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Method",
  description: `How ${BRAND.name} builds a profile from validated instruments, matches it to 205 career paths, and where the science stops.`,
  alternates: { canonical: "/method" },
};

const references = [
  { id: 1, text: "Holland, J. L. (1997). Making Vocational Choices: A Theory of Vocational Personalities and Work Environments (3rd ed.). Psychological Assessment Resources." },
  { id: 2, text: "Nye, C. D., Su, R., Rounds, J., & Drasgow, F. (2012). Vocational interests and performance: A quantitative summary of over 60 years of research. Perspectives on Psychological Science, 7(4), 384–403." },
  { id: 3, text: "Costa, P. T., & McCrae, R. R. (1992). Revised NEO Personality Inventory (NEO-PI-R) and NEO Five-Factor Inventory (NEO-FFI) Professional Manual. Psychological Assessment Resources." },
  { id: 4, text: "Barrick, M. R., & Mount, M. K. (1991). The Big Five personality dimensions and job performance: A meta-analysis. Personnel Psychology, 44(1), 1–26." },
  { id: 5, text: "Schmidt, F. L., & Hunter, J. E. (1998). The validity and utility of selection methods in personnel psychology: Practical and theoretical implications of 85 years of research findings. Psychological Bulletin, 124(2), 262–274." },
  { id: 6, text: "Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2022). Revisiting meta-analytic estimates of validity in personnel selection: Addressing systematic overcorrection for restriction of range. Journal of Applied Psychology, 107(11), 2040–2068." },
  { id: 7, text: "Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. Journal of Research in Personality, 51, 78–89." },
  { id: 8, text: "Sibley, C. G., et al. (2011). The Mini-IPIP6: Validation and extension of a short measure of the Big-Six factors of personality in New Zealand. New Zealand Journal of Psychology, 40, 142–159." },
  { id: 9, text: "National Center for O*NET Development. O*NET® Interest Profiler Short Form; O*NET® Work Importance Locator. U.S. Department of Labor, Employment and Training Administration. https://www.onetcenter.org" },
  { id: 10, text: "Hoff, K. A., Song, Q. C., Wee, C. J. M., Phan, W. M. J., & Rounds, J. (2020). Interest fit and job satisfaction: A systematic review and meta-analysis. Journal of Vocational Behavior, 123, 103503." },
  { id: 11, text: "Condon, D. M., & Revelle, W. (2014). The International Cognitive Ability Resource: Development and initial validation of a public-domain measure. Intelligence, 43, 52–64." },
  { id: 12, text: "Lejuez, C. W., et al. (2002). Evaluation of a behavioral measure of risk taking: The Balloon Analogue Risk Task (BART). Journal of Experimental Psychology: Applied, 8, 75–84." },
  { id: 13, text: "Blais, A.-R., & Weber, E. U. (2006). A Domain-Specific Risk-Taking (DOSPERT) scale for adult populations. Judgment and Decision Making, 1, 33–47." },
  { id: 14, text: "Huang, J. L., Curran, P. G., Keeney, J., Poposki, E. M., & DeShon, R. P. (2012). Detecting and deterring insufficient effort responding to surveys. Journal of Business and Psychology, 27, 99–114." },
  { id: 15, text: "Curran, P. G. (2016). Methods for the detection of carelessly invalid responses in survey data. Journal of Experimental Social Psychology, 66, 4–19." },
  { id: 16, text: "Connelly, B. S., & Ones, D. S. (2010). An other perspective on personality: Meta-analytic integration of observers' accuracy and predictive validity. Psychological Bulletin, 136, 1092–1122." },
  { id: 17, text: "Credé, M., Tynan, M. C., & Harms, P. D. (2017). Much ado about grit: A meta-analytic synthesis of the grit literature. Journal of Personality and Social Psychology, 113, 492–511." },
  { id: 18, text: "MacCann, C., & Roberts, R. D. (2008). New paradigms for assessing emotional intelligence: Theory and data. Emotion, 8, 540–551." },
  { id: 19, text: "Beaty, R. E., & Johnson, D. R. (2021). Automating creativity assessment with SemDis: An open platform for computing semantic distance. Behavior Research Methods, 53, 757–780." },
  { id: 20, text: "National Center for O*NET Development. O*NET 31.0 Database (Work Values from O*NET 30.2). U.S. Department of Labor, Employment and Training Administration. Used under CC BY 4.0. https://www.onetcenter.org/database.html" },
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
          {[
            ["01", "The question", "#m-01"],
            ["02", "The profile", "#m-02"],
            ["02b", "Norms and intervals", "#norms"],
            ["03", "Career paths and fit bands", "#m-03"],
            ["03b", "How you work best", "#m-03b"],
            ["04", "What you get", "#m-04"],
            ["05", "What we don't do", "#m-05"],
            ["06", "References", "#references"],
          ].map(([n, t, href]) => (
            <li key={t}>
              <a href={href} className="grid grid-cols-[36px_1fr] text-small text-ink-2 transition-quiet hover:text-ink">
                <span className="font-mono text-ink-3">{n}</span>
                {t}
              </a>
            </li>
          ))}
        </ol>
      </aside>

      <article className="col-span-12 lg:col-span-8 lg:col-start-5">
        <p className="label text-ink-3">Method · Working paper v0.1 · October 2026</p>
        <h1 className="mt-8 text-h1 font-medium text-ink">How {BRAND.name} works, and where the science stops.</h1>
        <p className="mt-6 max-w-reading text-body-l text-ink-2">
          This page explains each step in plain language, with references. Where the research is uncertain or contested,
          we say so.
        </p>

        <div className="max-w-reading">
          <Section n="01" title="The question">
            <p>
              &ldquo;What am I built for?&rdquo; has no single answer, and no instrument can give one. What we can do is
              measure the things that research links to career fit, with validated instruments and honest error bars, and show
              which career paths match the results. {BRAND.name} gives you that information; the decision stays yours.
            </p>
          </Section>

          <Section n="02" title="The profile">
            <p>
              Five sessions of 20–30 minutes, about 135 minutes in total. Data quality drops after roughly half an hour of
              questionnaires, so splitting is a measurement decision, not just a convenience. Each instrument earns its
              place by measuring something the others miss.
            </p>
            <p>
              <strong className="font-medium text-ink">Personality</strong> uses the IPIP-NEO-120, the public-domain counterpart
              of the most researched facet-level inventory: five domains and 30 facets.<Cite n={[3, 7]} /> One facet
              (political attitudes) is not used: it is irrelevant to work and inappropriate for anything selection-adjacent. A
              sixth factor, Honesty-Humility, comes from the Mini-IPIP6.<Cite n={8} /> Facets have four items each, so they
              are shown with wide intervals and never used on their own.<Cite n={7} />
            </p>
            <p>
              <strong className="font-medium text-ink">Interests and values</strong> use the O*NET® Interest Profiler (60 work
              activities, Holland&apos;s RIASEC model) and the O*NET® Work Importance Locator, a 20-card sort that stops
              everything being rated &ldquo;very important&rdquo;.<Cite n={[1, 9]} /> Interest fit predicts satisfaction modestly
              and career-path satisfaction and performance more strongly.<Cite n={[2, 10]} />
            </p>
            <p>
              <strong className="font-medium text-ink">Reasoning</strong> uses item types from decades of ability research
              (matrices, number and letter series, word problems, rotation, memory span, processing speed), the same types as the
              open ICAR battery.<Cite n={11} /> Every item is generated fresh from a seed, so nobody can look up answers and no
              commercial test is reproduced. Classic estimates put cognitive ability among the strongest predictors of job
              performance;<Cite n={5} /> a 2022 re-analysis argued those estimates were inflated and the true figures are lower.
              <Cite n={6} /> There is no IQ number: results are a percentile range and a profile of relative strengths.
            </p>
            <p>
              <strong className="font-medium text-ink">Behaviour tasks</strong> measure what you do rather than what you say:
              how fast you learn a new mapping, how you take risks in the balloon task,<Cite n={12} /> and how you trade money
              now against money later. Risk is domain-specific, so no single &ldquo;risk tolerance&rdquo; number is claimed.
              <Cite n={13} />
            </p>
            <p>
              <strong className="font-medium text-ink">Data quality</strong> is checked in every session: a few
              absurd or instructed statements, answer speed, long runs of identical answers, and consistency between opposite
              statements.<Cite n={[14, 15]} /> Two or more flags mark a session &ldquo;low confidence&rdquo;; you see why and can
              retake it. Nothing is discarded silently.
            </p>
            <p>
              <strong className="font-medium text-ink">{BRAND.name}&apos;s own scales</strong> cover what the standard instruments
              miss for non-corporate career paths: extra interests and values, ten work dispositions (such as variance tolerance and
              setback resilience), an emotion-judgement test,<Cite n={18} /> idea tasks<Cite n={19} /> and life history. They are
              experimental. Your answers are collected for the pilot, but these scales are not shown as results until they meet a
              reliability bar and add something beyond the established scales.<Cite n={17} />
            </p>
          </Section>

          <section id="norms" className="mt-16 scroll-mt-24 border-t border-ink pt-3" aria-labelledby="norms-h">
            <p className="label text-ink">§ 02b</p>
            <h2 id="norms-h" className="mt-4 text-h2 font-medium text-ink">
              Norms, intervals and the sample results
            </h2>
            <div className="mt-6 flex flex-col gap-5 text-body-l text-ink-2">
              <p>
                A score means something only against a population. Until {BRAND.name} has its own norm sample (1,000+ people per age
                band), results are compared with the published norms of each instrument and labelled &ldquo;provisional&rdquo;.
                Those tables are being transcribed from the original sources. Until they are in, your answers are saved and
                scored, and the results pages show a clearly labelled sample for a fictional person instead of numbers we
                can&apos;t yet stand behind.
              </p>
              <p>
                Every score is shown with a 90% interval, worked out from the scale&apos;s reliability. &ldquo;Relative to
                yourself&rdquo; is computed on normed scores, never on raw answers, and a gap between two of your own scores is
                called a relative strength only when it is larger than the measurement error of that difference. Otherwise the
                page says there is no clear difference.
              </p>
            </div>
          </section>

          <Section n="03" title="Career paths and fit bands">
            <p>
              {BRAND.name} maps 205 career paths in 34 families, with 1,883 roles, checked against the international occupation classifications (ISCO-08 and the
              EU&apos;s ESCO) so that nothing people are paid to do is missing, plus the career paths those lists miss, such as creators and founders.
            </p>
            <p>
              Fit follows person–environment fit research, which has two parts. <strong className="font-medium text-ink">Fulfilment fit</strong> (needs–supplies:
              does the work give you what you need) is the headline: your interests against each career&apos;s O*NET interest profile, your work values against its
              work values, your value modes against the kinds of work it involves, your working-condition needs against its work context, whether it challenges
              your reasoning enough, and whether it leans on the reasoning areas that are your own strongest (a small part, up to about 8%). <strong className="font-medium text-ink">Ability fit</strong> (demands–abilities: can you meet what it demands) is secondary:
              your reasoning range against the abilities the work asks for. Every career path is described with empirical O*NET occupational data, not
              invented descriptions; a few career paths with no matching occupation have profiles estimated from similar ones, and are marked as estimated.
            </p>
            <p>
              Fit is relative to you: 50 is your average career path, so it says which careers suit you best, never how you compare with someone else. Each
              career&apos;s general advantage (some careers suit almost everyone on paper) is removed, so a career counts only for fitting <em>you</em> better
              than it fits people in general. No single personality facet may carry more than 15% of any fit. {BRAND.name}&apos;s experimental scales don&apos;t
              count until a pilot validates them.
            </p>
            <p>
              We show bands, not ranks. With 205 career paths, number 5 and number 25 are often the same within measurement error, so your scores are redrawn
              500 times within their error and every career path is rescored each time. A career path is a{" "}
              <strong className="font-medium text-ink">strong fit</strong> when it lands in your top 10% in at least half of the draws, and{" "}
              <strong className="font-medium text-ink">unlikely</strong> when it lands in your bottom 40% in at least 70% of them; the rest are{" "}
              <strong className="font-medium text-ink">possible fits</strong> that the measurement can&apos;t separate. All the weights and thresholds are
              provisional, set before any outcome data, and will be refitted once people tell us how their careers turned out.
            </p>
            <p>
              We match you to career paths first, then to the specific role inside each one where you could realistically start, never at manager level. A questionnaire can tell sales from software, but not who will make a better head of sales: seniority is a path you grow along, not a result of a test.
            </p>
          </Section>

          <Section n="03b" title="How you work best">
            <p>
              Your scores are combined into nine <strong className="font-medium text-ink">value modes</strong> (the kind of value you create: influence, analyse,
              build, organise, care, teach, create, lead, protect) and eight <strong className="font-medium text-ink">working conditions</strong> (autonomy, social
              contact, pace, conflict, competition, precision, variety, challenge), each a weighted combination of measured scales, each with its 90% range.
              Modes built from largely the same scales are shown together rather than contrasted.
            </p>
            <p>
              Your blend of modes is shown as a blend of nine archetypes, such as Hunter or Scout. They are a metaphor for a measured pattern, not a type, an
              identity or a claim about where anyone comes from. When two archetypes can&apos;t be separated within measurement error, the report says you sit
              between them. What drains you is computed, not written: the working conditions where a mismatch costs you most.
            </p>
            <p>
              Your best workday is written by Claude from these structured results only. Every sentence must name the dimensions it rests on, and a check
              rejects any sentence without a source, with a figure or name that isn&apos;t in your results, or with a claim about the brain, biology or success.
            </p>
          </Section>

          <Section n="04" title="What you get">
            <p>
              <strong className="font-medium text-ink">A profile report.</strong> It opens with the answer: how you work best, and where that work exists, with
              fulfilment fit and ability fit for your closest career paths. Then the evidence: every score with its 90% interval, the relative strengths and
              weaknesses that pass a reliability test, a short written summary, and the limits of what the measures can say about you.
            </p>
            <p>
              <strong className="font-medium text-ink">A Career map.</strong> All 205 career paths on fulfilment fit and ability fit, or as lists by family and fit
              band. Each opens to a typical day from O*NET work activities and work context, why it fits, where it rubs, how you compare with it on value modes
              and working conditions, how people get in and the role you could realistically start in. It is a way to decide which careers to look into first,
              not a plan you have to follow.
            </p>
            <p>
              <strong className="font-medium text-ink">An optional check-in.</strong> If you opt in, we ask two questions 6 and 12 months later: what you&apos;re
              doing now, and how satisfied you are with it (the same question as at the end of the assessment). The answers are used to check and refit the matching.
            </p>
          </Section>

          <Section n="05" title="What we don't do">
            <ul className="flex flex-col gap-3">
              {[
                "We do not use genetic, DNA, hormonal or brain-chemistry data. The science does not support using it to choose a career, and we would not use it if it did.",
                "We do not promise a single true calling. Most people could do well in several career paths.",
                "We do not coach you into a career or set you tasks. The report and the map are information; what you do with them is up to you.",
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
            <p className="label text-ink">§ 06</p>
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

          <OnetDbAttribution className="mt-16" />

          <div className="mt-16 flex flex-wrap items-center gap-4">
            <ButtonLink href="/signup">Start your profile</ButtonLink>
            <span className="text-small text-ink-3">About 30 minutes, saved as you go.</span>
          </div>
        </div>
      </article>
    </div>
  );
}
