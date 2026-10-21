# Lane — Front-end Plan

Status: **built** (phases 1–6) · v0.1 · 2026-10-21

Working name "Lane". Front-end only; all data mocked behind a typed data layer.

---

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.x (App Router) | `src/` dir, React Server Components by default, client components only where interactive |
| Language | TypeScript, `strict: true`, `noUncheckedIndexedAccess` | |
| Styling | Tailwind CSS 4.x | CSS-first config: tokens live as CSS variables in `globals.css`, exposed to Tailwind via `@theme inline` |
| Fonts | `geist` package (`GeistSans`, `GeistMono`) | Weights 400 / 500 only |
| Motion | `framer-motion` | Opacity + ≤8px translate, 150–250ms, ease-out. Respects `prefers-reduced-motion` |
| Icons | `lucide-react` | `strokeWidth={1.5}`, 16/20px, meaning-bearing only |
| Charts | Hand-built SVG for everything (see Decisions D3) | |
| Lint/format | ESLint (next config) + Prettier | |
| Visual QA | Playwright script → screenshots at 390 / 1440 × light / dark | `scripts/shoot.ts`, output to `.screenshots/` (git-ignored) |

---

## 2. Route map

Two route groups share one root layout (fonts, theme script, tokens).

```
src/app/
├─ layout.tsx                    root: <html data-theme>, fonts, no-flash theme script
├─ not-found.tsx                 404 (report style: "ERR 404 · No record at this address")
├─ system/page.tsx               design-system specimen (dev reference, public, noindex)
│
├─ (marketing)/                  public — top bar + footer layout
│  ├─ layout.tsx
│  ├─ page.tsx                   /          landing
│  └─ method/page.tsx            /method    the science, with citations
│
└─ (app)/                        "authenticated" (mocked) — app shell layout
   ├─ layout.tsx                 sidebar (≥1024px) / bottom tabs (<1024px) + top bar
   ├─ start/page.tsx             /start              onboarding, 4 steps (?step=1..4)
   ├─ assess/page.tsx            /assess             module hub
   ├─ assess/[module]/page.tsx   /assess/interests | personality | cognitive | values
   ├─ profile/page.tsx           /profile            lab report
   ├─ lanes/page.tsx             /lanes              Lane Map (?group=&payoff=&sort=fit|fitxpayoff&lane=<id>)
   ├─ sprints/page.tsx           /sprints            dashboard
   ├─ sprints/[id]/page.tsx      /sprints/:id        sprint detail
   ├─ evidence/page.tsx          /evidence           evidence record
   └─ settings/page.tsx          /settings
```

Each app route also gets a `loading.tsx` (hairline shimmer skeleton) in phase 6.

**App shell navigation** (sidebar groups, mono section labels):
- `PROFILE` — Assessment, Profile
- `LANES` — Lane Map
- `EVIDENCE` — Sprints, Evidence Record
- bottom: user (name + report ID), Settings

Mobile bottom tabs (5): Assess · Profile · Lanes · Sprints · Evidence. Settings reachable from top-bar user button.

`/start` is outside the sidebar experience visually (full-screen, minimal top bar with step counter and exit) — implemented as a nested layout that hides the shell.

---

## 3. Folder structure

