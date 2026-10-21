import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Kbd, Rule, Skeleton, Tag } from "@/components/ui/Misc";
import { Accordion } from "@/components/ui/Accordion";
import { DataLabel } from "@/components/data/DataLabel";
import { ScoreBar } from "@/components/data/ScoreBar";
import { ConfidenceBadge } from "@/components/data/ConfidenceBadge";
import { PayoffGlyph } from "@/components/data/PayoffGlyph";
import { PayoffCurve } from "@/components/data/PayoffCurve";
import { RadarProfile } from "@/components/data/RadarProfile";
import { ScaleTable } from "@/components/results/ScaleTable";
import { NormedBar, NormedFigure } from "@/components/results/NormedBar";
import { RelativeTag } from "@/components/results/RelativeTag";
import { ReasoningProfile } from "@/components/results/ReasoningProfile";
import { ItemSpecimens, TaskSpecimens } from "./AssessmentSpecimens";
import { LIMITATIONS, radarDims } from "@/lib/view/profile";
import { sessionPlan, environmentQuestions } from "@/lib/bank/bank";
import { specimenTrials } from "@/lib/assess/tasks";
import type { PublicStep } from "@/lib/bank/public";
import { SegmentedProgress } from "@/components/data/SegmentedProgress";
import { SectionHeader } from "@/components/report/SectionHeader";
import { LimitationsBox } from "@/components/report/LimitationsBox";
import { EmptyState } from "@/components/report/EmptyState";
import { LaneRow } from "@/components/lanes/LaneRow";
import { SprintCard } from "@/components/sprints/SprintCard";
import { EvidenceTimeline, TimelineLegend } from "@/components/evidence/EvidenceTimeline";
import { ConvictionChart } from "@/components/evidence/ConvictionChart";
import { ProgressBar } from "@/components/assess/ProgressBar";
import { Wordmark } from "@/components/shell/Wordmark";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { SystemDemos } from "./SystemDemos";
import { rankLanes } from "@/lib/lanes/payoff";
import { getSampleEvidence as getEvidence, getSampleLanes as getLanes, getSampleProfile as getProfile, getSampleSprints as getSprints } from "@/lib/data/sample";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const colors = [
  { token: "--bg", use: "Page" },
  { token: "--surface", use: "Cards, panels" },
  { token: "--ink", use: "Primary text" },
  { token: "--ink-2", use: "Secondary text" },
  { token: "--ink-3", use: "Labels, metadata" },
  { token: "--ink-4", use: "Graphics only" },
  { token: "--rule", use: "Hairlines" },
  { token: "--rule-strong", use: "Table heads" },
  { token: "--accent", use: "Action, current state" },
  { token: "--accent-wash", use: "Rare accent bg" },
  { token: "--positive", use: "Improvement" },
  { token: "--caution", use: "Low confidence" },
];

const type = [
  { cls: "text-display font-medium", name: "Display", spec: "64/68 · −0.03em" },
  { cls: "text-h1 font-medium", name: "H1", spec: "44/50" },
  { cls: "text-h2 font-medium", name: "H2", spec: "30/36" },
  { cls: "text-h3 font-medium", name: "H3", spec: "22/28" },
  { cls: "text-body-l", name: "Body-L", spec: "18/28" },
  { cls: "text-body", name: "Body", spec: "16/24" },
  { cls: "text-small", name: "Small", spec: "14/20" },
  { cls: "label", name: "Label", spec: "12/16 mono · +0.06em" },
];

const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

function Block({ index, label, title, children }: { index: string; label: string; title: string; children: ReactNode }) {
  return (
    <section className="py-12">
      <SectionHeader index={index} label={label} title={title} />
      {children}
    </section>
  );
}

function Specimen({ name, children, className }: { name: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 label text-ink-3">{name}</p>
      {children}
    </div>
  );
}

