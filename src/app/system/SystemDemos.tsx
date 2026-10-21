"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Checkbox } from "@/components/ui/Checkbox";
import { CheckInScale } from "@/components/sprints/CheckInScale";

/** Interactive primitive specimens for the /system page. */
export function SystemDemos() {
  const [sort, setSort] = useState<"fit" | "fit-payoff">("fit");
  const [checked, setChecked] = useState(true);
  const [energy, setEnergy] = useState<number | null>(5);

  return (
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
  );
}