```
src/
├─ app/                          routes (above)
├─ components/
│  ├─ ui/                        primitives: Button, Input, Select, Checkbox, Toggle,
│  │                             SegmentedControl, Accordion, Sheet (side panel), Skeleton,
│  │                             Rule, Tag, Kbd, VisuallyHidden
│  ├─ data/                      DataLabel, ScoreBar, ConfidenceBadge, PayoffGlyph,
│  │                             PayoffCurve, RadarProfile, TraitTable, LineChart,
│  │                             SegmentedProgress
│  ├─ report/                    SectionHeader, ReportHeader, LimitationsBox, EmptyState
│  ├─ lanes/                     LaneRow, LaneList, LaneFilters, LaneDetailPanel
│  ├─ assess/                    QuestionCard, ProgressBar, ModuleRow, PatternGame
│  ├─ sprints/                   SprintCard, TaskList, CheckInScale, PerformanceLog
│  ├─ evidence/                  EvidenceTimeline, ConvictionChart, LaneComparisonTable
│  ├─ shell/                     Sidebar, BottomTabs, TopBar, ThemeToggle, Wordmark
│  └─ marketing/                 Hero, ProblemGrid, MethodSequence, LaneIndex, Faq, Footer
├─ lib/
│  ├─ types.ts                   domain types (single source of truth)
│  ├─ data/                      async data-access functions (the API seam)
│  │  ├─ profile.ts              getProfile(), getUser()
│  │  ├─ lanes.ts                getLanes(), getLane(id), getLaneMap(opts)
│  │  ├─ assessment.ts           getModules(), getQuestions(module)
│  │  ├─ sprints.ts              getSprints(), getSprint(id), getSuggestedSprints()
│  │  └─ evidence.ts             getEvidence()
│  ├─ mock/                      raw typed fixtures, only imported by lib/data/*
│  │  ├─ user.ts  profile.ts  lanes.ts  questions.ts  sprints.ts  evidence.ts
│  ├─ scoring.ts                 pure functions: relativeFit, fitTimesPayoff, confidence bands
│  ├─ format.ts                  number/date/ID formatting (tabular, units, ±)
│  └─ cn.ts                      className join
(tokens live in src/app/globals.css, next to the root layout)
```

**API seam:** components import only from `lib/types` and receive data as props. Pages (server components) call `lib/data/*`, which today return mock fixtures wrapped in `Promise.resolve` (with optional artificial latency to exercise `loading.tsx`). Swapping to a real API means rewriting `lib/data/*` bodies only.

---

## 4. Domain types (sketch)

```ts
type Confidence = 'high' | 'med' | 'low';
type Score = { value: number; ci: [number, number]; median?: number; percentile?: number }; // 0–100

type Riasec = Record<'R'|'I'|'A'|'S'|'E'|'C', Score>;
type BigFive = Record<'openness'|'conscientiousness'|'extraversion'|'agreeableness'|'neuroticism', Score & { interpretation: string }>;
type Aptitude = { id: string; label: string; score: Score; unit: string };
type Value = { id: string; label: string; rank: number; weight: number };

type LaneGroup = 'corporate' | 'independent' | 'performance' | 'craft';
type PayoffType = 'linear' | 'convex' | 'winner-take-all';
type Lane = {
  id: string; name: string; group: LaneGroup; payoff: PayoffType;
  relativeFit: Score;              // ipsative: vs. the user's own spread
  payoffPosition: number;          // 0–1, estimated position on curve at realistic skill
  expectedPayoff: number;          // 0–1, derived from curve(payoffPosition)
  confidence: Confidence;
  drivers: { trait: string; contribution: number }[]; // top contributors
  similarProfiles: { n: number; triedPct: number; continuedPct: number; note: string };
  sprintTemplateId?: string;
};

type Sprint = {
  id: string; laneId: string; title: string; days: number; startedOn: string;
  status: 'active' | 'completed' | 'suggested';
  tasks: { day: number; title: string; done: boolean }[];
  checkIns: { day: number; energy: number; flow: number; continue: number }[]; // 1–7
  log: { day: number; metric: string; value: number; unit: string }[];
  outcome?: { performance: Score; improvementRate: number; wantsToContinue: boolean; summary: string };
};

type EvidenceEvent = { id: string; date: string; kind: 'assessment'|'sprint-start'|'sprint-end'|'check-in'|'outcome'; title: string; detail: string; laneId?: string };
type ConvictionPoint = { date: string; laneId: string; value: number; ci: [number, number] };
```

---

## 5. Design tokens

### 5.1 Color

