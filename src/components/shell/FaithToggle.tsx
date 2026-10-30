"use client";

import { useState, useTransition } from "react";
import { setOpenToFaith } from "@/app/actions/preferences";

/** "Open to faith-based work" in Settings: belief-gated career paths are suggested only when it's on. */
export function FaithToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-small text-ink-2">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next);
            start(async () => {
              const r = await setOpenToFaith(next);
              if (r.ok) setStatus("Saved.");
              else {
                setOn(!next);
                setStatus(r.error);
              }
            });
          }}
          className="mt-0.5 size-4 accent-[var(--color-accent)]"
        />
        <span>
          I&apos;m open to faith-based work. Career paths that require a personal faith, such as religious and spiritual work, are suggested only if this is on.
          They are always in the full Career map.
        </span>
      </label>
      <p role="status" className="mt-2 min-h-5 text-small text-ink-3">
        {status}
      </p>
    </div>
  );
}
