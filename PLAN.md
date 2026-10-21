# Lane — Plan v0.3 (assessment package integration)

Status: **awaiting approval** · no app code written for this plan yet

Inputs, in priority order:

| Input | Location | Governs |
|---|---|---|
| Assessment package v0.1 | `./assessment/` (README, BLUEPRINT, battery_manifest, items 01–14, generators) | **Assessment content and scoring**: wins on conflicts |
| Master prompt | *not attached; see D0* | **Design, routes, components, everything else** |
| Your integration rules (this request) | — | Overrides both where specific |

Earlier plans (v0.1 front-end, v0.2 backend) are in git history. Sections 2–4 below keep their design system unchanged; only what changes is described.

---

## 1. Starting point

The repository already has two states:

| Branch | Contents |
|---|---|
| `main` | v0.1: complete front-end on mock data (design system, `/system`, landing, method, 4-module assessment, profile, lanes, sprints, evidence, settings) |
| `functional-backend` | v0.2: everything in `main` plus Postgres (Drizzle; PGlite locally), email/password accounts, Lane's own interim item bank, scoring and per-user results |

This plan builds on **`functional-backend`** (recommended; see D1 and open question Q1). From that branch:
- The interim item bank (`src/lib/assessment/items.ts`), its scoring, and the 4-module flow are **replaced** by the package.
- Accounts, database and sprints are **kept**.
- Results pages are switched back to mock data, as you instructed.

---

## 2. Stack

Unchanged: Next.js 16.4 (App Router) · TypeScript strict · Tailwind 4 (CSS-first tokens) · Geist / Geist Mono · framer-motion · lucide-react · hand-built SVG charts · Drizzle + Postgres (PGlite locally) · Playwright + axe for QA.

Added:
- **Vitest** as the unit-test runner. It replaces the ad-hoc `tsx` test, because the ported generator suite and the scoring suites need a real runner.
- **`resolveJsonModule`** imports of `assessment/items/*.json`, so items are bundled at build time.

---

## 3. Routes

```
(marketing)  /                       landing: instrument copy updated (§8 D16)
             /method                 science page: IPIP, O*NET, Sackett, Johnson … references
(auth)       /login  /signup
(onboarding) /start                  4 short steps (master prompt)
(app)        /assess                 hub: S1–S5 from battery_manifest.json
             /assess/[session]       S1 … S5 runner (?block=&i= in URL)
             /assess/invite          informant invite after S2 (see Q3)
             /profile  /lanes  /sprints  /sprints/[id]  /evidence  /settings
(public)     /rate/[token]           informant rating form, no account (see Q3)
             /system                 specimen, now including every item renderer
api          /api/assess/session/[id]/next      POST  → next render payload
             /api/assess/session/[id]/respond   POST  ← response + timing, → next payload
             /api/assess/session/[id]/finish    POST  → effort check result, flags
             /api/assess/balloon/[trial]/pump   POST  ← pump, → {burst, points}
             /api/export                         GET   (exists)
```

All assessment endpoints are **route handlers**, as you required. They are the only code that sees answer keys.

---

## 4. Design system

Unchanged from v0.1: tokens, type scale, 4px baseline, 1px hairlines, one accent, the D1 contrast fixes, quiet motion, and focus rings. Every new component is built only from existing tokens and added to `/system`.

### New components (phase 3)

**Questionnaire renderers** (`components/assess/items/`), one per response format in the package:

| Format | Component | Interaction |
|---|---|---|
| `likert5` | `LikertItem` | Existing QuestionCard pattern. Keys 1–5, ↑/↓, Enter, Backspace. "Skip" button (see D9) |
| `likert7` | `LikertItem` (`points={7}`) | Keys 1–7 |
| `forced_q_sort` | `QSortBoard` | Desktop: five columns with exact capacity (4×5 or 2-2-4-2-2) and a capacity counter per column. Mobile: the package's two-pass flow (pick the most important, then the least, then sort the middle). Fully keyboard-operable: select a card, then press 1–5 to place it. Drag-and-drop is an enhancement, not the only path |
| `single` | `SingleChoice` | Hairline rows, keys 1–9 |
| `multi` | `MultiChoice` | Checkboxes, honours "select up to 3" and "None" exclusivity |
| `text` | `TextResponse` | Textarea with character count |
| `number` | `NumberResponse` | Mono input, unit label |
| `slider_0_100` | `Slider100` | Hairline track, mono readout, arrow keys ±1, PageUp/PageDown ±10, Home/End. **No default value**: the thumb appears on first touch |
| SJT (file 08) | `SjtItem` | Scenario in Body-L, question, 4–5 options |
| Creativity (file 09) | `IdeaList` | Timed list entry, one idea per Enter, mono countdown, idea count |