Defined as CSS variables on `:root` (light), overridden by `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` and `[data-theme="dark"]`. Manual toggle writes `data-theme` + `localStorage`; a blocking inline script in `<head>` applies it before paint.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F7F7F5` | `#0E0F10` | page |
| `--surface` | `#FFFFFF` | `#16171A` | cards, panels |
| `--ink` | `#111111` | `#EDEDEA` | primary text |
| `--ink-2` | `#55575C` | `#A5A7AC` | secondary text |
| `--ink-3` | **`#6F7176`** ⚠ | **`#8B8D93`** ⚠ | labels, metadata (text) |
| `--ink-4` | `#8A8C91` | `#6E7076` | non-text graphics only: ticks, axis marks, inactive segments, prior-day lines |
| `--rule` | `#E3E3DF` | `#26282C` | hairlines |
| `--rule-strong` | `#C9C9C4` | `#3A3C41` | table heads, active borders |
| `--accent` | `#2340E8` | `#6B80FF` | primary action, current state, key datum |
| `--accent-wash` | `#EEF1FE` | `#1A1F3D` | rare accent backgrounds |
| `--positive` | `#1E7A4C` | `#4CB884` | improvement, completed |
| `--caution` | **`#8F5A00`** ⚠ | `#D9A441` | low confidence, warnings |

⚠ = changed from the brief to pass WCAG AA — see Decision D1.

Tailwind mapping (`@theme inline`): `bg-bg`, `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`, `stroke-ink-4`, `border-rule`, `border-rule-strong`, `text-accent`, `bg-accent`, `bg-accent-wash`, `text-positive`, `text-caution`. Tailwind's default palette is removed (`--color-*: initial`) so no hardcoded colors can slip in.

### 5.2 Typography

`font-sans` = Geist, `font-mono` = Geist Mono. Global `font-variant-numeric: tabular-nums` on `.font-mono` and all data components.

| Utility | Size / LH | Tracking | Weight | Font |
|---|---|---|---|---|
| `text-display` | 64 / 68 | −0.03em | 500 | sans |
| `text-h1` | 44 / 50 | −0.02em | 500 | sans |
| `text-h2` | 30 / 36 | −0.015em | 500 | sans |
| `text-h3` | 22 / 28 | −0.01em | 500 | sans |
| `text-body-l` | 18 / 28 | 0 | 400 | sans |
| `text-body` | 16 / 24 | 0 | 400 | sans |
| `text-small` | 14 / 20 | 0 | 400 | sans |
| `text-label` | 12 / 16 | +0.06em, uppercase | 400/500 | mono |

Mobile step-down (<640px): display 44/50, h1 34/40, h2 26/32. Weights limited to `font-normal` (400) and `font-medium` (500); other weights removed from the theme.

### 5.3 Shape, spacing, layout

