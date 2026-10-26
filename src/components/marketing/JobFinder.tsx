"use client";

import { useState } from "react";
import type { JobTitleHit } from "@/lib/taxonomy";
import { JobTitleSearch } from "@/components/onboarding/JobTitleSearch";

/** "Is your job in here?": the onboarding job-title search, answering with its career path and family. */
export function JobFinder() {
  const [hit, setHit] = useState<JobTitleHit | null>(null);
  return (
    <div>
      <JobTitleSearch
        label="Search for a job title"
        placeholder="Type a job title, e.g. nurse, sykepleier, poker player"
        endpoint="/api/public/job-search"
        errorText="Search isn't responding right now. Try again in a moment."
        onSelect={setHit}
        keepQuery
      />
      <p aria-live="polite" className="mt-3 min-h-6 text-body text-ink-2">
        {hit ? (
          <>
            <span className="text-ink">Yes.</span> {hit.roleTitle ?? hit.matched} is in{" "}
            <span className="font-medium text-ink">{hit.laneName}</span>, part of {hit.familyName}.
          </>
        ) : null}
      </p>
    </div>
  );
}