**Cognitive renderers** (`components/assess/tasks/`): one per task type in file 14, each fully styled. Every task follows the package's general rules: an instruction screen, then 2–3 practice items with feedback, then scored items with neutral feedback only (except the learning task).

| Task | Component | Rendering and input |
|---|---|---|
| matrix | `MatrixTask` | 3×3 SVG grid, hairline strokes; SHAPES / FILLS (lines = 45° hatch) / count 1–5 on a fixed layout / rotation in 45° steps; 8 options in a 4×2 grid; keys 1–8 |
| number_series | `SeriesTask` | Five mono numbers, five options; keys 1–5 |
| letter_series | `SeriesTask` | Same component in letter mode |
| quant | `QuantTask` | Word problem in Body-L, four mono options, explicit "no calculator" note; keys 1–4 |
| rotation2d | `RotationTask` | SVG polyomino target plus four options; select exactly two (toggle with 1–4), then confirm |
| backward_digits | `SpanTask` (digits) | 900 ms per digit, 300 ms gap (SPAN_PROTOCOL); numeric keypad entry on mobile; adaptive length |
| corsi | `SpanTask` (corsi) | Nine blocks at CORSI_LAYOUT; sequence lights in accent; tap or click to reproduce |
| symbol_match | `SymbolMatchTask` | Two triplets; F = same / J = different, or two large buttons; 90 s countdown |
| choice_rt | `ChoiceRtTask` | Four positions; keys D F J K, or tap; random foreperiod from the generator; 60 trials |
| learning_rate | `LearningTask` | Symbol shown, three keys (1/2/3); correct/incorrect feedback after each trial (the only task with feedback); 6 × 24 trials with a block progress counter |
| balloon | `BalloonTask` | Hairline circle that grows per pump; Pump / Collect; the server decides bursts (§6.3); running total in mono |
| delay_discount | `DiscountTask` | Two choice cards ("X kr today" / "1,000 kr in N days"); adaptive, five choices per delay |

**Session chrome:**
- `SessionIntro`: minutes and what the session unlocks.
- `EnvironmentCheck` (before S3/S4): three questions, with a "reschedule" path.
- `EffortCheck` (EFFORT1 at the end of S1, S2, S5).
- `SessionOutro`: what just unlocked.
- `InformantInvite` (after S2).
- `OnetAttribution`: footer block.
- `LowConfidenceNotice`: shown when a session gets 2 or more data-quality flags; explains why and offers a retake.

---

## 5. Assessment integration

### 5.1 How items are loaded

- `assessment/` stays a read-only copy of the package. Nothing in the app edits it, so a newer package can be dropped in.
- `src/lib/assessment/bank.ts` (server-only):
  - imports `assessment/items/*.json` and `battery_manifest.json` statically, so they are bundled at build time with no runtime file reads;
  - validates each file against a **Zod schema** at import time, so a malformed package fails the build rather than a user's session.