- Radius: `rounded-xs` 2px (inputs, buttons), `rounded-sm` 4px (cards), `rounded-full` (avatars only). All other radii removed.
- Borders: 1px `--rule`. No `box-shadow` utilities except `shadow-hairline` = `0 0 0 1px var(--rule)`.
- Spacing scale constrained to 4·8·12·16·24·32·48·64·96·128 (Tailwind `--spacing: 4px` base; lint rule/convention: only multiples on that scale).
- Grid: 12 columns, 24px gutter (16px <640px), outer margin 16 / 32 / 48px. `max-w-content` 1200px, `max-w-reading` 680px.
- Baseline 4px: all line-heights and component heights are multiples of 4.
- Focus: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`, globally.
- Motion tokens: `--dur-1 150ms`, `--dur-2 200ms`, `--dur-3 250ms`, `--ease-out cubic-bezier(0.2, 0, 0, 1)`.
- Skeleton: 1px hairline with a translating `--rule-strong` highlight (no grey blocks).

---

## 6. Component inventory

All shown on `/system`, grouped as Foundations → Primitives → Data → Composite.

### Foundations (specimens, not components)
Color swatches with hex + contrast ratio · type scale · spacing scale · radii · grid overlay · motion demo · focus ring.

### Primitives (`components/ui`)
| Component | Variants / notes |
|---|---|
| Button | `primary` (accent fill), `secondary` (ink outline), `ghost`; `size` 40 (default) / 32; optional `mono` label; `asChild` for links; loading state = mono "…" |
| Input / Textarea / Select | 40px, 2px radius, hairline, label above in `text-label` |
| Checkbox | 16px square, accent check |
| SegmentedControl | used for Fit / Fit×payoff toggle and theme; hairline group, active = ink fill |
| Toggle (switch) | settings only |
| Accordion | hairline-separated, `+`/`−` in mono, `aria-expanded` |
| Sheet | right-side panel (desktop 480px; full-screen on mobile), focus trap, Esc to close |
| Tag | mono label in hairline box |
| Kbd | key hint for assessment runner |
| Skeleton | hairline shimmer |
| Rule | horizontal/vertical hairline, `strong` variant |

### Data (`components/data`)
| Component | Spec |
|---|---|
| DataLabel | `LABEL  value unit  ±ci`; layouts `inline` / `stacked`; value in mono tabular |
| ScoreBar | 4px track (`--rule`), fill (`--ink`, or `--accent` when `emphasis`), CI band as 30%-opacity shaded range, median tick (1×10px `--ink-4`); `aria` as `role="meter"` with value text |
| ConfidenceBadge | `HIGH`/`MED`/`LOW` mono + 3 segments; low → `--caution` |
| PayoffGlyph | 48×20 SVG; curves: linear, convex, winner-take-all (flat then near-vertical); 3px dot at user position; `aria-label` describes shape |
| PayoffCurve | full-size version for detail panel: axes labelled "Skill percentile" / "Relative payoff", user marker with CI whisker, median marker |
| RadarProfile | hexagon, 3 hairline concentric rings max, axis labels in mono (R I A S E C + full word on hover/legend), user polygon accent stroke + 12% fill, optional CI as dashed outer/inner hull |
| TraitTable | columns: Trait · Score (mono `78 /100 ±6`) · ScoreBar · Percentile · Interpretation; collapses to stacked rows <640px |
| LineChart | hand-built SVG: hairline baseline, mono tick labels, accent current series, `--ink-4` prior/other series, optional CI band; responsive via `viewBox` + ResizeObserver |
| SegmentedProgress | N segments (sprint days), done = ink, today = accent, future = rule |

### Report / layout
SectionHeader (mono index label e.g. `§ 02 · INTERESTS` + H2 + hairline) · ReportHeader (name, date, report ID, version) · LimitationsBox (`--rule-strong` border) · EmptyState (sentence + one Button).

### Domain composites
LaneRow · LaneFilters · LaneDetailPanel · QuestionCard · ProgressBar (2px top) · ModuleRow · PatternGame · SprintCard · TaskList · CheckInScale (7 square buttons, radio group semantics, keys 1–7) · PerformanceLog (editable table) · EvidenceTimeline · ConvictionChart · LaneComparisonTable.

### Shell
Sidebar · BottomTabs · TopBar (title + context action) · ThemeToggle (Light / Dark / System) · Wordmark ("LANE" in mono 500, +0.12em tracking, no logo mark).

---

## 7. Screen notes (key decisions per page)

- **`/` Landing:** 12-col asymmetric — hero copy in cols 1–6, live LaneRow excerpt in cols 8–12 framed as "FIG. 1 — Sample Lane Map, excerpt". Every section opens with a numbered SectionHeader (`§ 01 THE PROBLEM` …) so the page reads like a paper. Lane index: 4 columns (2 on tablet, 1 on mobile), 32+ lanes, mono group headings with counts.
- **`/method`:** reading-width article, numbered sections, inline superscript citation markers → numbered reference list (author, year, title, journal). References limited to well-established literature (Holland RIASEC; Costa & McCrae; Schmidt & Hunter 1998 on selection validity; Sackett et al. 2022 revisiting it; Nye et al. on interest–performance fit; Ericsson / skill acquisition; Frank & Cook on winner-take-all markets). Wording will reflect that validity estimates are contested, not invent numbers.
- **`/start`:** one question per screen, H1-size prompt, options as full-width hairline rows with key hints, `?step=` in URL, Enter to continue, back link.
- **`/assess`:** overall progress (`2 / 4 MODULES · 46%`) + ModuleRows (status, `~12 MIN`, item count, completion bar, action).
- **`/assess/[module]`:** QuestionCard flow, Likert 1–5 (keys 1–5, ←/→ to move, Enter to confirm/advance, Backspace to go back). `cognitive` module = PatternGame: 3×3 SVG matrix with one missing cell, 4 options, mono countdown `00:24`, neutral feedback ("Recorded. Next item."), never "Correct!/Wrong". Answers held in client state + `sessionStorage`.
- **`/profile`:** ReportHeader (`REPORT LN-2026-0417-HS`), §01 Summary, §02 Interests, §03 Personality, §04 Aptitudes, §05 Values, §06 What this can and can't tell you.
- **`/lanes`:** 18–20 lanes. Desktop: list fills content, detail opens as Sheet on the right (list narrows, doesn't overlay, at ≥1280px). State fully in URL params so a lane detail is linkable. Accent reserved for the #1 ranked fit bar and the active row's chevron only.
- **`/sprints`:** active SprintCard (large, accent on "today"), suggested sprints (3, derived from top lanes without completed sprints), completed list with outcome line.
- **`/sprints/[id]`:** two columns desktop (tasks left 7 cols; check-in + log + chart right 5 cols), stacked mobile. Today's task row is the screen's single accent element besides the chart line.
- **`/evidence`:** Body-L headline insight with ConfidenceBadge, timeline (left) with ConvictionChart aligned alongside (right) on desktop; comparison table below.
- **`/settings`:** plain form sections: Profile · Appearance · Data (export JSON — generates a real download of mock data) · Danger zone (delete account, confirm dialog, mock).

---

## 8. Mock data plan

- **User:** Ingrid Halvorsen, 27, Oslo, "working, considering a change", currently in a junior analyst role. Report ID `LN-2026-0417-IH`.
- **Other names** (similar-profiles notes, testimonials-free — used only in settings/team placeholders if needed): Sindre Bakke, Amara Okafor, Jonas Lindqvist, Mei Tanaka, Lucía Ortega.
- **Scores:** plausible, internally consistent (high E/A in RIASEC, high extraversion + openness, moderate conscientiousness; verbal > spatial aptitude) so the lane ranking makes sense.
- **Lanes (20 ranked + 32 in landing index):** e.g. Sales (B2B), Independent content creator, Product management, Recruiting, Coaching, Solo founder (micro-SaaS), Teacher, Consultant, UX research, Marketing, Journalist, Podcast host, Discretionary trader, Data analyst, Software engineer, Electrician, Chef, Professional athlete, Musician / performer, Real-estate agent — each with group, payoff type, CI, confidence, drivers.
- **Sprints:** 1 active ("10 discovery calls", Sales, day 6 of 14), 2 completed (Independent content: "Publish 5 short videos"; UX research: "Run 4 user interviews"), 3 suggested.
- **Evidence:** ~14 events across 10 weeks; conviction series per tried lane.

All fixtures typed against `lib/types.ts`; dates as ISO strings.

---

## 9. Build phases & definition of done

| Phase | Scope | Done when |
|---|---|---|
| **1. Foundation** | scaffold, tokens, fonts, theme script + toggle, all primitives + data components, `/system` | `/system` renders every component in both themes; screenshots reviewed; `tsc` + lint clean. **Pause for your review.** |
| **2. Marketing** | `/`, `/method`, marketing layout, footer | 390/1440 × light/dark screenshots reviewed |
| **3. Assessment** | `/start`, `/assess`, `/assess/[module]`, PatternGame | full keyboard pass through one module |
| **4. Results** | `/profile`, `/lanes` + detail Sheet, filters, sort toggle | URL state round-trips; panel focus-trapped |
| **5. Sprints & evidence** | `/sprints`, `/sprints/[id]`, `/evidence` | check-ins/log update local state; charts render both themes |
| **6. Polish** | spacing audit, motion, keyboard, empty states, `loading.tsx` skeletons, 404, Lighthouse a11y ≥95 on every route, no horizontal scroll 360–1920 | audit checklist in README all ticked |

After every phase: `npm run build`, run `scripts/shoot.ts` for each new route at 390 & 1440 in both themes, review against §2 of the brief, fix, then continue.

---

## 10. Decisions

- **D1 — Contrast fixes to the specified palette.** Measured against WCAG AA (4.5:1 for text):
  - `#8A8C91` on `#F7F7F5` = **3.14** (fails); dark `#6E7076` on `#16171A` = **3.62** (fails). These are the label/metadata colors, i.e. the smallest text, so it matters.
  - `--caution #A86A00` on `#F7F7F5` = **4.14** (fails).
  - Fix: `--ink-3` becomes `#6F7176` light (4.55) / `#8B8D93` dark (5.40); `--caution` light becomes `#8F5A00` (5.39). The original greys are kept as `--ink-4`, used only for non-text graphics (3:1 is the requirement there and they pass). Visual character is essentially unchanged. *Revert if you prefer the exact hexes and accept failing AA.*
