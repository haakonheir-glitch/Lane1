# Lane — front-end

*Evidence, not horoscopes.* Lane helps people find the line of work they're best suited to through a profile, a ranked Lane Map, short real-world trials ("Lane Sprints") and an evidence record. This repository is the complete front-end. There is no backend: all data comes from typed mocks.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript (strict) |
| `npm run shoot -- [baseUrl] [routes…]` | Full-page screenshots at 390 and 1440 px, light and dark, into `.screenshots/`. Also reports horizontal overflow and runtime errors. |
| `npm run a11y -- [baseUrl]` | axe-core WCAG 2.1 A/AA audit (including colour contrast) of every route in both themes |

Both QA scripts expect a running server (`npm run build && npm start`). If Playwright's bundled browser isn't installed, point them at a Chromium binary with `PW_CHROMIUM=/path/to/chrome`.

## Routes

| Route | Screen |
|---|---|
| `/` | Landing page |
| `/method` | The science, with references |
| `/system` | Design-system specimen: every token and component, with a theme toggle |
| `/start` | Onboarding, 4 steps (`?step=1…4`) |
| `/assess` | Assessment hub |
| `/assess/[module]` | Question runner (`interests`, `personality`, `values`) or the pattern-matrix game (`cognitive`). Fully keyboard-driven. |
| `/profile` | Profile report, laid out like a lab report |
| `/lanes` | Lane Map. URL state: `?sort=fit-payoff&group=…&payoff=…&lane=<id>` |
| `/sprints`, `/sprints/[id]` | Sprint dashboard and sprint detail |
| `/evidence` | Evidence Record |
| `/settings` | Profile, theme, data export, account deletion |

### Keyboard

- **Question runner:** `1`–`5` answer and move on · `↑` `↓` adjust · `Enter` next · `Backspace` back
- **Pattern game:** `Enter` start · `1`–`4` choose
- **Onboarding:** `1`–`5` choose · `Enter` continue
- **Lane panel (below 1280 px):** focus is trapped in the panel; `Esc` closes it

## Folder structure

```
src/
├─ app/
│  ├─ globals.css           design tokens (CSS variables) mapped into Tailwind 4 via @theme
│  ├─ layout.tsx            fonts, no-flash theme script, skip link
│  ├─ (marketing)/          /, /method        — site header and footer
│  ├─ (onboarding)/start/   /start            — minimal chrome
│  ├─ (app)/                app shell (sidebar on desktop, bottom tabs on mobile) and all app routes
│  ├─ system/               /system specimen page
│  └─ not-found.tsx         404
├─ components/
│  ├─ ui/        Button, Field/Input/Select, Checkbox, SegmentedControl, Accordion, Tag, Kbd, Skeleton, Rule
│  ├─ data/      DataLabel, ScoreBar, ConfidenceBadge, PayoffGlyph, PayoffCurve, RadarProfile, TraitTable,
│  │             LineChart, SegmentedProgress  (all charts are hand-built SVG)
│  ├─ report/    SectionHeader, ReportHeader, LimitationsBox, EmptyState
│  ├─ lanes/     LaneRow, LaneMap, LaneDetailPanel
│  ├─ assess/    QuestionCard, LikertRunner, PatternGame, Onboarding, ModuleRow, ProgressBar, useAnswers
│  ├─ sprints/   SprintCard, SprintDetail, CheckInScale
│  ├─ evidence/  EvidenceTimeline, ConvictionChart, LaneComparisonTable
│  ├─ shell/     Sidebar, BottomTabs, TopBar, AppPage, Wordmark, ThemeToggle, SettingsForm
│  └─ marketing/ SiteHeader, SiteFooter
└─ lib/
   ├─ types.ts   domain types (the single source of truth)
   ├─ data/      async data-access functions (the API seam)
   ├─ mock/      typed fixtures, imported only by lib/data
   ├─ scoring.ts payoff curves, ranking and tie logic
   ├─ format.ts  dates, intervals and labels
   ├─ copy.ts    assessment scale wording
   └─ hooks/     useMediaQuery, useFocusTrap
scripts/          shoot.mjs (screenshots + overflow), a11y.mjs (axe audit)
```

## What is mocked

Everything behind `src/lib/data/index.ts`:

- **User and profile:** Ingrid Halvorsen, Oslo, report `LN-2026-0824-IH`. The app's "today" is fixed at 2026-10-21 so renders are deterministic.
- **Lane data:** 20 ranked lanes with fit intervals, payoff type, payoff position, drivers and similar-profile stats, plus a 34-lane index for the landing page.
- **Assessment:** 72 Likert items and 6 rule-generated pattern matrices.
- **Sprints:** 1 active, 2 completed and 3 suggested, with tasks, check-ins and logs.
- **Evidence:** events and conviction series.
- **Not saved:** check-ins, log rows, task ticks and settings changes live in React state only and reset on reload.
- **Saved:** assessment and onboarding answers persist in `sessionStorage`.
- **Data export** downloads a real JSON file built from the mocks. **Account deletion** is simulated.

**Swapping in an API:** rewrite the function bodies in `src/lib/data/index.ts` and keep their signatures. Pages are server components that call these functions; components only receive typed props and never import mocks. A ranked Lane Map is computed client-side by `rankLanes()` in `lib/scoring.ts`; a real backend may want to own that instead.

## Notes

- Design decisions, including the contrast changes to the brief's palette, are in [`PLAN.md`](PLAN.md#10-decisions).
- `AGENTS.md` is generated by Next.js 16 for coding agents and can be ignored.