- **Normalised types**: `LikertItem`, `QSortCard`, `ChoiceItem`, `TextItem`, `NumberItem`, `SliderItem`, `SjtItem`, `IdeaTask` and `CognitiveTaskSpec`, each tagged with:
  - `module` and source file;
  - `status`: `validated` | `experimental` (derived from the file's `status` text, plus `status` on individual items for 09 and 11);
  - `administer`, `key` and `scale` / `facet` / `domain` codes.
- **Filtering:** `administer: false` items are removed in the loader. NEO028/058/088/118 never reach a session, and Openness is scored from O1–O5.
- **Validity insertion:** `buildBlock(moduleId)` returns the administration order. It places infrequency and instructed items from file 12 directly after their `insert_after` ids:
  - INFQ1 after NEO030, INST1 after NEO060, INFQ2 after NEO075, INFQ3 after NEO110 (all in S2);
  - INFQ4 after DSP_long_horizon_4 (S2);
  - INST2 after IPC05 (S1).
- **Inserted items' scale:** each one uses the response scale of its surrounding block.
- **Order:** IPIP-NEO by `source_number`; O*NET items as listed (option to shuffle within blocks of 6, off by default); file 08 understanding then management.
- **Sessions:** `sessionPlan(sessionId)` expands `battery_manifest.json` into an ordered list of blocks:
  - precheck → modules (with embedded validity items) → `after` → `end`;
  - `13_outcomes_followup:baseline` = all eleven items in `current_work`, `fit_and_wellbeing` and `performance`;
  - `14_cognitive_battery:<task>` = one task block.
- **No hard-coded questions:** no question text exists anywhere in `src/` (a lint check greps for it).
  - All copy comes from the JSON, including stems, option labels, scale anchors and `{name}` substitution for informant items.
  - The only exception is the generator templates, which are code by design.

### 5.2 Scoring module structure

`src/lib/scoring/`: pure functions with no I/O and no React, each unit-tested with Vitest. One file per item file's `scoring` block:

```
scoring/
├─ core.ts            reverse(), meanWithMinimum(), sem(), ci(), diffSE(), isRelativeStrength()
├─ personality.ts     IPIP-NEO-120: 29 facets (≥3 of 4), 5 domains (O from O1–O5), HH (file 02)
├─ interests.ts       O*NET IP: raw sums 10–50, like-counts 0–10, Holland code, differentiation, elevation
├─ interestsExt.ts    file 04 scale means (experimental)
├─ values.ts          WIL Q-sort: card score = column; value score = Σ × multiplier; validates 4-per-column
├─ valuesExt.ts       file 06 2-2-4-2-2 sort, within-person ranks only (experimental)
├─ dispositions.ts    file 07: 10 scales, ≥5 of 6 (experimental)
├─ sjt.ts             file 08: understanding = keyed; management = provisional keyed (experimental)
├─ creativity.ts      file 09: fluency (valid-idea count) now; originality/flexibility = pending engine
├─ biodata.ts         file 10: stores option indices / text; no score (empirical keying later)
├─ informants.ts      file 11: per-rater domain means, rater weight ×1.5 for "well"/"very well", ≥2 raters
├─ validity.ts        file 12: infrequency/instructed flags, page time, longstring >12, even-odd r<.30,
│                     antonym r>−.10 (27 pairs), rapid-guess, effort, decision rule (≥2 flags → low confidence)
├─ cognitive/         one file per task: matrix, series, quant, rotation (both-correct-no-mirrors),
│                     span (SPAN_PROTOCOL stop rule), symbolMatch (correct − incorrect), choiceRt,
│                     learning (fit a + b·log(block) for accuracy and median correct RT),
│                     balloon (adjusted pumps + post-burst change), discount (AUC 0–1)
├─ composite.ts       reasoning profile; general ability as percentile band (no IQ)
├─ relative.ts        BLUEPRINT §7: z-scores → within-person ranking → difference test
└─ index.ts           scoreSession(sessionId, responses) → SessionScores (one shape for all)
```

**Generators:**
- `assessment/generators/generators.ts` is imported as is.
- `src/lib/assessment/seed.ts` adds `seedFor(userId, taskId, attempt, itemIndex)`:
  - FNV-1a 32-bit of `${userId}:${taskId}:${attempt}`, mixed with `itemIndex` by a fixed multiplier;
  - deterministic, so a session can be regenerated server-side and never needs storing.
- Difficulty comes from each task's `phase1_ladder`.

**Tests:**
- `assessment/generators/generators.test.ts` is ported to `tests/generators.test.ts` (Vitest wrapper, same checks and seed counts).
- Seed tests check determinism, that different users get different items, and that a retake changes items.
- Scoring tests use hand-computed fixtures from the package's rules (examples: a facet with 2 of 4 answered → null; the WIL multiplier maths; the Corsi stop rule; the rotation both-correct rule).

### 5.3 Server / client split for keys

The client receives a **render payload** only. It is produced by `toPublic()` in the route handler:

| Content | Sent to client | Kept on server |
|---|---|---|
| Likert / single / multi / text / number / slider | id, text, options, response format | `key` (reverse flag), scale/facet codes, `status` |
| Validity items | Rendered as ordinary items | Their identity and pass/fail rule |
| SJT | Scenario, question, options | `key`, `provisional_key_index`, rationale |
| matrix | 8 cells of the grid and 8 options, in **generator-independent display order** | `answerIndex`, `rules`, difficulty |
| series / quant | Shown terms or text, options | `answer`, `rule`, level |
| rotation2d | Target and four option polygons, **pre-transformed** to absolute cells | `mirrored`, `angleDeg`, `answerIndices` |
| span | The sequence (it *is* the stimulus) | Scoring and adaptive length (the server decides the next length) |
| symbol_match | Left/right triplets | `same` |
| choice_rt | Stimulus and foreperiod | — |
| learning_rate | Symbol per trial, plus a per-trial correct/incorrect response | Mapping is never sent; feedback is computed server-side per batch of 24 (see D12) |
| balloon | Points per pump | `explosionPoints` (each pump is a POST; the server answers burst or not) |
| delay_discount | Next question | History and indifference computation |

- **Item identity:** items are identified by an opaque `itemToken` (an HMAC of session + position), not by generator id or seed. The client can't regenerate items.
- **Marking:** responses are marked in `/respond`. The client is never told right or wrong (except the learning task, and practice items, whose feedback is generated by the server).
- **Lint guard:** `bank.ts` and `scoring/**` start with `import "server-only"`. An ESLint rule forbids importing them from `"use client"` files.

### 5.4 How session progress is saved

New tables (Drizzle migration). The interim `responses` and `cognitive_responses` tables are dropped:

| Table | Columns | Notes |
|---|---|---|
| `assessment_sessions` | id, user_id, session_id (S1–S5), attempt, status (`in_progress` / `completed` / `discarded`), started_at, completed_at, device_class, input_type, viewport, env_check (json), effort, flags (json), confidence (`ok` / `low`) | |
| `item_responses` | session_row_id, position, item_id, module, value (json), rt_ms, shown_at, answered_at, device_class, input_type, skipped | One row per item, including validity items |
| `task_trials` | session_row_id, task_id, trial_index, item_seed, payload (json: response, correct, rt_ms, rapid_guess) | Cognitive and behavioural tasks |
| `session_scores` | session_row_id, scores (json, the `SessionScores` shape), scored_at | |
| `informant_invites`, `informant_responses` | — | If Q3 = yes |

**Saving and resuming:**
- Each answer is saved as it is given (`/respond`); nothing is held only in the browser.
- The current block and item index are in the URL (`?block=&i=`).
- On reload, `/next` returns the first unanswered position.
- Cognitive tasks resume at the **next task**, not mid-task. A half-finished timed task restarts with fresh items (attempt + 1), because resuming a timed task mid-way biases it.

**Timing:**
- `rt_ms` is measured client-side with `performance.now()`, from the moment the item is painted to when the answer is chosen. It is sent with each response.
- `device_class` comes from pointer and viewport media queries.
- `input_type` is the event type of the answer (keyboard, mouse or touch).

**At session end:**
1. `scoring/validity.ts` computes the flags.
2. `scoreSession` stores scores.
3. The EFFORT1 answer applies its action: *Partly* offers to redo the rushed block; *No* marks the session `discarded` and asks for a retake later.

The hub (`/assess`) reads `assessment_sessions` for status, minutes and the "unlocked" state.

### 5.5 Experimental content

- **Collected and scored but never shown as scores:** files 04, 06, 07, 08, 09 (PF1, AUD1), 10, and the observer items in 11.
- **How the user sees it:** a "Collected for research. Not part of your results until validated" line in the session outro, and nothing on results pages.
- **Enforced in the type:** `SessionScores` marks each scale `visibility: "user" | "hidden"`, and results components only accept `"user"` scales.

### 5.6 O*NET attribution

`OnetAttribution` renders the `required_attribution` string from file 03 verbatim, with a link to https://www.onetcenter.org/license_tools.html and "O*NET®" used as an adjective. It appears in the footer of:
- the S1 runner;
- `/profile`, `/lanes` and `/evidence` (all show interest or values results);
- `/method`.

### 5.7 Results pages (mock, BLUEPRINT §7)

- `src/lib/mock/profile.ts` is rewritten to the **exact `SessionScores`/`ProfileScores` shape** that `scoreSession` outputs: facets, domains, RIASEC sums, WIL values, cognitive composite band, reasoning profile, and validity confidence.
- Swapping to real scores later is a one-line change in `lib/data`.

**Display rules** (all enforced in shared components):
- **Intervals:** every score has an interval of ±1.645 × SEM, where SEM = SD·√(1 − r).
- **Facets:** each facet is shown with its interval, never as a lone number.
- **Ability:** no IQ number anywhere. General ability is shown as a **percentile band with a 90% interval**; the reasoning profile is shown as relative strengths.
- **Relative strength** is shown only when |z₁ − z₂| > 1.96 × √(2 − r₁ − r₂). Otherwise the page says "No clear difference".
- **Norms:** results are labelled "Provisional norms" until Lane has its own norms.
- **Partial profiles:** if a profile has only S1 + S2, the Lane Map is marked "Partial" with a list of the missing evidence (`minimum_viable_profile`).

---

## 6. Build phases

| Phase | Scope | Done when |
|---|---|---|
| 1. Foundation | Audit existing system; add Vitest; add new components to `/system` as they're built | Typecheck, lint, tests green |
| 2. Marketing | Landing and method copy updated for the real instruments and their references, O*NET attribution, the honest-limits list | Screenshots at 390 / 1440 in both themes reviewed |
| 3a. Bank and scoring | Loader with Zod schemas, session expansion, validity insertion, all `scoring/*` modules, seed function, ported generator test | Every scoring rule has a passing test; generator suite passes |
| 3b. Questionnaires | Hub (S1–S5), runner, all 8 response-format renderers plus SJT and IdeaList, route handlers, progress saving, effort/environment checks, flags | S1, S2 and S5 completable end to end by keyboard; reload resumes correctly |
| 3c. Cognitive | All 12 task renderers (the 11 named plus letter series via SeriesTask), practice items, server-side marking, rapid-guess handling | S3 and S4 completable; no answer key in the client bundle (verified by grepping the built JS) |
| 4. Results (mock) | Profile, lanes and evidence on the reshaped mock; §7 display rules; partial-map state | Rules enforced by components; screenshots reviewed |
| 5. Sprints & evidence | Keep existing (mock, per your instruction) | Unchanged pages still pass |
| 6. Polish | Spacing audit, motion, loading states, 404, axe on every route, overflow 360–1920 | Zero axe violations; no overflow |

QA after every phase is the same as before: build, then screenshots at 390 / 1440 in light and dark, then axe, then an E2E run.

---

## 7. Decisions

Conflicts and gaps between the two specs, and how this plan resolves them.

- **D0 — Master prompt file not received.** Only BLUEPRINT.md, ITEMS_PREVIEW.md and the zip were attached, so `lane-master-prompt.md` is **not** in the project root. This plan uses the master prompt from the start of our conversation (sections 0–8). Upload the file and I'll copy it in and re-check this plan against it.
- **D1 — Mock results, but a backend exists.** You asked for mock results "until a backend exists"; `functional-backend` already has one. Plan:
  - **Saved for real:** responses, timing, flags and scores.
  - **Mock, as you instructed:** results pages. Showing real z-scores honestly needs the norms in D2, which don't exist yet.
- **D2 — Norms and reliabilities missing.** BLUEPRINT §7's intervals and difference test need, for each scale, a population **mean, SD and reliability r**. The package only gives a range (".63–.88") and says "use published norms", but contains no figures.
  - The scoring functions take a `psychometrics` table as input.
  - It ships with **clearly marked placeholder values** (r = .70 for 4-item facets, .80 for domains, mean/SD from the mock), used by the mock only.
  - Real values must be transcribed from the sources (Johnson 2014 for IPIP-NEO-120; the O*NET IP technical reports) before any real user sees scores. I won't invent them.
- **D3 — 4 modules → 5 sessions.** The hub uses S1–S5 from `battery_manifest.json` (your rule). The master prompt's module list is replaced. Session order is recommended, not enforced, except that S3 and S4 together unlock ability results.
- **D4 — "Aptitudes (ScoreBars)" vs "no IQ".** The master prompt's aptitude ScoreBars become a reasoning profile (reasoning / spatial / quantitative / memory / speed) of **relative strengths only**, plus one percentile **band** with a 90% interval for general ability. Choice RT never appears as a headline score (file 14).
- **D5 — Verbal reasoning not built** (file 14, phase 2). It is excluded from sessions, the reasoning profile and copy. The old mock "Verbal reasoning" aptitude is removed.
- **D6 — Neutral feedback.** The master prompt says "immediate neutral feedback". The package says no right/wrong on scored items, with feedback on practice items and in the learning task. Both are followed: scored items show "Recorded"; practice and learning trials show correct/incorrect.
- **D7 — Experimental scales vs BLUEPRINT §8 lane priors.** The priors use experimental constructs (persuasion, setback resilience, visibility comfort and others), but your rule hides experimental scales. Plan: the Lane Map (mock this phase) names only validated constructs as drivers. Experimental scales feed the model only after the pilot. Flagged for the future real Lane Map.
- **D8 — Rapid-guess rule needs norm medians.** "<25% of the item's median time from the norm sample" has no norm sample yet. Interim rule: a provisional median of 50% of the item's time limit (so the floor is 12.5% of the limit), labelled provisional in `scoring/validity.ts`.
- **D9 — Skipping.** The scoring rules expect missing answers (facet ≥3 of 4, scale ≥5 of 6), but the master prompt's QuestionCard has no skip. Plan: a quiet "Skip" control on Likert items (not a numbered option). Skips are recorded as `skipped`, and the page-time and longstring checks ignore them.
- **D10 — Seed formula.** The README says `hash(userId + taskId + attemptNumber)` but gives no hash function and no per-item rule. Plan: FNV-1a 32-bit on the joined string, then `seed + itemIndex × 2654435761 >>> 0` per item, mapped to the task's ladder level.
- **D11 — Server-held state for adaptive tasks.** Span length, delay-discount questions and balloon bursts are decided by the server, one POST per step. Expected latency is ~50 ms locally; the UI shows no spinner for responses under 150 ms.
- **D12 — Learning task feedback.** Sending the symbol→key mapping would let someone read it in devtools. Feedback must be immediate, so marking must be immediate too. Plan: send the block's 24 symbols, and have the server return correctness per trial (one POST per trial, which is also where RT is recorded). If measured latency is over 100 ms, fall back to sending the mapping for that block only. That is acceptable because this task has no "right answer" to protect beyond the learning curve itself.
- **D13 — Informant flow needs public, account-less routes and email.** BLUEPRINT treats informant ratings as core; the master prompt has no screens for them. See Q3.
- **D14 — Creativity scoring engine.** Semantic distance and LLM scoring need an embedding/LLM service. Plan: store the raw ideas now, compute fluency only, and leave originality and flexibility `pending`. The responses are experimental and hidden anyway, except AUT, which stays unscored until the engine exists.
- **D15 — Biodata free-text coding by LLM.** Deferred. Raw text is stored and the item is shown as answered.
- **D16 — Copy changes.**
  - "Lane's own questions, not validated" (v0.2) is replaced by accurate statements: validated public instruments for the core; experimental Lane extensions collected but not scored for you.
  - The method page gains the BLUEPRINT references.
  - The landing hero metadata changes to "5 sessions · ~135 min".
- **D17 — Session length.** 135 minutes is long. The hub states each session's minutes and what it unlocks, and the master prompt's "~35 min" copy is replaced.
- **D18 — Sprints and evidence stay mock.** Per your rule, `/sprints` and `/evidence` read `/lib/mock`, even though v0.2 had them wired to the database.
  - I'll keep the v0.2 wiring behind `lib/data` so it can be switched back.
  - The sprint "improvement vs your learning rate" comparison (BLUEPRINT §5) becomes possible once S4 data exists, and is noted for later.
- **D19 — Device class and timed tasks.** Norms are per device class (file 14), so results label the device the session used. Phones are allowed for all tasks, but a notice recommends a keyboard for S3/S4.

## 8. Open questions (I'll use the recommended default unless you say otherwise)

1. **Q1 — Base branch.** *Recommended:* build on `functional-backend` (real progress saving in Postgres). *Alternative:* build on `main`, where progress would be stored only in the browser until a backend exists.
2. **Q2 — Results while mock.** Is it fine that a signed-in user who completes sessions still sees the **sample** profile (clearly labelled "Sample: your results appear once norms are in place")? *Recommended:* yes, per your rule.
3. **Q3 — Informant ratings in this phase?** *Recommended:* build the invite UI plus the public `/rate/[token]` form now, with copy-the-link sharing (no email sending yet).
4. **Q4 — Norm and reliability sourcing (D2).** Will you supply the published tables? Otherwise I'll transcribe them from the cited papers and mark each number with its source for you to check.