- **D2 — Tailwind v4 CSS-first config.** Tailwind 4 has no `tailwind.config.js` by default; "map into Tailwind" is done with `@theme inline` in `globals.css`. Default palette, radii, shadows and font weights are cleared so only tokens are usable.
- **D3 — No recharts/visx.** The line charts needed (improvement, conviction) are simple; hand-built SVG keeps them exactly on-token, removes default styling to fight, and keeps the bundle small. Revisit only if interactions (brushing, zoom) are added.
- **D4 — Dark mode mechanism.** `data-theme` on `<html>` with three-way setting (Light / Dark / System). System follows `prefers-color-scheme`. Inline head script prevents flash. Tailwind `dark:` variant bound to the same selector, though tokens should make `dark:` rarely necessary.
- **D5 — "Authenticated" is mocked** as a route group with a fixed mock user; no auth UI beyond the shell. `/start` is reachable directly and from the landing CTA.
- **D6 — Relative fit is ipsative.** Lane fit is computed against the user's own score distribution (z-scored within-person), so a lane can rank #1 even if all raw scores are average. Copy on `/lanes` says so explicitly. "Fit × payoff" multiplies relative fit by the expected payoff at the user's estimated position on that lane's curve; CIs are propagated (roughly) so ranks with overlapping intervals are marked as ties (`=3`).
- **D7 — Score scale.** All scores 0–100 with 80% intervals shown as `±n`; percentiles labelled `P72`. Medians shown as ticks only where a population reference is meaningful (aptitudes, Big Five), not on relative-fit bars (no population comparison by design).
- **D8 — Assessment persistence.** Brief says React state + URL params; answers are too large for the URL, so they live in React state mirrored to `sessionStorage` for refresh-safety. Step/question index is in the URL.
- **D9 — Accent discipline per screen.** Each page spec lists its one accent element; others use ink. Positive/caution are semantic status colors, not accents, and appear only on status data.
- **D10 — Breakpoints.** `sm 640`, `md 768`, `lg 1024` (sidebar appears), `xl 1280` (lane panel docks beside list). Mobile-first.
- **D11 — Folder `src/`.** Routes in `src/app`; `/lib` and `/components` from the brief live at `src/lib`, `src/components` (aliased as `@/lib`, `@/components`).
- **D12 — Citations.** `/method` cites real, well-known works by author/year/title only; no fabricated effect sizes. Where the literature disagrees (e.g. validity of cognitive tests after Sackett et al.), the copy says so.