export default async function SystemPage() {
  const [lanes, profile, sprints, evidence] = await Promise.all([getLanes(), getProfile(), getSprints(), getEvidence()]);
  const ranked = rankLanes(lanes, "fit");
  const laneNames = Object.fromEntries(lanes.map((l) => [l.id, l.name]));
  const active = sprints.find((s) => s.status === "active")!;
  const allItems = (["S1", "S2", "S5"] as const).flatMap((id) => sessionPlan(id).blocks.flatMap((b) => b.items));
  const find = (pred: (f: string) => boolean) => allItems.find((i) => pred(i.format.type) && !i.validity)!;
  const asPublic = (i: (typeof allItems)[number]): Extract<PublicStep, { kind: "item" }>["item"] => ({ token: "specimen", text: i.text, format: i.format });
  const specimenItems = Object.fromEntries(
    (["likert5", "likert7", "sjt", "single", "multi", "text", "number", "slider_0_100", "forced_q_sort", "ideas"] as const).map((t) => [
      t === "slider_0_100" ? "slider" : t === "forced_q_sort" ? "qsort" : t,
      asPublic(find((f) => f === t)),
    ]),
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-rule bg-bg">
        <div className="page flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Wordmark />
            <span className="label text-ink-3">Design system · v0.1</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="page pb-32">
        <div className="pt-16 pb-8">
          <p className="label text-ink-3">Specimen</p>
          <h1 className="mt-4 text-h1 font-medium text-ink">Lane design system</h1>
          <p className="mt-4 max-w-reading text-body-l text-ink-2">
            Structure over decoration. Every color, size and component used in the product, on one page. Toggle the theme
            to check both modes.
          </p>
        </div>

        <Block index="01" label="Foundations" title="Color">
          <ul className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
            {colors.map((c) => (
              <li key={c.token} className="bg-bg p-3">
                <div className="h-12 rounded-xs border border-rule" style={{ background: `var(${c.token})` }} />
                <p className="mt-2 font-mono text-label text-ink">{c.token}</p>
                <p className="text-small text-ink-3">{c.use}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block index="02" label="Foundations" title="Type">
          <ul className="border-t border-rule">
            {type.map((t) => (
              <li key={t.name} className="grid items-baseline gap-2 border-b border-rule py-4 md:grid-cols-[160px_1fr]">
                <span className="font-mono text-label text-ink-3">
                  {t.name} · {t.spec}
                </span>
                <span className={`${t.cls} text-ink`}>Evidence, not horoscopes</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-small text-ink-2">0123456789 · 78 /100 ±6 · P84 · 00:24</p>
        </Block>

        <Block index="03" label="Foundations" title="Spacing, radius, rules">
          <div className="grid gap-12 md:grid-cols-2">
            <ul className="flex flex-col gap-2">
              {spacing.map((s) => (
                <li key={s} className="grid grid-cols-[48px_1fr] items-center gap-4">
                  <span className="font-mono text-label text-ink-3">{s}</span>
                  <span className="h-2 bg-ink" style={{ width: s }} />
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-6">
              <div className="flex gap-6">
                <Specimen name="2px · inputs">
                  <div className="size-16 rounded-xs border border-rule-strong bg-surface" />
                </Specimen>
                <Specimen name="4px · cards">
                  <div className="size-16 rounded-sm border border-rule-strong bg-surface" />
                </Specimen>
              </div>
              <Specimen name="Rule / strong">
                <Rule />
                <Rule strong className="mt-4" />
              </Specimen>
              <Specimen name="Focus ring">
                <span className="inline-flex h-10 items-center rounded-xs border border-rule px-4 text-small outline-2 outline-offset-2 outline-accent">
                  2px accent, 2px offset
                </span>
              </Specimen>
            </div>
          </div>
        </Block>

        <Block index="04" label="Primitives" title="Controls">
          <div className="grid gap-12 md:grid-cols-2">
            <Specimen name="Button">
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button mono>Mono label</Button>
                <Button disabled>Disabled</Button>
                <ButtonLink href="/system" size="sm" variant="secondary">
                  Small link
                </ButtonLink>
              </div>
            </Specimen>
            <Specimen name="Tag · Kbd">
              <div className="flex flex-wrap items-center gap-3">
                <Tag>Corporate</Tag>
                <Tag className="border-caution/50 text-caution">Provisional</Tag>
                <Kbd>1</Kbd>
                <Kbd>↵</Kbd>
              </div>
            </Specimen>
            <div className="flex flex-col gap-6">
              <Field label="Text input" htmlFor="s-in" hint="Hint text in ink-3.">
                <Input id="s-in" placeholder="Placeholder" />
              </Field>
              <Field label="Select" htmlFor="s-sel">
                <Select id="s-sel" defaultValue="25–34">
                  <option>18–24</option>
                  <option>25–34</option>
                </Select>
              </Field>
            </div>
            <SystemDemos />
          </div>
        </Block>

        <Block index="05" label="Data" title="Measurements">
          <div className="grid gap-12 md:grid-cols-2">
            <Specimen name="DataLabel">
              <div className="flex flex-col gap-2">
                <DataLabel label="Openness" value={78} unit="/100" pm={6} />
                <DataLabel label="Energy avg" value="5.3" unit="/7" />
                <DataLabel label="Relative fit" value={84} unit="/100" pm={7} layout="stacked" className="mt-4" />
              </div>
            </Specimen>
            <Specimen name="ScoreBar · CI band · median tick">
              <div className="flex flex-col gap-4">
                <ScoreBar score={{ value: 74, ci: [68, 80], median: 50 }} label="Example" />
                <ScoreBar score={{ value: 84, ci: [77, 90] }} label="Example emphasis" emphasis showMedian={false} />
                <ScoreBar score={{ value: 58, ci: [44, 72], median: 50 }} label="Example muted" tone="muted" />
              </div>
            </Specimen>
            <Specimen name="ConfidenceBadge">
              <div className="flex gap-6">
                <ConfidenceBadge level="high" />
                <ConfidenceBadge level="med" />
                <ConfidenceBadge level="low" />
              </div>
            </Specimen>
            <Specimen name="PayoffGlyph · linear / convex / winner-take-all">
              <div className="flex gap-8">
                <PayoffGlyph type="linear" position={0.6} />
                <PayoffGlyph type="convex" position={0.6} />
                <PayoffGlyph type="winner-take-all" position={0.6} emphasis />
              </div>
            </Specimen>
            <Specimen name="SegmentedProgress">
              <SegmentedProgress total={14} done={5} current={6} label="Example progress" />
            </Specimen>
            <Specimen name="ProgressBar (assessment)">
              <ProgressBar value={34} max={120} label="Example" />
            </Specimen>
            <Specimen name="PayoffCurve">
              <div className="rounded-sm border border-rule bg-surface p-3">
                <PayoffCurve type="convex" position={0.68} positionCi={[0.55, 0.79]} />
              </div>
            </Specimen>
            <Specimen name="RadarProfile">
              {profile.interests ? <RadarProfile dimensions={radarDims(profile.interests)} showCi={false} /> : null}
            </Specimen>
          </div>
          <Specimen name="NormedBar · NormedFigure · RelativeTag" className="mt-12">
            {profile.personality ? (
              <div className="flex max-w-reading flex-col gap-3">
                <NormedFigure n={profile.personality.domains[1]!.normed!} />
                <NormedBar n={profile.personality.domains[1]!.normed!} label="Example" />
                <div className="flex gap-2">
                  <RelativeTag r="strength" />
                  <RelativeTag r="weakness" />
                  <RelativeTag r="none" showNone />
                </div>
              </div>
            ) : null}
          </Specimen>
          <Specimen name="ScaleTable (domains, open a row for facets)" className="mt-12">
            {profile.personality ? <ScaleTable domains={profile.personality.domains} facets={profile.personality.facets} extra={profile.personality.honestyHumility} /> : null}
          </Specimen>
          <Specimen name="ReasoningProfile" className="mt-12">
            {profile.reasoning ? <ReasoningProfile reasoning={profile.reasoning} /> : null}
          </Specimen>
          <Specimen name="LineChart · ConvictionChart" className="mt-12">
            <ConvictionChart series={evidence.conviction} laneNames={laneNames} />
          </Specimen>
        </Block>

        <Block index="06" label="Composite" title="Domain components">
          <Specimen name="LaneRow">
            <ol className="border-t border-rule-strong">
              {ranked.slice(0, 3).map((l, i) => (
                <li key={l.id} className="border-b border-rule">
                  <LaneRow lane={l} emphasis={i === 0} />
                </li>
              ))}
            </ol>
          </Specimen>
          <div className="mt-12 grid gap-12 lg:grid-cols-2">
            <Specimen name="SprintCard">
              <SprintCard sprint={active} laneName={lanes.find((l) => l.id === active.laneId)?.name ?? active.laneId} />
            </Specimen>
            <Specimen name="EvidenceTimeline">
              <TimelineLegend />
              <div className="mt-4">
                <EvidenceTimeline events={evidence.events.slice(-5)} laneNames={laneNames} />
              </div>
            </Specimen>
          </div>
        </Block>

        <Block index="07" label="Assessment" title="Response formats (real bank items)">
          <ItemSpecimens items={specimenItems} env={environmentQuestions} />
        </Block>

        <Block index="08" label="Assessment" title="Cognitive and behavioural tasks (demo seeds)">
          <TaskSpecimens trials={specimenTrials()} />
        </Block>

        <Block index="09" label="Report" title="Structure and states">
          <div className="grid gap-12 lg:grid-cols-2">
            <LimitationsBox title="A profile is a starting hypothesis." items={LIMITATIONS.slice(0, 3)} />
            <div className="flex flex-col gap-10">
              <EmptyState label="Empty state" title="No sprint running." body="Pick one of the suggestions below." action={<Button size="sm">Choose a lane</Button>} />
              <Specimen name="Skeleton · hairline shimmer">
                <Skeleton lines={4} />
              </Specimen>
            </div>
          </div>
          <div className="mt-12 max-w-[840px]">
            <Accordion
              items={[
                { q: "Accordion item", a: "Hairline separated, plus/minus in mono." },
                { q: "Does this use my DNA?", a: "No." },
              ]}
            />
          </div>
        </Block>
      </main>
    </>
  );
}
