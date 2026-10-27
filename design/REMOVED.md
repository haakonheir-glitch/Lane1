# Removed: sprints and the evidence record

Lane matches a person's interests, personality, values and reasoning to the career paths that fit their assessment results. It no longer runs sprints (real-world trials) or keeps an evidence record. This pass removed the code paths and UI only. **No database tables were dropped or migrated.** What's left is listed below so you can decide what to do with it.

## Still in the database (unused now)

These tables were created in `drizzle/0000_init.sql`. Their Drizzle models are still in `src/lib/db/schema.ts`. No code reads or writes them, and they were never written to (sprints only ever ran on sample data).

| Table | Drizzle model | Columns | Notes |
|---|---|---|---|
| `sprints` | `sprints` | id, user_id → users (cascade), lane_id, template_id, status, started_on, days, completed_at, wants_to_continue, closing_note, created_at | Parent of the three tables below. |
| `sprint_tasks` | `sprintTasks` | sprint_id → sprints (cascade), day, done | PK (sprint_id, day). |
| `check_ins` | `checkIns` | sprint_id → sprints (cascade), day, energy, flow, continue, created_at | Daily energy/flow/continue check-ins. |
| `log_entries` | `logEntries` | sprint_id → sprints (cascade), day, values (jsonb), note | Daily logged metrics. |

To drop them later: delete the four models from `src/lib/db/schema.ts`, run `npm run db:generate`, review the generated `DROP TABLE` migration, and apply it. All four are reached only through `sprints`, so dropping `sprints` with cascade removes the rest. Deleting a user already cascades to `sprints`.

## API routes

None were removed: sprints and the evidence record never had API routes or server actions. Both were read-only pages over sample data. `/api/export` never included sprint or evidence data; only the Settings copy said it did, and that copy is fixed.

## Routes (now redirect to `/lanes`, 307 temporary)

| Old route | Redirects to | Where |
|---|---|---|
| `/sprints`, `/sprints/:id` | `/lanes` | `next.config.ts` `redirects()` |
| `/evidence`, `/evidence/*` | `/lanes` | same |
| `/lanes/:lane/plan` (sprint / practice / shadow plan) | `/lanes?lane=:lane` | same |

`src/proxy.ts` no longer guards `/sprints` and `/evidence`.

## Code deleted

- Pages: `src/app/(app)/sprints/page.tsx`, `src/app/(app)/sprints/[id]/page.tsx`, `src/app/(app)/evidence/page.tsx`, `src/app/(app)/lanes/[lane]/plan/page.tsx`
- Components: `src/components/sprints/{CheckInScale,SprintCard,SprintDetail}.tsx`, `src/components/evidence/{ConvictionChart,EvidenceTimeline,LaneComparisonTable}.tsx`
- Sample data: `src/lib/mock/sprints.ts`, `src/lib/mock/evidence.ts`
- Plan builder: `src/lib/lanes/plans.ts` (sprint, practice-task and interview-and-shadow plans), with its test `tests/plans.test.ts`
- Data functions: `getSprints`, `getSprint`, `getEvidence`, `getLanePlan` (`src/lib/data/index.ts`), `getSampleSprints`, `getSampleEvidence` (`src/lib/data/sample.ts`), `nextStep`, `buildLanePlan` (`src/lib/data/lanes.ts`)
- Types: `SprintStatus`, `SprintTask`, `CheckIn`, `LogEntry`, `SprintMetric`, `SprintOutcome`, `Sprint`, `EvidenceKind`, `EvidenceEvent`, `ConvictionSeries`, `Evidence` (`src/lib/types.ts`); `NextStep`, `LaneRowData.sprint`, `LaneDetail.sprintText`/`next` (`src/lib/lanes/types.ts`)
- Labels: `sprintLabel` (`src/lib/lanes/labels.ts`)
- Design-system specimens for sprint cards, check-in scale, conviction chart and evidence timeline (`/system`)

## Kept on purpose

- **Taxonomy `sprint` field** (`direct` / `simulated` / `shadow` per career path) in `taxonomy/taxonomy.json`, the generated types (`scripts/gen-taxonomy-types.mts`, `src/lib/taxonomy/generated.ts`) and the validator. That's taxonomy data, which this pass doesn't touch. Nothing in the UI reads it now.
- **`assessment/battery_manifest.json`** has an outcomes cadence note, "every sprint". It's assessment data and isn't user-facing.
- **`APP_TIMEZONE`** is still used for report IDs and dates.

# Removed: income labels (2026-10-27)

Product decision: income labels should not exist in Lane at all. Removed:

- **Taxonomy:** the five payoff curves (`linear`, `linear_high_floor`, `convex`, `steep`, `winner_take_all`), each lane's `payoff` field, and the `variable_pay` demand tag ("A large share of pay depends on results").
  - Removed in `taxonomy/src/*.txt` and `taxonomy/build/build.py`, then rebuilt. The rebuilt `taxonomy.json` is identical apart from these fields; role ids are unchanged.
  - `variable_pay` mapped only to experimental constructs, which matching doesn't count, so no fit score changed.
- **Matching (v1):** `payoffCurve`, the "Fit × payoff" sort key (`fitPayoff`, `expectedPayoff`) and the sort toggle. Career paths are ordered by band, then relative fit, as the default view already did.
- **Career map:**
  - the "Order by" control;
  - the "Pay" filter;
  - the pay label on rows, result cards and the landing page's sample row;
  - the payoff glyph and the payoff-curve chart (`PayoffGlyph`, `PayoffCurve` deleted);
  - "How it pays" in the detail panel;
  - every winner-take-all / "median income is low" note.
- **Written report:**
  - The facts no longer carry `payoff` or `winnerTakeAll`.
  - The prompt tells Claude not to write about pay, income or earnings.
  - The third "paths to look into" bullet now covers which measured strengths the work draws on.
  - `REPORT_FORMAT` went from 2 to 3, so stored reports are rewritten the next time they're opened.
- **Copy:**
  - The method page's "Payoff structure" section is gone, along with its two references (Rosen 1981; Frank and Cook 1995); the later references are renumbered.
  - "How it pays" is gone from the landing, sample, Career map and report-document copy.
  - The design-system page lost its payoff specimens.
- **Work Design (layer 2):** the Income variance dimension, which read the payoff labels (see `docs/WORK_DESIGN.md`).

- **Follow-ups from the independent review:**
  - Career ladder steps no longer describe stages by income. On the independent, creator and performer ladders, "first paid jobs", "Part-time freelance income", "premium rates", "First income", "Part-time income", "multiple income streams" and "first paid work" are reworded to describe the work.
  - The `risk` tag's description is now "Outcomes are uncertain; real downside".
  - Stored reports written before `REPORT_FORMAT` 3 are shown without any sentence about pay, income or earnings (`withoutPay` in `src/lib/report/schema.ts`) until they are rewritten.

**Not removed:** the balloon (risk) and delay-discounting (patience) tasks. They are behaviour measures, not income labels, and they are still scored and shown in the profile.

**Database:** nothing to migrate. Stored session scores never contained payoff data.

**Historical documents:** `PLAN.md`, `taxonomy/CLAUDE_CODE_PROMPT.md` and `assessment/ITEMS_PREVIEW.md` still mention payoff as part of the original design record. `assessment/BLUEPRINT.md` carries a "superseded" note.