---

- **D13 — Cache Components off.** The Next 16 template enables `cacheComponents` + `partialPrefetching`. With static mock data they add Suspense/prerender constraints and keep hidden routes mounted (React `<Activity>`), with no benefit. Turned off in `next.config.ts`; revisit when a real API arrives.
- **D14 — Fit × payoff formula.** `fit × (0.35 + 0.65 × payoff(position))`, so payoff weighs on but never erases fit. Curves: linear `0.18 + 0.72x`, convex `x^2.4`, winner-take-all `x^12` (conceptual shapes, not earnings data).
- **D15 — Ties are anchored.** A lane ties with the lane *holding* the current rank only if within 2.5 points of it, so ties never chain down the list.
- **D16 — Neutral game feedback.** The pattern game says "Recorded · 4.2 s" and never right/wrong; telling people would teach the test and change what it measures.
- **D17 — Accessibility verification.** Lighthouse isn't run in this environment; `npm run a11y` runs axe-core (WCAG 2.1 A/AA incl. contrast) on every route at 390/1440 in both themes instead. It reports zero violations.

## 11. Open questions (non-blocking — defaults above apply)

1. Accept D1 contrast adjustments?
2. Mock user name/city (Ingrid Halvorsen, Oslo) fine?
3. Should `/system` be excluded from production builds, or kept public as a living style guide (default: kept, `noindex`)?
