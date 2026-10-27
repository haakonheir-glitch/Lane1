"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Checkbox } from "@/components/ui/Checkbox";

/** Interactive primitive specimens for the /system page. */
export function SystemDemos() {
  const [view, setView] = useState<"family" | "band">("family");
  const [checked, setChecked] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 label text-ink-3">SegmentedControl</p>
        <SegmentedControl
          label="Example"
          value={view}
          onChange={setView}
          options={[
            { value: "family", label: "Family" },
            { value: "band", label: "Fit band" },
          ]}
        />
      </div>
      <label className="flex items-center gap-3 text-small text-ink">
        <Checkbox checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)} />
        Checkbox
      </label>
    </div>
  );
}
