"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Checkbox } from "@/components/ui/Checkbox";
import { CheckInScale } from "@/components/sprints/CheckInScale";
import { QuestionCard } from "@/components/assess/QuestionCard";
import { scaleAnchors } from "@/lib/copy";

/** Interactive specimens for the /system page. */
export function SystemDemos() {
  const [sort, setSort] = useState<"fit" | "fit-payoff">("fit");
  const [checked, setChecked] = useState(true);
  const [energy, setEnergy] = useState<number | null>(5);
  const [answer, setAnswer] = useState<number | undefined>(4);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-3 label text-ink-3">SegmentedControl</p>
          <SegmentedControl
            label="Example"
            value={sort}
            onChange={setSort}
            options={[
              { value: "fit", label: "Relative fit" },
              { value: "fit-payoff", label: "Fit × payoff" },
            ]}
          />
        </div>
        <label className="flex items-center gap-3 text-small text-ink">
          <Checkbox checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)} />
          Checkbox
        </label>
        <div>
          <p className="mb-3 label text-ink-3">CheckInScale</p>
          <CheckInScale label="Energy" value={energy} onChange={setEnergy} anchors={["Drained", "Energised"]} />
        </div>
      </div>
      <div className="md:col-span-2">
        <p className="mb-3 label text-ink-3">QuestionCard</p>
        <div className="max-w-reading rounded-sm border border-rule p-6">
          <QuestionCard
            index={34}
            total={120}
            prompt="I start conversations with people I don't know"
            instruction="How accurately does this describe you?"
            anchors={scaleAnchors.agree}
            value={answer}
            onSelect={setAnswer}
          />
        </div>
      </div>
    </>
  );
}
