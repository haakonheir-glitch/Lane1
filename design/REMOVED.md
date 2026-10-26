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
