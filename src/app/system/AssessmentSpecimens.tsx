"use client";

import { useState, type ReactNode } from "react";
import { LikertItem } from "@/components/assess/items/LikertItem";
import { ChoiceItem } from "@/components/assess/items/ChoiceItem";
import { MultiItem } from "@/components/assess/items/MultiItem";
import { TextItem } from "@/components/assess/items/TextItem";
import { SliderItem } from "@/components/assess/items/SliderItem";
import { QSortBoard } from "@/components/assess/items/QSortBoard";
import { IdeaList } from "@/components/assess/items/IdeaList";
import { EnvCheck } from "@/components/assess/items/EnvCheck";
import { MatrixTask } from "@/components/assess/tasks/MatrixTask";
import { SeriesTask, QuantTask } from "@/components/assess/tasks/ChoiceTasks";
import { RotationTask } from "@/components/assess/tasks/RotationTask";
import { SpanTask } from "@/components/assess/tasks/SpanTask";
import { SymbolMatchTask, ChoiceRtTask } from "@/components/assess/tasks/SpeedTasks";
import { LearningTask } from "@/components/assess/tasks/LearningTask";
import { BalloonTask } from "@/components/assess/tasks/BalloonTask";
import { DiscountTask } from "@/components/assess/tasks/DiscountTask";
import type { PublicStep, PublicTrial } from "@/lib/bank/public";
import type { CognitiveTaskId } from "@/lib/bank/types";

type ItemStep = Extract<PublicStep, { kind: "item" }>;
const noop = async () => null;

function Frame({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="rounded-sm border border-rule p-6">
      <p className="mb-4 label text-ink-3">{name}</p>
      {children}
    </div>
  );
}

/** One live specimen per response format, using real bank items passed from the server. */
export function ItemSpecimens({ items, env }: { items: Record<string, ItemStep["item"]>; env: string[] }) {
  const [likert, setLikert] = useState<number | undefined>(4);
  const pick = (k: string) => items[k]!;
  const f = (k: string) => pick(k).format;
  const like = f("likert5");
  const l7 = f("likert7");
  const sjt = f("sjt");
  const single = f("single");
  const multi = f("multi");
  const sort = f("qsort");
  const idea = f("ideas");
  const num = f("number");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {like.type === "likert5" ? (
        <Frame name="likert5 · LikertItem">
          <LikertItem text={pick("likert5").text} options={like.options} value={likert} onPreview={setLikert} onAnswer={setLikert} onSkip={() => setLikert(undefined)} />
        </Frame>
      ) : null}
      {l7.type === "likert7" ? (
        <Frame name="likert7 · unlabeled points">
          <LikertItem text={pick("likert7").text} options={l7.options} value={undefined} onPreview={() => {}} onAnswer={() => {}} />
        </Frame>
      ) : null}
      {sjt.type === "sjt" ? (
        <Frame name="SJT · ChoiceItem">
          <ChoiceItem text={pick("sjt").text} question={sjt.question} options={sjt.options} value={undefined} onAnswer={() => {}} />
        </Frame>
      ) : null}
      {single.type === "single" ? (
        <Frame name="single · ChoiceItem">
          <ChoiceItem text={pick("single").text} options={single.options} value={undefined} onAnswer={() => {}} />
        </Frame>
      ) : null}
      {multi.type === "multi" ? (
        <Frame name="multi · MultiItem">
          <MultiItem text={pick("multi").text} options={multi.options} max={multi.max} exclusive={multi.exclusive} value={undefined} onAnswer={() => {}} />
        </Frame>
      ) : null}
      <Frame name="text · TextItem">
        <TextItem text={pick("text").text} kind="text" value={undefined} onAnswer={() => {}} onSkip={() => {}} />
      </Frame>
      {num.type === "number" ? (
        <Frame name="number · TextItem">
          <TextItem text={pick("number").text} kind="number" unit={num.unit} value={undefined} onAnswer={() => {}} onSkip={() => {}} />
        </Frame>
      ) : null}
      <Frame name="slider_0_100 · SliderItem (no default)">
        <SliderItem text={pick("slider").text} value={undefined} onAnswer={() => {}} />
      </Frame>
      {sort.type === "forced_q_sort" ? (
        <div className="lg:col-span-2">
          <Frame name="forced_q_sort · QSortBoard">
            <QSortBoard stem={pick("qsort").text} cards={sort.cards} columns={sort.columns} capacities={sort.capacities} onAnswer={() => {}} />
          </Frame>
        </div>
      ) : null}
      {idea.type === "ideas" ? (
        <Frame name="ideas · IdeaList">
          <IdeaList prompt={pick("ideas").text} instructions={idea.instructions} seconds={idea.seconds} onAnswer={() => {}} />
        </Frame>
      ) : null}
      <Frame name="Environment check">
        <EnvCheck questions={env} onAnswer={() => {}} />
      </Frame>
    </div>
  );
}

/** One live specimen per cognitive task type (fixed demo seeds; responses go nowhere). */
export function TaskSpecimens({ trials }: { trials: Record<CognitiveTaskId, PublicTrial> }) {
  const order: CognitiveTaskId[] = ["matrix", "number_series", "letter_series", "quant", "rotation2d", "backward_digits", "corsi", "symbol_match", "choice_rt", "learning_rate", "balloon", "delay_discount"];
  return (
    <div className="flex flex-col gap-6">
      {order.map((id) => {
        const t = trials[id];
        const untimed = "timeLimitSec" in t ? ({ ...t, timeLimitSec: 0 } as PublicTrial) : t;
        return (
          <Frame key={id} name={id}>
            <TaskSpecimen trial={untimed} />
          </Frame>
        );
      })}
    </div>
  );
}

function TaskSpecimen({ trial }: { trial: PublicTrial }) {
  switch (trial.task) {
    case "matrix":
      return <MatrixTask trial={trial} respond={noop} />;
    case "number_series":
    case "letter_series":
      return <SeriesTask trial={trial} respond={noop} />;
    case "quant":
      return <QuantTask trial={trial} respond={noop} />;
    case "rotation2d":
      return <RotationTask trial={trial} respond={noop} />;
    case "backward_digits":
    case "corsi":
      return <SpanTask trial={trial} respond={noop} />;
    case "symbol_match":
      return <SymbolMatchTask trial={{ ...trial, durationSec: 0 }} respond={noop} />;
    case "choice_rt":
      return <ChoiceRtTask trial={{ ...trial, trials: trial.trials.slice(0, 5) }} respond={noop} />;
    case "learning_rate":
      return <LearningTask trial={trial} respond={noop} />;
    case "balloon":
      return <BalloonTask trial={trial} respond={noop} />;
    case "delay_discount":
      return <DiscountTask trial={trial} respond={noop} />;
  }
}
