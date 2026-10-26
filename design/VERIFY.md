# Brand pass: verification

All checks were run locally on 2026-10-26 against this branch.

| Check | Result |
|---|---|
| Unit tests | 135 passed (`vitest`), including the Profile Mark and share-card tests |
| End-to-end | `npm run e2e` passed: all five sessions, hub, own report (cover with real effort counts, summary sheet), provisional reasoning, Career map filters and detail, redirects, export |
| Typecheck, lint | clean |
| Protected paths | `git diff ca472bd -- src/lib/scoring src/lib/bank src/lib/matching src/lib/taxonomy taxonomy assessment scripts/gen-taxonomy-types.mts src/lib/db/schema.ts drizzle src/lib/report/schema.ts src/lib/report/facts.ts src/lib/assess src/components/assess/tasks src/components/assess/hooks.ts src/components/assess/api.ts` is empty. `SessionRunner.tsx` changed only in `SessionOutro` (after the session ends) |
| Timed-task timing | Before (`design/baseline/timing.json`) and after (`design/after/8-performance-timing.json`): key→paint and reply→paint medians and p95 within run-to-run noise on every task, 0 long tasks before and after (table below) |
| Profile Mark | Deterministic (byte-identical SVG for the same scores), 200 seeded profiles give 200 different SVGs, every single score changes the mark |
| Lighthouse accessibility | 100 on `/`, `/sample`, `/assess`, `/profile`, `/lanes`, the detail panel, `/profile/share` and `/settings`, light and dark |
| axe (WCAG 2.1 A/AA, incl. contrast) | No violations on 20 routes × light/dark × 390/1440 px |
| Keyboard | Every tab stop on `/`, `/sample`, `/assess`, `/profile`, `/lanes` and `/profile/share` is reachable and shows the focus ring (the only exception is Next's dev-tools overlay, which is dev-only) |
| Reduced motion | Global rule, plus: the mark's reveal, count-up, report reveal and Career map panel all switch off under `prefers-reduced-motion` (the panel uses a zero-length transition, with the same starting state on server and client) |
| LCP (production build, local) | `/assess` 156 ms · `/profile` 288 ms (564 ms before caching) · `/lanes` 268 ms |

## Timed-task timing, before / after (ms)

| Task | key→paint median | key→paint p95 | reply→paint median | long tasks |
|---|---|---|---|---|
| matrix | 81 / 71 | 204 / 138 | 24 / 22 | 0 / 0 |
| number_series | 47 / 51 | 99 / 79 | 8 / 8 | 0 / 0 |
| letter_series | 56 / 49 | 89 / 90 | 8 / 7 | 0 / 0 |
| rotation2d | 12 / 12 | 110 / 97 | 12 / 14 | 0 / 0 |
| backward_digits | 8 / 8 | 95 / 93 | 14 / 12 | 0 / 0 |
| quant | 69 / 50 | 128 / 93 | 14 / 9 | 0 / 0 |
| corsi | 11 / 11 | 12 / 13 | 10 / 12 | 0 / 0 |
| symbol_match | 4 / 4 | 48 / 49 | 7 / 7 | 0 / 0 |
| choice_rt | 11 / 14 | 20 / 19 | 17 / 11 | 0 / 0 |
| learning_rate | 90 / 80 | 131 / 95 | 5 / 4 | 0 / 0 |
| balloon | 6 / 7 | 20 / 20 | 13 / 14 | 0 / 0 |
| delay_discount | 38 / 43 | 85 / 73 | 5 / 5 | 0 / 0 |

## Copy check: "neuro", "brain", "objective", "predict"

No user-facing claim of any of these. Every hit was kept, and each one is:
- **"Neuroticism":** the name of a personality domain (report, mark legend).
- **"brain-chemistry":** on /method, in "We do not use genetic, DNA, hormonal or brain-chemistry data…", a disclaimer.
- **"predict":** each use is either a negation or a research summary:
  - "…not a prediction of success" (Career map lead)
  - "…not a prediction of earnings" (detail panel)
  - "Fit with a profile, not a prediction" (share card)
  - "it doesn't predict success" (landing page limits)
  - "Even good tests predict job outcomes only modestly" (FAQ)
  - "Interest fit predicts satisfaction modestly" and "strongest predictors of job performance" (/method, with citations)
  - the written-report prompt, which says a good fit is "not a recommendation or a prediction of success"
- **"objective":** no hits.
